"use client";

import React, { useState, useEffect } from "react";
import { IconBuildingCommunity, IconEye } from "@tabler/icons-react";
import { formatCurrency, intervalLabel } from "@/lib/pricing";
import Link from "next/link";

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/admin/organizations", {
          headers: { Authorization: `Bearer ${localStorage.getItem("nexus-token")}` },
        });
        if (res.ok) setOrganizations(await res.json());
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  return (
    <div className="space-y-6 text-nexus-text">
      <div>
        <h1 className="text-2xl font-bold text-nexus-text flex items-center gap-2">
          <IconBuildingCommunity size={24} className="text-nexus-primary" />
          Organizations Overview
        </h1>
        <p className="text-sm text-nexus-text-secondary mt-1">Platform-wide visibility of all customer companies.</p>
      </div>

      <div className="bg-nexus-card border border-nexus-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-nexus-hover/50 text-nexus-text-secondary text-xs uppercase tracking-wider border-b border-nexus-border">
                <th className="px-4 py-3 font-semibold">Company Name</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Subscription Plan</th>
                <th className="px-4 py-3 font-semibold">Billing Cycle</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Trailing Days</th>
                <th className="px-4 py-3 font-semibold">Trial Start</th>
                <th className="px-4 py-3 font-semibold">Trial End</th>
                <th className="px-4 py-3 font-semibold">Period</th>
                <th className="px-4 py-3 font-semibold">Next Renewal</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Auto Renew</th>
                <th className="px-4 py-3 font-semibold">Owner</th>
                <th className="px-4 py-3 font-semibold text-right">Users</th>
                <th className="px-4 py-3 font-semibold">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nexus-border">
              {loading ? (
                <tr><td colSpan={14} className="px-6 py-8 text-center text-nexus-muted text-sm">Loading organizations...</td></tr>
              ) : organizations.length === 0 ? (
                <tr><td colSpan={14} className="px-6 py-8 text-center text-nexus-muted text-sm">No organizations found.</td></tr>
              ) : (
                organizations.map((org) => {
                  const sub = org.subscription;
                  const priceSource = sub?.planPrice || sub;

                  return (
                    <tr key={org.id} className="hover:bg-nexus-hover/50 transition-colors text-sm">
                      {/* 1. Company Name */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-nexus-text">{org.name}</div>
                      </td>

                      {/* 2. Company Status */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${org.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {org.status}
                        </span>
                      </td>

                      {/* 3. Subscription Plan */}
                      <td className="px-4 py-3">
                        {sub?.plan ? (
                          <div className="font-medium text-white">{sub.plan.name}</div>
                        ) : (
                          <span className="text-nexus-muted italic">No Subscription</span>
                        )}
                      </td>

                      {/* 4. Billing Cycle */}
                      <td className="px-4 py-3 text-nexus-muted">
                        {priceSource?.billingInterval
                          ? intervalLabel(priceSource.billingInterval, priceSource.intervalCount)
                          : "—"}
                      </td>

                      {/* 5. Price */}
                      <td className="px-4 py-3">
                        {sub ? (
                          priceSource?.amount !== null && priceSource?.amount !== undefined ? (
                            <div className="font-semibold text-emerald-400">
                              {formatCurrency(priceSource.amount, priceSource.currency)}
                              <span className="text-xs text-nexus-muted ml-1 font-normal">
                                / {intervalLabel(priceSource.billingInterval, priceSource.intervalCount)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-amber-400/80 text-xs italic">Unavailable</span>
                          )
                        ) : (
                          <span className="text-nexus-muted">—</span>
                        )}
                        {sub?.planPrice?.version && (
                          <div className="text-[10px] text-nexus-muted mt-0.5" title={sub.planPrice.code}>
                            Version {sub.planPrice.version}
                          </div>
                        )}
                      </td>

                      {/* 6. Trailing Days */}
                      <td className="px-4 py-3 text-xs">
                        {priceSource?.trailingDays !== undefined ? `${priceSource.trailingDays} days` : "—"}
                      </td>

                      {/* 7. Trial Start */}
                      <td className="px-4 py-3 text-xs text-nexus-muted">
                        {formatDate(sub?.trialStartsAt)}
                      </td>

                      {/* 8. Trial End */}
                      <td className="px-4 py-3 text-xs text-nexus-muted">
                        {formatDate(sub?.trialEndsAt)}
                      </td>

                      {/* 9. Period */}
                      <td className="px-4 py-3">
                        {sub?.currentPeriodStart || sub?.currentPeriodEnd ? (
                          <div className="text-xs">
                            <div className="text-nexus-text">{formatDate(sub.currentPeriodStart)}</div>
                            <div className="text-nexus-muted text-[10px]">to {formatDate(sub.currentPeriodEnd)}</div>
                          </div>
                        ) : "—"}
                      </td>

                      {/* 10. Next Renewal */}
                      <td className="px-4 py-3 text-xs">
                        {sub?.status === 'CANCELED' ? (
                          <span className="text-rose-400">Canceled</span>
                        ) : sub?.cancelAtPeriodEnd ? (
                          <span className="text-amber-400">Canceled at period end</span>
                        ) : sub?.currentPeriodEnd ? (
                          <span className="text-emerald-400/90">{formatDate(sub.currentPeriodEnd)}</span>
                        ) : "—"}
                      </td>

                      {/* 11. Sub Status */}
                      <td className="px-4 py-3">
                        {sub ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${sub.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                            sub.status === 'TRIALING' ? 'bg-sky-500/10 text-sky-400' :
                              sub.status === 'PAST_DUE' ? 'bg-rose-500/10 text-rose-400' :
                                'bg-nexus-muted/20 text-nexus-muted'
                            }`}>
                            {sub.status}
                          </span>
                        ) : "—"}
                      </td>

                      {/* 12. Auto Renew */}
                      <td className="px-4 py-3">
                        {sub ? (
                          <span className={`text-xs ${!sub.cancelAtPeriodEnd && sub.status !== 'CANCELED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {!sub.cancelAtPeriodEnd && sub.status !== 'CANCELED' ? 'Yes' : 'No'}
                          </span>
                        ) : "—"}
                      </td>

                      {/* 11. Owner */}
                      <td className="px-4 py-3 text-xs">
                        {org.owner ? (
                          <>
                            <div className="text-white font-medium">{org.owner.name}</div>
                            <div className="text-nexus-muted">{org.owner.email}</div>
                          </>
                        ) : (
                          <span className="text-amber-400/80 italic">Unassigned</span>
                        )}
                      </td>

                      {/* 12. Users */}
                      <td className="px-4 py-3 text-right">
                        <span className="inline-block bg-nexus-primary/20 text-nexus-primary px-2 py-0.5 rounded font-mono text-xs">
                          {org.userCount}
                        </span>
                      </td>

                      {/* 13. Created Date */}
                      <td className="px-4 py-3 text-xs text-nexus-muted">
                        {formatDate(org.createdAt)}
                      </td>


                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
