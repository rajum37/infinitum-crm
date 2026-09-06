import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractTokenFromRequest, getTokenPayload, requireRole, requireAuthenticatedUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function PATCH(request: Request, { params }: { params: { id: string, featureId: string } }) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;
    
    const roleError = requireRole(payload.role, ["SUPER_ADMIN"]);
    if (roleError) return roleError;

    const existingPf = await prisma.planFeature.findUnique({
      where: { planId_featureId: { planId: params.id, featureId: params.featureId } },
      include: { feature: true, plan: true }
    });

    if (!existingPf) return NextResponse.json({ error: "PlanFeature not found" }, { status: 404 });

    const body = await request.json();
    const { enabled, limitValue, limitType, configuration } = body;

    const updatedPf = await prisma.planFeature.update({
      where: { planId_featureId: { planId: params.id, featureId: params.featureId } },
      data: {
        enabled: enabled !== undefined ? enabled : existingPf.enabled,
        limitValue: limitValue !== undefined ? limitValue : existingPf.limitValue,
        limitType: limitType !== undefined ? limitType : existingPf.limitType,
        configuration: configuration !== undefined ? configuration : existingPf.configuration,
      },
      include: { feature: true }
    });

    await logAuditEvent({
      action: "PLAN_FEATURE_UPDATED",
      category: "Platform Management",
      severity: "INFO",
      actorName: payload.name || payload.email,
      actorEmail: payload.email,
      actorRole: payload.role,
      targetName: existingPf.plan.name,
      summary: `Updated feature ${existingPf.feature.code} configuration on plan ${existingPf.plan.code}`,
    });

    return NextResponse.json({
      ...updatedPf,
      limitValue: updatedPf.limitValue ? Number(updatedPf.limitValue) : null
    });
  } catch (error: any) {
    console.error("PATCH /api/admin/plans/[id]/features/[featureId] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update plan feature" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string, featureId: string } }) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;
    
    const roleError = requireRole(payload.role, ["SUPER_ADMIN"]);
    if (roleError) return roleError;

    const existingPf = await prisma.planFeature.findUnique({
      where: { planId_featureId: { planId: params.id, featureId: params.featureId } },
      include: { feature: true, plan: true }
    });

    if (!existingPf) return NextResponse.json({ error: "PlanFeature not found" }, { status: 404 });

    // Safe to delete PlanFeature mapping directly as it doesn't break history of usage.
    // If a customer was using it, they simply lose the entitlement on the next check.
    await prisma.planFeature.delete({
      where: { planId_featureId: { planId: params.id, featureId: params.featureId } }
    });

    await logAuditEvent({
      action: "PLAN_FEATURE_REMOVED",
      category: "Platform Management",
      severity: "WARNING",
      actorName: payload.name || payload.email,
      actorEmail: payload.email,
      actorRole: payload.role,
      targetName: existingPf.plan.name,
      summary: `Removed feature ${existingPf.feature.code} from plan ${existingPf.plan.code}`,
    });

    return NextResponse.json({ message: "PlanFeature removed successfully" });
  } catch (error: any) {
    console.error("DELETE /api/admin/plans/[id]/features/[featureId] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete plan feature" }, { status: 500 });
  }
}
