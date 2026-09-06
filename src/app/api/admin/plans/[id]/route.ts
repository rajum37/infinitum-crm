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

    const plan = await prisma.plan.findUnique({
      where: { id: params.id },
      include: {
        prices: {
          orderBy: [{ billingInterval: 'asc' }, { version: 'desc' }]
        },
        features: {
          include: {
            feature: true
          }
        }
      }
    });

    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("GET /api/admin/plans/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch plan" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;
    
    const roleError = requireRole(payload.role, ["SUPER_ADMIN"]);
    if (roleError) return roleError;

    const existingPlan = await prisma.plan.findUnique({ where: { id: params.id } });
    if (!existingPlan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const body = await request.json();
    const { name, description, status, planType, basePrice, billingInterval, currency, isCustom, isVisible, maxUsers, storageLimitMB } = body;

    // Notice we do NOT allow editing `code`

    const plan = await prisma.plan.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : existingPlan.name,
        description: description !== undefined ? description : existingPlan.description,
        status: status !== undefined ? status : existingPlan.status,
        planType: planType !== undefined ? planType : existingPlan.planType,
        currency: currency !== undefined ? currency : existingPlan.currency,
        isCustom: isCustom !== undefined ? isCustom : existingPlan.isCustom,
        isVisible: isVisible !== undefined ? isVisible : existingPlan.isVisible,
        maxUsers: maxUsers !== undefined ? maxUsers : existingPlan.maxUsers,
        storageLimitMB: storageLimitMB !== undefined ? storageLimitMB : existingPlan.storageLimitMB,
      },
    });

    await logAuditEvent({
      action: "PLAN_UPDATED",
      category: "Platform Management",
      severity: "INFO",
      actorName: payload.name || payload.email,
      actorEmail: payload.email,
      actorRole: payload.role,
      targetName: plan.name,
      summary: `Updated platform plan: ${plan.code}`,
    });

    return NextResponse.json(plan);
  } catch (error: any) {
    console.error("PATCH /api/admin/plans/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update plan" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;
    
    const roleError = requireRole(payload.role, ["SUPER_ADMIN"]);
    if (roleError) return roleError;

    const existingPlan = await prisma.plan.findUnique({ 
      where: { id: params.id },
      include: { subscriptions: true }
    });
    if (!existingPlan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    // Safe deletion: Archive the plan instead of hard deleting it.
    const plan = await prisma.plan.update({
      where: { id: params.id },
      data: {
        status: "INACTIVE",
        isVisible: false
      }
    });

    await logAuditEvent({
      action: "PLAN_DISABLED",
      category: "Platform Management",
      severity: "WARNING",
      actorName: payload.name || payload.email,
      actorEmail: payload.email,
      actorRole: payload.role,
      targetName: plan.name,
      summary: `Disabled platform plan: ${plan.code}`,
    });

    return NextResponse.json(plan);
  } catch (error: any) {
    console.error("DELETE /api/admin/plans/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete plan" }, { status: 500 });
  }
}
