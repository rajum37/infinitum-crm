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

    const usage = await prisma.usageCounter.findMany({
      orderBy: { currentPeriodEnd: "desc" },
      include: {
        company: true,
        feature: true,
      },
    });

    const { getEffectiveEntitlements } = await import("@/lib/subscription");
    const enrichedUsage = await Promise.all(
      usage.map(async (u) => {
        const entitlements = await getEffectiveEntitlements(u.companyId);
        const effectiveLimit = u.feature ? entitlements.get(u.feature.code)?.limitValue : null;
        
        return {
          ...u,
          featureCode: u.feature ? u.feature.code : "Unknown",
          totalUsage: Number(u.usageValue),
          limitValue: effectiveLimit !== undefined && effectiveLimit !== null ? Number(effectiveLimit) : null,
        };
      })
    );

    return NextResponse.json(enrichedUsage);
  } catch (error: any) {
    console.error("Failed to fetch admin usage:", error);
    return NextResponse.json({ error: "Failed to fetch usage" }, { status: 500 });
  }
}
