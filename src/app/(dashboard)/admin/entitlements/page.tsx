"use client";

import { useState, useEffect } from "react";
import { IconAdjustments } from "@tabler/icons-react";

import { SkeletonTable } from "@/components/ui/Skeleton";

export default function AdminEntitlementsPage() {
  const [entitlements, setEntitlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/admin/entitlements", {
          headers: { Authorization: `Bearer ${localStorage.getItem("nexus-token")}` },
        });
        if (res.ok) setEntitlements(await res.json());
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 text-nexus-text">
        <div className="animate-pulse">
          <div className="h-8 bg-nexus-border/50 rounded-lg w-64 mb-2"></div>
          <div className="h-4 bg-nexus-border/30 rounded-lg w-96"></div>
        </div>
        <SkeletonTable rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-nexus-text">
      <div>
        <h1 className="text-2xl font-bold text-nexus-text flex items-center gap-2">
          <IconAdjustments size={24} className="text-purple-400" />
          Entitlement Overrides
        </h1>
        <p className="text-sm text-nexus-text-secondary mt-1">Platform-wide view of manual subscription entitlement overrides.</p>
      </div>

      <div className="bg-nexus-card border border-nexus-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-nexus-hover/50 text-nexus-text-secondary text-xs uppercase tracking-wider border-b border-nexus-border">
                <th className="px-6 py-4 font-semibold">Company</th>
                <th className="px-6 py-4 font-semibold">Feature</th>
                <th className="px-6 py-4 font-semibold">Override Value</th>
                <th className="px-6 py-4 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nexus-border">
              {entitlements.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-nexus-muted text-sm">No active overrides found.</td></tr>
              ) : (
                entitlements.map((e) => (
                  <tr key={e.id} className="hover:bg-nexus-hover/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold">{e.subscription?.company?.name || "Unknown"}</td>
                    <td className="px-6 py-4 text-xs font-mono text-nexus-primary">{e.feature?.code || "Unknown"}</td>
                    <td className="px-6 py-4">
                      {e.enabled === false ? (
                        <span className="text-xs text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">Disabled</span>
                      ) : e.limitValue !== null ? (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Limit: {e.limitValue.toString()}</span>
                      ) : (
                        <span className="text-xs text-nexus-muted">Enabled (Unlimited)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-nexus-muted">{e.reason || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
