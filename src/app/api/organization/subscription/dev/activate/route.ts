import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractTokenFromRequest, getTokenPayload, requireRole, requireAuthenticatedUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

function isDevBillingBypassEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEV_BILLING_BYPASS === "true";
}

export async function POST(request: Request) {
  try {
    // 1. STRICT PRODUCTION SAFEGUARD
    if (!isDevBillingBypassEnabled()) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

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

    const subscription = await prisma.subscription.findUnique({ where: { companyId } });
    
    // Simulate successful checkout / activation
    const result = await prisma.$transaction(async (tx: any) => {
      let updatedSub;
      let previousPlanId = null;
      let previousStatus = null;
      
      let previousPlanPriceId = null;
      let previousBillingInterval = null;

      if (subscription) {
        previousPlanId = subscription.planId;
        previousPlanPriceId = subscription.planPriceId;
        previousBillingInterval = subscription.billingInterval;
        previousStatus = subscription.status;
        updatedSub = await tx.subscription.update({
          where: { companyId },
          data: {
            planId: targetPlan.id,
            planPriceId: targetPrice.id,
            billingInterval: targetPrice.billingInterval,
            amount: targetPrice.amount,
            currency: targetPrice.currency,
            status: "ACTIVE",
            cancelAtPeriodEnd: false, // Ensure it's fully active if simulating checkout
            updatedAt: new Date(),
          }
        });
      } else {
        // Create if it somehow doesn't exist (e.g. legacy org)
        updatedSub = await tx.subscription.create({
          data: {
            companyId,
            planId: targetPlan.id,
            planPriceId: targetPrice.id,
            billingInterval: targetPrice.billingInterval,
            status: "ACTIVE",
            currency: targetPrice.currency,
            amount: targetPrice.amount,
            quantity: 1
          }
        });
      }

      const event = await tx.subscriptionEvent.create({
        data: {
          subscriptionId: updatedSub.id,
          companyId,
          eventType: "ACTIVATED", // Simulating the successful payment hook
          previousPlanId,
          newPlanId: targetPlan.id,
          previousPlanPriceId,
          newPlanPriceId: targetPrice.id,
          previousBillingInterval,
          newBillingInterval: targetPrice.billingInterval,
          previousStatus,
          newStatus: "ACTIVE",
          effectiveAt: new Date(),
          actorType: "ADMIN",
          actorId: payload.userId,
          source: "SYSTEM", // Using SYSTEM to reflect that this is a simulated bypass hook
          reason: "DEV BILLING BYPASS: Simulated successful activation"
        }
      });

      return { updatedSub, event };
    });

    await logAuditEvent({
      action: "DEV_BILLING_BYPASS_ACTIVATED",
      category: "Billing & Subscription",
      severity: "WARNING", // Using WARNING since it's a dev bypass action
      actorName: payload.name || payload.email,
      actorEmail: payload.email,
      actorRole: payload.role,
      targetName: targetPlan.name,
      summary: `Simulated successful checkout for plan ${targetPlan.code}`,
    });

    return NextResponse.json({
      message: "Development billing activated",
      subscription: result.updatedSub
    }, { status: 200 });

  } catch (error: any) {
    console.error("POST /api/organization/subscription/dev/activate error:", error);
    return NextResponse.json({ error: error?.message || "Failed to activate development billing" }, { status: 500 });
  }
}
