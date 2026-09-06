import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireAuthenticatedUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

// PATCH /api/admin/plans/[id]/prices/[priceId]
// Only allows toggling isActive / isDefault.
// Changing financial fields (amount, currency, billingInterval) is FORBIDDEN — create a new version instead.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; priceId: string } }
) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload } = auth;
    const roleError = requireRole(payload.role, ["SUPER_ADMIN"]);
    if (roleError) return roleError;

    const existing = await prisma.planPrice.findUnique({
      where: { id: params.priceId },
      include: { _count: { select: { subscriptions: true } } },
    });
    if (!existing || existing.planId !== params.id) {
      return NextResponse.json({ error: "Price not found" }, { status: 404 });
    }

    const body = await request.json();

    // IMMUTABILITY GUARD: Reject any attempt to change financial fields
    const forbiddenFields = ["amount", "currency", "billingInterval", "intervalCount", "originalAmount", "discountAmount", "discountPercent"];
    for (const field of forbiddenFields) {
      if (field in body) {
        return NextResponse.json(
          {
            error: `Cannot modify immutable field '${field}' on an existing price. Create a new price version instead.`,
            hint: "POST /api/admin/plans/:id/prices"
          },
          { status: 422 }
        );
      }
    }

    const { isActive, isDefault } = body;

    // If activating as current default, deactivate all other same-interval defaults
    if (isDefault === true) {
      await prisma.planPrice.updateMany({
        where: {
          planId: params.id,
          billingInterval: existing.billingInterval,
          isDefault: true,
          id: { not: params.priceId }
        },
        data: { isDefault: false }
      });
    }

    const updated = await prisma.planPrice.update({
      where: { id: params.priceId },
      data: {
        ...(isActive !== undefined ? { isActive } : {}),
        ...(isDefault !== undefined ? { isDefault } : {}),
      },
      include: { _count: { select: { subscriptions: true } } },
    });

    await logAuditEvent({
      action: "PLAN_PRICE_UPDATED",
      category: "Platform Management",
      severity: "INFO",
      actorName: payload.name || payload.email,
      actorEmail: payload.email,
      actorRole: payload.role,
      targetName: existing.code,
      summary: `Updated price ${existing.code}: isActive=${updated.isActive}, isDefault=${updated.isDefault}`,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PATCH /api/admin/plans/[id]/prices/[priceId] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update price" }, { status: 500 });
  }
}
