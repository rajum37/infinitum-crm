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

    const entitlements = await prisma.subscriptionEntitlementOverride.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subscription: {
          include: { company: true }
        },
        feature: true,
      },
    });

    return NextResponse.json(entitlements);
  } catch (error: any) {
    console.error("Failed to fetch admin entitlements:", error);
    return NextResponse.json({ error: "Failed to fetch entitlements" }, { status: 500 });
  }
}
