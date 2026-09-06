import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractTokenFromRequest, getTokenPayload, requireRole, requireAuthenticatedUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;

    // Only organization ADMIN can view this detailed subscription page
    const roleError = requireRole(payload.role, ["ADMIN"]);
    if (roleError) return roleError;

    const companyId = payload.companyId;
    if (!companyId) return NextResponse.json({ error: "Company ID required" }, { status: 400 });

    const subscription = await prisma.subscription.findUnique({
      where: { companyId },
      include: {
        plan: true,
        planPrice: true,
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: "No active subscription found for this organization." }, { status: 404 });
    }

    const safeSubscription = {
      ...subscription,
      amount: subscription.amount ? Number(subscription.amount) : null,
      version: typeof subscription.version === 'bigint' ? subscription.version.toString() : subscription.version,
      planPrice: subscription.planPrice ? {
        ...subscription.planPrice,
        amount: Number(subscription.planPrice.amount),
        originalAmount: subscription.planPrice.originalAmount ? Number(subscription.planPrice.originalAmount) : null,
      } : null,
    };

    return NextResponse.json(safeSubscription);
  } catch (error) {
    console.error("GET /api/organization/subscription error:", error);
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 });
  }
}
