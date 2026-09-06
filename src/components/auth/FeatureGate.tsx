"use client";

import { useEffect, useState, ReactNode } from "react";
import { IconLock } from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EntitlementConfig {
  enabled: boolean;
  limitValue: number | null;
}

// Simple in-memory cache so we don't spam the API during navigation
let globalEntitlements: Record<string, EntitlementConfig> | null = null;
let entitlementsPromise: Promise<Record<string, EntitlementConfig>> | null = null;

async function fetchEntitlements() {
  if (globalEntitlements) return globalEntitlements;
  if (entitlementsPromise) return entitlementsPromise;

  entitlementsPromise = fetch("/api/organization/subscription/entitlements")
    .then((res) => res.json())
    .then((data) => {
      if (data.entitlements) {
        globalEntitlements = data.entitlements;
        return globalEntitlements!;
      }
      return {};
    })
    .catch(() => ({}));

  return entitlementsPromise;
}

export function resetEntitlementsCache() {
  globalEntitlements = null;
  entitlementsPromise = null;
}

interface FeatureGateProps {
  featureCode: string;
  children: ReactNode;
  fallback?: ReactNode;
  hideEntirely?: boolean;
}

export function FeatureGate({ featureCode, children, fallback, hideEntirely = false }: FeatureGateProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    fetchEntitlements().then((entitlements) => {
      const entitlement = entitlements[featureCode];
      setHasAccess(entitlement ? entitlement.enabled : false);
    });
  }, [featureCode]);

  // Loading state
  if (hasAccess === null) {
    return null; // Or a small spinner if desired
  }

  // Access granted
  if (hasAccess) {
    return <>{children}</>;
  }

  // Access denied
  if (hideEntirely) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className="border-dashed border-2 bg-nexus-bg/50">
      <CardContent className="flex flex-col items-center justify-center p-12 text-center">
        <div className="h-12 w-12 rounded-full bg-nexus-primary/10 flex items-center justify-center mb-4">
          <IconLock className="text-nexus-primary h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-nexus-text mb-2">Feature Locked</h3>
        <p className="text-nexus-text-secondary text-sm max-w-md mb-6">
          This feature ({featureCode}) is not included in your current subscription plan. 
          Upgrade your plan to unlock this capability.
        </p>
        <Link href="/settings/subscription">
          <Button>View Plans</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
