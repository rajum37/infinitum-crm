import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractTokenFromRequest, getTokenPayload, requireRole, requireAuthenticatedUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;
    
    const roleError = requireRole(payload.role, ["SUPER_ADMIN"]);
    if (roleError) return roleError;

    const organizations = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { users: { where: { isDeleted: false, isActive: true, status: "ACTIVE" } } },
        },
        subscription: {
          include: { 
            plan: true,
            planPrice: true
          },
        },
      },
    });

    // Safely map data to avoid BigInt serialization errors and only send needed fields
    const safeData = organizations.map(org => {
      let safeSubscription = null;
      if (org.subscription) {
        safeSubscription = {
          id: org.subscription.id,
          status: org.subscription.status,
          billingInterval: org.subscription.billingInterval,
          currency: org.subscription.currency,
          amount: org.subscription.amount ? Number(org.subscription.amount) : null,
          currentPeriodStart: org.subscription.currentPeriodStart,
          currentPeriodEnd: org.subscription.currentPeriodEnd,
          cancelAtPeriodEnd: org.subscription.cancelAtPeriodEnd,
          trialStartsAt: org.subscription.trial_starts_at,
          trialEndsAt: org.subscription.trialEndsAt,
          version: typeof org.subscription.version === 'bigint' ? org.subscription.version.toString() : org.subscription.version,
          plan: org.subscription.plan ? {
            id: org.subscription.plan.id,
            name: org.subscription.plan.name,
            code: org.subscription.plan.code,
          } : null,
          planPrice: org.subscription.planPrice ? {
            id: org.subscription.planPrice.id,
            code: org.subscription.planPrice.code,
            version: org.subscription.planPrice.version,
            billingInterval: org.subscription.planPrice.billingInterval,
            intervalCount: org.subscription.planPrice.intervalCount,
            amount: Number(org.subscription.planPrice.amount),
            currency: org.subscription.planPrice.currency,
            trailingDays: org.subscription.planPrice.trailingDays,
          } : null
        };
      }

      return {
        id: org.id,
        name: org.name,
        status: org.status,
        isActive: org.isActive,
        createdAt: org.createdAt,
        owner: org.owner,
        userCount: org._count.users,
        subscription: safeSubscription
      };
    });

    return NextResponse.json(safeData);
  } catch (error: any) {
    console.error("Failed to fetch admin organizations:", error);
    return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 });
  }
}
