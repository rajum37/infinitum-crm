import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractTokenFromRequest, getTokenPayload, requireRole, requireAuthenticatedUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;
    
    const roleError = requireRole(payload.role, ["SUPER_ADMIN"]);
    if (roleError) return roleError;

    const planFeatures = await prisma.planFeature.findMany({
      where: { planId: params.id },
      include: { feature: true },
    });

    // Need to serialize BigInt if present
    const serialized = planFeatures.map(pf => ({
      ...pf,
      limitValue: pf.limitValue ? Number(pf.limitValue) : null
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("GET /api/admin/plans/[id]/features error:", error);
    return NextResponse.json({ error: "Failed to fetch plan features" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;
    
    const roleError = requireRole(payload.role, ["SUPER_ADMIN"]);
    if (roleError) return roleError;

    const plan = await prisma.plan.findUnique({ where: { id: params.id } });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const body = await request.json();
    const { featureId, enabled, limitValue, limitType, configuration } = body;

    if (!featureId) {
      return NextResponse.json({ error: "Feature ID is required" }, { status: 400 });
    }

    const feature = await prisma.feature.findUnique({ where: { id: featureId } });
    if (!feature) return NextResponse.json({ error: "Feature not found" }, { status: 404 });

    const existingPf = await prisma.planFeature.findUnique({
      where: { planId_featureId: { planId: params.id, featureId } }
    });

    if (existingPf) {
      return NextResponse.json({ error: "Plan already has this feature configured" }, { status: 409 });
    }

    const newPf = await prisma.planFeature.create({
      data: {
        planId: params.id,
        featureId,
        enabled: enabled !== undefined ? enabled : true,
        limitValue: limitValue !== undefined ? limitValue : null,
        limitType: limitType || null,
        configuration: configuration || null,
      },
      include: { feature: true }
    });

    await logAuditEvent({
      action: "PLAN_FEATURE_CONFIGURED",
      category: "Platform Management",
      severity: "INFO",
      actorName: payload.name || payload.email,
      actorEmail: payload.email,
      actorRole: payload.role,
      targetName: plan.name,
      summary: `Added feature ${feature.code} to plan ${plan.code}`,
    });

    return NextResponse.json({
      ...newPf,
      limitValue: newPf.limitValue ? Number(newPf.limitValue) : null
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/plans/[id]/features error:", error);
    return NextResponse.json({ error: error?.message || "Failed to add feature to plan" }, { status: 500 });
  }
}
