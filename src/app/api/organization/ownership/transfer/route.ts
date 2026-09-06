import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractTokenFromRequest, getTokenPayload, requireRole, requireAuthenticatedUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;

    const roleError = requireRole(payload.role, ["SUPER_ADMIN", "ADMIN"]);
    if (roleError) return roleError;

    const body = await request.json();
    const { targetUserId, companyId: superAdminCompanyId } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
    }

    const companyId = payload.role === "SUPER_ADMIN" ? superAdminCompanyId : payload.companyId;

    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    // Check if requester is owner (if not SUPER_ADMIN)
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (payload.role === "ADMIN" && company.ownerUserId !== payload.userId) {
      return NextResponse.json({ error: "Only the current owner can transfer ownership" }, { status: 403 });
    }

    // Validate target user
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    if (targetUser.companyId !== companyId) {
      return NextResponse.json({ error: "Target user does not belong to this organization" }, { status: 400 });
    }

    if (targetUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Target user must have the ADMIN role" }, { status: 400 });
    }

    if (!targetUser.isActive || targetUser.status !== "ACTIVE" || targetUser.isDeleted) {
      return NextResponse.json({ error: "Target user is inactive or deleted" }, { status: 400 });
    }

    // Execute transfer
    const updatedCompany = await prisma.$transaction(async (tx) => {
      const comp = await tx.company.update({
        where: { id: companyId },
        data: { ownerUserId: targetUserId },
      });

      await tx.auditLog.create({
        data: {
          user_id: payload.userId,
          action: "OWNERSHIP_TRANSFERRED",
          entity: "Company",
          entity_id: companyId,
          metadata: { previousOwner: company.ownerUserId, newOwner: targetUserId },
          createdAt: new Date(),
        }
      });

      return comp;
    });

    return NextResponse.json({
      message: "Ownership transferred successfully",
      company: {
        id: updatedCompany.id,
        ownerUserId: updatedCompany.ownerUserId,
      }
    });
  } catch (error) {
    console.error("POST /api/organization/ownership/transfer error:", error);
    return NextResponse.json({ error: "Failed to transfer ownership" }, { status: 500 });
  }
}
