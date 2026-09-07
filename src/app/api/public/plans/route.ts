import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export async function GET() {
  try {
    const rawPlans = await prisma.plan.findMany({
      where: {
        status: "ACTIVE",
        isPublic: true,
      },
      include: {
        prices: {
          where: { isActive: true },
          orderBy: { amount: "asc" },
        },
        features: {
          include: { feature: true },
        },
      },
    });

    // Prisma Decimal fields (amount) need conversion for JSON serialization
    const plans = rawPlans.map((plan) => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      status: plan.status,
      isPublic: plan.isPublic,
      isDefault: plan.isDefault,
      // include only needed fields; avoid exposing internal columns
      prices: plan.prices.map((price) => ({
        id: price.id,
        amount: price.amount.toNumber(), // Decimal -> number
        currency: price.currency,
        billingInterval: price.billingInterval,
        billingIntervalCount: price.billingIntervalCount,
        isActive: price.isActive,
        // any other fields you deem safe
      })),
      // optional: expose feature ids/names
      features: plan.features.map((pf) => ({
        id: pf.id,
        enabled: pf.enabled,
        limitType: pf.limitType,
        limitValue: pf.limitValue?.toString(),
        feature: {
          id: pf.feature.id,
          code: pf.feature.code,
          name: pf.feature.name,
        },
      })),
    }));

    return NextResponse.json({ success: true, plans });
  } catch (error) {
    console.error("GET /api/public/plans error:", error);
    return NextResponse.json(
      { error: "Failed to fetch public plans" },
      { status: 500 }
    );
  }
}
