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

    const billingCustomers = await prisma.billingCustomer.findMany({
      include: {
        company: true,
        subscriptions: {
          include: {
            plan: true,
          }
        },
      },
    });

    return NextResponse.json(billingCustomers);
  } catch (error: any) {
    console.error("Failed to fetch admin billing:", error);
    return NextResponse.json({ error: "Failed to fetch billing" }, { status: 500 });
  }
}
