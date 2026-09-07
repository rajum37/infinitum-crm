import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractTokenFromRequest, getTokenPayload, requireRole, requireAuthenticatedUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = await params;
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;
    
    const roleError = requireRole(payload.role, ["SUPER_ADMIN"]);
    if (roleError) return roleError;

    const plan = await prisma.plan.findUnique({
      where: { id },
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

    // Handle BigInt serialization
    const serializedPlan = {
      ...plan,
      features: plan.features.map(f => ({
        ...f,
        limitValue: f.limitValue != null ? f.limitValue.toString() : null
      }))
    };

    return NextResponse.json(serializedPlan);
  } catch (error) {
    console.error("GET /api/admin/plans/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch plan" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { id } = await params;
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;
    
    const roleError = requireRole(payload.role, ["SUPER_ADMIN"]);
    if (roleError) return roleError;

    const existingPlan = await prisma.plan.findUnique({ where: { id } });
    if (!existingPlan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const body = await request.json();
    const { name, description, status, isPublic, isDefault, features, prices } = body;

    let plan;
    await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.plan.updateMany({ data: { isDefault: false } });
      }

      plan = await tx.plan.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : existingPlan.name,
          description: description !== undefined ? description : existingPlan.description,
          status: status !== undefined ? status : existingPlan.status,
          isPublic: isPublic !== undefined ? isPublic : existingPlan.isPublic,
          isDefault: isDefault !== undefined ? isDefault : existingPlan.isDefault,
        },
      });

      if (features && Array.isArray(features)) {
        await tx.planFeature.deleteMany({ where: { planId: id } });
        if (features.length > 0) {
          await tx.planFeature.createMany({
            data: features.map((f: any) => ({
              planId: id,
              featureId: f.featureId,
              enabled: f.enabled,
              limitType: f.limitType ?? undefined,
              limitValue: f.limitValue ?? undefined,
              configuration: f.configuration ?? undefined,
            })),
          });
        }
      }

      if (prices && Array.isArray(prices)) {
        for (const p of prices) {
          const existingActivePrice = await tx.planPrice.findFirst({
            where: { planId: id, billingInterval: p.billingInterval, isActive: true },
            orderBy: { version: 'desc' }
          });
          
          if (existingActivePrice) {
            const currentAmount = existingActivePrice.amount.toNumber();
            const currentOriginal = existingActivePrice.originalAmount ? existingActivePrice.originalAmount.toNumber() : undefined;
            const changed = currentAmount !== Number(p.amount) ||
                            existingActivePrice.currency !== p.currency ||
                            existingActivePrice.trailingDays !== Number(p.trailingDays) ||
                            currentOriginal !== (p.originalAmount ? Number(p.originalAmount) : undefined);
                            
            if (changed) {
               const subsCount = await tx.subscription.count({ where: { planPriceId: existingActivePrice.id } });
               if (subsCount > 0) {
                 // Versioning
                 await tx.planPrice.update({ where: { id: existingActivePrice.id }, data: { isActive: false } });
                 await tx.planPrice.create({
                   data: {
                     planId: id,
                     code: `${existingPlan.code}_${p.billingInterval}_v${existingActivePrice.version + 1}`,
                     version: existingActivePrice.version + 1,
                     billingInterval: p.billingInterval,
                     currency: p.currency,
                     amount: p.amount,
                     originalAmount: p.originalAmount ?? undefined,
                     trailingDays: p.trailingDays || 0,
                     isActive: p.isActive,
                   }
                 });
               } else {
                 // In-place update
                 await tx.planPrice.update({
                   where: { id: existingActivePrice.id },
                   data: {
                     currency: p.currency,
                     amount: p.amount,
                     originalAmount: p.originalAmount ?? undefined,
                     trailingDays: p.trailingDays || 0,
                     isActive: p.isActive,
                   }
                 });
               }
            } else if (existingActivePrice.isActive !== p.isActive) {
               await tx.planPrice.update({ where: { id: existingActivePrice.id }, data: { isActive: p.isActive } });
            }
          } else {
            // Create new price for this interval
            await tx.planPrice.create({
              data: {
                planId: id,
                code: `${existingPlan.code}_${p.billingInterval}_v1`,
                version: 1,
                billingInterval: p.billingInterval,
                currency: p.currency,
                amount: p.amount,
                originalAmount: p.originalAmount ?? undefined,
                trailingDays: p.trailingDays || 0,
                isActive: p.isActive,
              }
            });
          }
        }
      }
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

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    console.error("PATCH /api/admin/plans/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update plan" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { id } = await params;
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: authUser } = auth;
    
    const roleError = requireRole(payload.role, ["SUPER_ADMIN"]);
    if (roleError) return roleError;

    // Hard delete the plan after ensuring no active subscriptions
    const existingPlan = await prisma.plan.findUnique({
      where: { id },
      include: { subscriptions: true, billingPrices: true, features: true },
    });
    if (!existingPlan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    if (existingPlan.subscriptions && existingPlan.subscriptions.length > 0) {
      return NextResponse.json({ error: "Cannot delete plan with existing subscriptions" }, { status: 409 });
    }

    // Perform cascade delete in a transaction
    await prisma.$transaction([
      prisma.billingPrice.deleteMany({ where: { planId: id } }),
      prisma.planFeature.deleteMany({ where: { planId: id } }),
      prisma.plan.delete({ where: { id } }),
    ]);

    await logAuditEvent({
      action: "PLAN_DELETED",
      category: "Platform Management",
      severity: "WARNING",
      actorName: payload.name || payload.email,
      actorEmail: payload.email,
      actorRole: payload.role,
      targetName: existingPlan.name,
      summary: `Hard deleted platform plan: ${existingPlan.code}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/admin/plans/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete plan" }, { status: 500 });
  }
}
