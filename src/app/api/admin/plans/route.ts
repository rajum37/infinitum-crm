import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractTokenFromRequest, getTokenPayload, requireRole, requireAuthenticatedUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;
    
    const roleError = requireRole(payload.role, ["SUPER_ADMIN"]);
    if (roleError) return roleError;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    
    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    const plans = await prisma.plan.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error("GET /api/admin/plans error:", error);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;
    
    const roleError = requireRole(payload.role, ["SUPER_ADMIN"]);
    if (roleError) return roleError;

    const body = await request.json();
    const { code, name, description, planType, basePrice, billingInterval, currency, isCustom, isVisible, maxUsers, storageLimitMB } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "Code and name are required" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, "_");
    const existingPlan = await prisma.plan.findUnique({ where: { code: cleanCode } });
    if (existingPlan) {
      return NextResponse.json({ error: "Plan code already exists" }, { status: 409 });
    }

    const plan = await prisma.plan.create({
      data: {
        code: cleanCode,
        name,
        description,
        status: "ACTIVE",
        planType: planType || "TIERED",
        basePrice: basePrice || 0,
        billingInterval: billingInterval || "MONTHLY",
        currency: currency || "USD",
        isCustom: isCustom || false,
        isVisible: isVisible !== undefined ? isVisible : true,
        maxUsers,
        storageLimitMB,
      },
    });

    await logAuditEvent({
      action: "PLAN_CREATED",
      category: "Platform Management",
      severity: "SUCCESS",
      actorName: payload.name || payload.email,
      actorEmail: payload.email,
      actorRole: payload.role,
      targetName: plan.name,
      summary: `Created platform plan: ${plan.code}`,
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/plans error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create plan" }, { status: 500 });
  }
}
