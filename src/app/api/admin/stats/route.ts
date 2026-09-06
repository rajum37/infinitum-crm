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

    const [
      totalOrganizations,
      activeSubscriptions,
      totalPlans,
      totalFeatures
    ] = await Promise.all([
      prisma.company.count({ where: { isDeleted: false } }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.plan.count(),
      prisma.feature.count(),
    ]);

    return NextResponse.json({
      totalOrganizations,
      activeSubscriptions,
      totalPlans,
      totalFeatures,
    });
  } catch (error: any) {
    console.error("Failed to fetch admin stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
