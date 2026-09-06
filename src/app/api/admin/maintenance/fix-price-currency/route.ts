import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser, requireRole } from "@/lib/auth";

// One-time internal maintenance endpoint - SUPER_ADMIN only
export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload } = auth;
    const roleError = requireRole(payload.role, ["SUPER_ADMIN"]);
    if (roleError) return roleError;

    // Fix all plan_prices to use the currency of their parent plan
    const result = await prisma.$executeRaw`
      UPDATE plan_prices pp
      SET currency = p.currency
      FROM plans p
      WHERE pp.plan_id = p.id
        AND pp.currency != p.currency
    `;

    return NextResponse.json({ fixed: result, message: "Currency aligned to parent plan" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
