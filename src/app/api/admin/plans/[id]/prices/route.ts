import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireAuthenticatedUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { BillingInterval } from "@prisma/client";

// GET /api/admin/plans/[id]/prices - list all prices for a plan
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload } = auth;
    const roleError = requireRole(payload.role, ["SUPER_ADMIN"]);
    if (roleError) return roleError;

    const plan = await prisma.plan.findUnique({ where: { id: params.id } });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const prices = await prisma.planPrice.findMany({
      where: { planId: params.id },
      include: {
        _count: { select: { subscriptions: true } }
      },
      orderBy: [{ billingInterval: "asc" }, { version: "desc" }],
    });

    return NextResponse.json(prices);
  } catch (error) {
    console.error("GET /api/admin/plans/[id]/prices error:", error);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}

// POST /api/admin/plans/[id]/prices - create a new price version
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload } = auth;
    const roleError = requireRole(payload.role, ["SUPER_ADMIN"]);
    if (roleError) return roleError;

    const plan = await prisma.plan.findUnique({ where: { id: params.id } });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const body = await request.json();
    const { billingInterval, intervalCount = 1, currency, amount, originalAmount, discountAmount, discountPercent, isDefault = false } = body;

    // Validate required fields
    if (!billingInterval || !currency || amount === undefined) {
      return NextResponse.json({ error: "billingInterval, currency, and amount are required" }, { status: 400 });
    }
    if (!Object.values(BillingInterval).includes(billingInterval)) {
      return NextResponse.json({ error: "Invalid billingInterval" }, { status: 400 });
    }
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }

    // Validate originalAmount: must be strictly greater than amount
    let normalizedOriginalAmount: number | null = null;
    if (originalAmount !== undefined && originalAmount !== null && originalAmount !== "") {
      const origNum = Number(originalAmount);
      if (isNaN(origNum) || origNum <= 0) {
        return NextResponse.json({ error: "originalAmount must be a positive number" }, { status: 400 });
      }
      if (origNum <= amountNum) {
        return NextResponse.json({
          error: `originalAmount (${origNum}) must be greater than amount (${amountNum}). If there is no discount, leave originalAmount empty.`
        }, { status: 400 });
      }
      normalizedOriginalAmount = origNum;
    }

    // Derive discountAmount from amounts (authoritative source)
    const derivedDiscountAmount = normalizedOriginalAmount !== null
      ? Math.round((normalizedOriginalAmount - amountNum) * 100) / 100
      : null;

    // Derive discountPercent: if explicitly provided, validate; otherwise calculate
    let normalizedDiscountPercent: number | null = null;
    if (normalizedOriginalAmount !== null) {
      if (discountPercent !== undefined && discountPercent !== null && discountPercent !== "") {
        const pct = Number(discountPercent);
        if (isNaN(pct) || pct < 0 || pct > 100) {
          return NextResponse.json({ error: "discountPercent must be between 0 and 100" }, { status: 400 });
        }
        normalizedDiscountPercent = pct;
      } else {
        // Calculate from amounts
        normalizedDiscountPercent = Math.round(((normalizedOriginalAmount - amountNum) / normalizedOriginalAmount) * 10000) / 100;
      }
    }

    // Build base code for this interval (e.g. BASIC-YEARLY)
    const baseCode = `${plan.code.toUpperCase()}-${billingInterval.replace("_", "-")}`;

    // Find latest version for this plan+interval combination
    const latest = await prisma.planPrice.findFirst({
      where: { planId: params.id, billingInterval: billingInterval as BillingInterval },
      orderBy: { version: "desc" },
    });
    const nextVersion = latest ? latest.version + 1 : 1;
    const code = `${baseCode}-V${nextVersion}`;

    // If making a new version, mark all prior same-interval prices as NOT current (isDefault=false)
    if (isDefault && latest) {
      await prisma.planPrice.updateMany({
        where: { planId: params.id, billingInterval: billingInterval as BillingInterval, isDefault: true },
        data: { isDefault: false },
      });
    }

    const price = await prisma.planPrice.create({
      data: {
        planId: params.id,
        code,
        version: nextVersion,
        billingInterval: billingInterval as BillingInterval,
        intervalCount: Number(intervalCount) || 1,
        currency: (currency as string).toUpperCase(),
        amount: amountNum,
        originalAmount: normalizedOriginalAmount,
        discountAmount: derivedDiscountAmount,
        discountPercent: normalizedDiscountPercent,
        isActive: true,
        isDefault: isDefault,
      },
      include: {
        _count: { select: { subscriptions: true } }
      }
    });

    await logAuditEvent({
      action: "PLAN_PRICE_CREATED",
      category: "Platform Management",
      severity: "INFO",
      actorName: payload.name || payload.email,
      actorEmail: payload.email,
      actorRole: payload.role,
      targetName: code,
      summary: `Created price ${code} for plan ${plan.code}: ${currency} ${amount} / ${billingInterval}`,
    });

    return NextResponse.json(price, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/plans/[id]/prices error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create price" }, { status: 500 });
  }
}
