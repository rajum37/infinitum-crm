import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractTokenFromRequest, getTokenPayload, requireRole, requireAuthenticatedUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;

    const roleError = requireRole(payload.role, ["ADMIN"]);
    if (roleError) return roleError;

    const companyId = payload.companyId;
    if (!companyId) return NextResponse.json({ error: "Company ID required" }, { status: 400 });

    const subscription = await prisma.subscription.findUnique({ where: { companyId } });
    if (!subscription) {
      return NextResponse.json({ error: "No active subscription found to reactivate" }, { status: 404 });
    }

    if (!subscription.cancelAtPeriodEnd) {
      return NextResponse.json({ error: "Subscription is not scheduled for cancellation" }, { status: 409 });
    }

    // A fully cancelled or expired subscription cannot be simply reactivated this way.
    const nonReactivatableStates = ["CANCELED", "EXPIRED"];
    if (nonReactivatableStates.includes(subscription.status)) {
      return NextResponse.json(
        { error: `Cannot reactivate subscription because it is already ${subscription.status}` },
        { status: 409 }
      );
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const updatedSub = await tx.subscription.update({
        where: { companyId },
        data: {
          cancelAtPeriodEnd: false,
          updatedAt: new Date()
        }
      });

      const event = await tx.subscriptionEvent.create({
        data: {
          subscriptionId: updatedSub.id,
          companyId,
          eventType: "RENEWED", // Closest enum value meaning we are resuming the subscription
          previousStatus: subscription.status,
          newStatus: updatedSub.status,
          effectiveAt: new Date(),
          actorType: "ADMIN",
          actorId: payload.userId,
          source: "SYSTEM",
          reason: "Customer reactivated subscription before period end"
        }
      });

      return { updatedSub, event };
    });

    await logAuditEvent({
      action: "SUBSCRIPTION_REACTIVATED",
      category: "Billing & Subscription",
      severity: "SUCCESS",
      actorName: payload.name || payload.email,
      actorEmail: payload.email,
      actorRole: payload.role,
      targetName: "Subscription",
      summary: "Subscription cancellation revoked",
    });

    return NextResponse.json(result.updatedSub);
  } catch (error: any) {
    console.error("POST /api/organization/subscription/reactivate error:", error);
    return NextResponse.json({ error: error?.message || "Failed to reactivate subscription" }, { status: 500 });
  }
}
