import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractTokenFromRequest, getTokenPayload, requireRole, requireAuthenticatedUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;

    // Only organization ADMIN can view selectable plans to upgrade/downgrade to
    const roleError = requireRole(payload.role, ["ADMIN"]);
    if (roleError) return roleError;

    const plans = await prisma.plan.findMany({
      where: {
        status: "ACTIVE",
        isPublic: true
      },
      orderBy: { basePrice: "asc" },
      include: {
        prices: {
          where: { isActive: true },
          orderBy: { amount: "asc" }
        },
        features: {
          include: {
            feature: true
          }
        }
      }
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error("GET /api/organization/subscription/plans error:", error);
    return NextResponse.json({ error: "Failed to fetch available plans" }, { status: 500 });
  }
}
