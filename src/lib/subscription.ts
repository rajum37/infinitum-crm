import { prisma } from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * Determines if a subscription is considered "active" enough to grant entitlements.
 */
export function isSubscriptionActive(status?: SubscriptionStatus): boolean {
  if (!status) return false;
  return ["ACTIVE", "TRIALING", "PAST_DUE"].includes(status);
}

/**
 * Get the active subscription for a company.
 */
export async function getCompanySubscription(companyId?: string) {
  if (!companyId) return null;
  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
    include: {
      plan: {
        include: {
          features: {
            include: {
              feature: true,
            },
          },
        },
      },
      entitlementOverrides: {
        include: {
          feature: true,
        },
      },
    },
  });

  return subscription;
}

export interface Entitlement {
  featureId: string;
  enabled: boolean;
  limitValue: bigint | null;
  limitType: string | null;
  configuration: any;
}

/**
 * Get the effective entitlements for a company.
 * Returns a map of featureCode -> Entitlement.
 * Combines plan features and subscription overrides.
 */
export async function getEffectiveEntitlements(companyId?: string) {
  const entitlements = new Map<string, Entitlement>();
  if (!companyId) return entitlements;

  const sub = await getCompanySubscription(companyId);
  if (!sub || !isSubscriptionActive(sub.status)) {
    return entitlements;
  }

  // 1. Load features from the base plan
  if (sub.plan && sub.plan.features) {
    for (const pf of sub.plan.features) {
      if (pf.feature) {
        entitlements.set(pf.feature.code, {
          featureId: pf.feature.id,
          enabled: pf.enabled,
          limitValue: pf.limitValue,
          limitType: pf.limitType,
          configuration: pf.configuration,
        });
      }
    }
  }

  // 2. Apply subscription-level entitlement overrides
  const now = new Date();
  if (sub.entitlementOverrides) {
    for (const override of sub.entitlementOverrides) {
      if (override.startsAt && override.startsAt > now) continue;
      if (override.endsAt && override.endsAt < now) continue;

      if (override.feature) {
        const existing = entitlements.get(override.feature.code);
        entitlements.set(override.feature.code, {
          featureId: override.feature.id,
          enabled: override.enabled !== null ? override.enabled : existing?.enabled ?? false,
          limitValue: override.limitValue !== null ? override.limitValue : existing?.limitValue ?? null,
          limitType: existing?.limitType ?? null,
          configuration: override.configuration !== null ? override.configuration : existing?.configuration,
        });
      }
    }
  }

  return entitlements;
}

/**
 * Check if a company has a specific feature enabled.
 */
export async function hasFeature(companyId: string | undefined, featureCode: string): Promise<boolean> {
  if (!companyId) return false;
  const entitlements = await getEffectiveEntitlements(companyId);
  const feature = entitlements.get(featureCode);
  return feature ? feature.enabled : false;
}

/**
 * Require a specific feature to be enabled.
 * Returns a NextResponse with a 403 error if denied, or null if allowed.
 * Use this as a guard in API routes.
 */
export async function requireFeature(companyId: string | undefined, featureCode: string): Promise<NextResponse | null> {
  if (!companyId) {
    return NextResponse.json({ error: "Company ID is required.", code: "COMPANY_REQUIRED" }, { status: 400 });
  }

  const sub = await getCompanySubscription(companyId);
  if (!sub || !isSubscriptionActive(sub.status)) {
    return NextResponse.json(
      { error: "An active subscription is required to use this feature.", code: "SUBSCRIPTION_REQUIRED" },
      { status: 403 }
    );
  }

  const entitlements = await getEffectiveEntitlements(companyId);
  const feature = entitlements.get(featureCode);

  if (!feature || !feature.enabled) {
    return NextResponse.json(
      { error: `The feature '${featureCode}' is not available on your current plan.`, code: "FEATURE_NOT_AVAILABLE" },
      { status: 403 }
    );
  }

  return null; // Allowed
}

/**
 * Check if a requested operation will exceed the usage limit for a feature.
 * Returns a NextResponse with a 403 error if limit exceeded, or null if allowed.
 */
export async function checkFeatureLimit(
  companyId: string | undefined,
  featureCode: string,
  requestedAmount: number = 1
): Promise<NextResponse | null> {
  if (!companyId) {
    return NextResponse.json({ error: "Company ID is required.", code: "COMPANY_REQUIRED" }, { status: 400 });
  }

  const sub = await getCompanySubscription(companyId);
  if (!sub || !isSubscriptionActive(sub.status)) {
    return NextResponse.json(
      { error: "An active subscription is required.", code: "SUBSCRIPTION_REQUIRED" },
      { status: 403 }
    );
  }

  const entitlements = await getEffectiveEntitlements(companyId);
  const feature = entitlements.get(featureCode);

  if (!feature || !feature.enabled) {
    return NextResponse.json(
      { error: `The feature '${featureCode}' is not available.`, code: "FEATURE_NOT_AVAILABLE" },
      { status: 403 }
    );
  }

  // If there's no limit defined, it's unlimited
  if (feature.limitValue === null) {
    return null;
  }

  // Determine current period
  const now = new Date();
  const periodStart = sub.currentPeriodStart || now;
  const periodEnd = sub.currentPeriodEnd || now;

  // Check current usage counter
  const counter = await prisma.usageCounter.findFirst({
    where: {
      companyId,
      featureId: feature.featureId,
      periodStart: { lte: now },
      periodEnd: { gte: now }
    }
  });

  const currentUsage = counter ? Number(counter.usageValue) : 0;

  if (currentUsage + requestedAmount > Number(feature.limitValue)) {
    return NextResponse.json(
      { error: `Usage limit exceeded for ${featureCode}. Please upgrade your plan.`, code: "USAGE_LIMIT_EXCEEDED" },
      { status: 403 }
    );
  }

  return null; // Allowed
}

/**
 * Atomically record usage for a feature.
 * Call this AFTER a successful business operation to consume the limit.
 */
export async function recordUsage(
  companyId: string,
  featureCode: string,
  amount: number = 1,
  idempotencyKey: string,
  userId?: string
) {
  const entitlements = await getEffectiveEntitlements(companyId);
  const feature = entitlements.get(featureCode);
  if (!feature) return;

  const sub = await prisma.subscription.findUnique({ where: { companyId } });
  if (!sub) return;

  const now = new Date();
  const periodStart = sub.currentPeriodStart || now;
  const periodEnd = sub.currentPeriodEnd || new Date(now.getFullYear() + 10, now.getMonth());

  await prisma.$transaction(async (tx: any) => {
    // 1. Create UsageEvent (fails if idempotencyKey exists)
    await tx.usageEvent.create({
      data: {
        companyId,
        subscriptionId: sub.id,
        featureId: feature.featureId,
        userId: userId || null,
        quantity: amount,
        eventType: "CONSUMPTION",
        idempotencyKey,
        occurredAt: now,
      }
    });

    // 2. Upsert UsageCounter
    const existingCounter = await tx.usageCounter.findFirst({
      where: {
        companyId,
        featureId: feature.featureId,
        periodStart: { lte: now },
        periodEnd: { gte: now }
      }
    });

    if (existingCounter) {
      await tx.usageCounter.update({
        where: { id: existingCounter.id },
        data: { usageValue: { increment: amount } }
      });
    } else {
      await tx.usageCounter.create({
        data: {
          companyId,
          subscriptionId: sub.id,
          featureId: feature.featureId,
          periodStart,
          periodEnd,
          usageValue: amount,
          limitValue: feature.limitValue,
        }
      });
    }
  });
}
