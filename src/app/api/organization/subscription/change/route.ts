import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractTokenFromRequest, getTokenPayload, requireRole, requireAuthenticatedUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;

    const roleError = requireRole(payload.role, ["ADMIN"]);
    if (roleError) return roleError;

    const companyId = payload.companyId;
    if (!companyId) return NextResponse.json({ error: "Company ID required" }, { status: 400 });

    const body = await request.json();
    const { planId, planPriceId } = body;

    if (!planId) return NextResponse.json({ error: "Target planId is required" }, { status: 400 });
    if (!planPriceId) return NextResponse.json({ error: "Target planPriceId is required" }, { status: 400 });

    // 1. Validate Target Plan & Price
    const targetPlan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!targetPlan || targetPlan.status !== "ACTIVE" || !targetPlan.isPublic) {
      return NextResponse.json({ error: "Target plan is not valid or not selectable" }, { status: 400 });
    }

    const targetPrice = await prisma.planPrice.findUnique({ where: { id: planPriceId } });
    if (!targetPrice || !targetPrice.isActive) {
      return NextResponse.json({ error: "Selected price is invalid or inactive" }, { status: 400 });
    }
    if (targetPrice.planId !== planId) {
      return NextResponse.json({ error: "Selected price does not belong to the selected plan" }, { status: 400 });
    }

    // 2. Validate Current Subscription
    const subscription = await prisma.subscription.findUnique({ where: { companyId } });
    if (!subscription) {
      return NextResponse.json({ error: "No active subscription found to change" }, { status: 404 });
    }

    if (subscription.planId === planId && subscription.planPriceId === planPriceId) {
      return NextResponse.json({ error: "You are already subscribed to this exact plan and billing cycle" }, { status: 409 });
    }

    // 3. Prevent changing if subscription is in a terminal/unmodifiable state
    const validStates = ["ACTIVE", "TRIALING", "PAST_DUE"];
    if (!validStates.includes(subscription.status)) {
      return NextResponse.json(
        { error: `Cannot change plan while subscription is in ${subscription.status} state` },
        { status: 409 }
      );
    }

    // 4. Transactional Update
    const result = await prisma.$transaction(async (tx: any) => {
      const updatedSub = await tx.subscription.update({
        where: { companyId },
        data: {
          planId: targetPlan.id,
          planPriceId: targetPrice.id,
          billingInterval: targetPrice.billingInterval,
          amount: targetPrice.amount,
          currency: targetPrice.currency,
          updatedAt: new Date()
        },
        include: { plan: true, planPrice: true }
      });

      const event = await tx.subscriptionEvent.create({
        data: {
          subscriptionId: updatedSub.id,
          companyId,
          eventType: "PLAN_CHANGED",
          previousPlanId: subscription.planId,
          newPlanId: targetPlan.id,
          previousPlanPriceId: subscription.planPriceId,
          newPlanPriceId: targetPrice.id,
          previousBillingInterval: subscription.billingInterval,
          newBillingInterval: targetPrice.billingInterval,
          previousStatus: subscription.status,
          newStatus: updatedSub.status,
          effectiveAt: new Date(),
          actorType: "ADMIN",
          actorId: payload.userId,
          source: "SYSTEM",
          reason: "Customer changed plan/billing cycle via API"
        }
      });

      return { updatedSub, event };
    });

    await logAuditEvent({
      action: "SUBSCRIPTION_PLAN_CHANGED",
      category: "Billing & Subscription",
      severity: "INFO",
      actorName: payload.name || payload.email,
      actorEmail: payload.email,
      actorRole: payload.role,
      targetName: targetPlan.name,
      summary: `Changed subscription plan from ${subscription.planId} to ${targetPlan.code}`,
    });

    return NextResponse.json(result.updatedSub);
  } catch (error: any) {
    console.error("PATCH /api/organization/subscription/change error:", error);
    return NextResponse.json({ error: error?.message || "Failed to change plan" }, { status: 500 });
  }
}
