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
      return NextResponse.json({ error: "No active subscription found to cancel" }, { status: 404 });
    }

    if (subscription.cancelAtPeriodEnd) {
      return NextResponse.json({ error: "Subscription is already scheduled to cancel" }, { status: 409 });
    }

    // A fully cancelled or expired subscription shouldn't be cancelled again.
    const nonCancellableStates = ["CANCELED", "EXPIRED"];
    if (nonCancellableStates.includes(subscription.status)) {
      return NextResponse.json(
        { error: `Cannot cancel subscription because it is already ${subscription.status}` },
        { status: 409 }
      );
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const updatedSub = await tx.subscription.update({
        where: { companyId },
        data: {
          cancelAtPeriodEnd: true,
          updatedAt: new Date()
        }
      });

      const event = await tx.subscriptionEvent.create({
        data: {
          subscriptionId: updatedSub.id,
          companyId,
          eventType: "CANCELED", // Represents the intent to cancel at period end
          previousStatus: subscription.status,
          newStatus: updatedSub.status, // Remains ACTIVE/TRIALING, but marked for cancellation
          effectiveAt: new Date(),
          actorType: "ADMIN",
          actorId: payload.userId,
          source: "SYSTEM",
          reason: "Customer requested cancellation at period end"
        }
      });

      return { updatedSub, event };
    });

    await logAuditEvent({
      action: "SUBSCRIPTION_CANCELED",
      category: "Billing & Subscription",
      severity: "WARNING",
      actorName: payload.name || payload.email,
      actorEmail: payload.email,
      actorRole: payload.role,
      targetName: "Subscription",
      summary: "Subscription set to cancel at period end",
    });

    return NextResponse.json(result.updatedSub);
  } catch (error: any) {
    console.error("POST /api/organization/subscription/cancel error:", error);
    return NextResponse.json({ error: error?.message || "Failed to cancel subscription" }, { status: 500 });
  }
}
