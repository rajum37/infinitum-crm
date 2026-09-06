import { NextResponse } from "next/server";
import { extractTokenFromRequest, getTokenPayload, requireAuthenticatedUser } from "@/lib/auth";
import { getEffectiveEntitlements } from "@/lib/subscription";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;

    const companyId = payload.companyId;
    if (!companyId) return NextResponse.json({ error: "Company ID required" }, { status: 400 });

    const entitlements = await getEffectiveEntitlements(companyId);

    // Serialize BigInt if any
    const serialized = Object.fromEntries(
      Object.entries(entitlements).map(([code, config]) => [
        code,
        {
          ...config,
          limitValue: config.limitValue ? Number(config.limitValue) : null
        }
      ])
    );

    return NextResponse.json({ entitlements: serialized });
  } catch (error) {
    console.error("GET /api/organization/subscription/entitlements error:", error);
    return NextResponse.json({ error: "Failed to fetch entitlements" }, { status: 500 });
  }
}
