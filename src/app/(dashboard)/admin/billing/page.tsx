"use client";

import { useState, useEffect } from "react";
import { IconCreditCard } from "@tabler/icons-react";

import { SkeletonTable } from "@/components/ui/Skeleton";

export default function AdminBillingPage() {
  const [billing, setBilling] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/admin/billing", {
          headers: { Authorization: `Bearer ${localStorage.getItem("nexus-token")}` },
        });
        if (res.ok) setBilling(await res.json());
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
        <SkeletonTable rows={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-nexus-text">
      <div>
        <h1 className="text-2xl font-bold text-nexus-text flex items-center gap-2">
          <IconCreditCard size={24} className="text-sky-400" />
          Billing Customers (Bypass)
        </h1>
        <p className="text-sm text-nexus-text-secondary mt-1">Read-only overview of platform billing customers (simulated in Phase 2G).</p>
      </div>

      <div className="bg-nexus-card border border-nexus-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-nexus-hover/50 text-nexus-text-secondary text-xs uppercase tracking-wider border-b border-nexus-border">
                <th className="px-6 py-4 font-semibold">Company</th>
                <th className="px-6 py-4 font-semibold">Stripe ID (Mock)</th>
                <th className="px-6 py-4 font-semibold">Active Subscriptions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nexus-border">
              {billing.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-nexus-muted text-sm">No billing customers found.</td></tr>
              ) : (
                billing.map((b) => (
                  <tr key={b.id} className="hover:bg-nexus-hover/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-nexus-text">{b.company?.name || "Unknown"}</div>
                      <div className="text-[10px] text-nexus-muted font-mono mt-0.5">{b.companyId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs text-sky-400 bg-sky-500/10 px-2 py-1 rounded">
                        {b.stripeCustomerId || "None"}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-sm text-nexus-text-secondary">
                      {b.subscriptions?.length || 0}
                    </td>
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
