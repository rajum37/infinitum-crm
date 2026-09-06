"use client";

import { useState, useEffect } from "react";
import {
  IconBuildingSkyscraper,
  IconUserShield,
  IconUsers,
  IconAddressBook,
  IconLayoutDashboard,
  IconActivity,
  IconChevronRight,
  IconTarget,
  IconFileDescription,
  IconReceipt,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";

interface AuditLogEntry {
  id: string;
  action: string;
  actorName: string;
  actorEmail: string;
  targetName?: string;
  summary?: string;
  severity: "INFO" | "SUCCESS" | "WARNING" | "DANGER";
  createdAt: string;
}

const SEVERITY_DOT: Record<string, string> = {
  INFO: "bg-sky-400",
  SUCCESS: "bg-emerald-400",
  WARNING: "bg-amber-400",
  DANGER: "bg-rose-400",
};

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);

  // Super Admin Stats
  const [companyCount, setCompanyCount] = useState(0);
  const [planCount, setPlanCount] = useState(0);
  const [featureCount, setFeatureCount] = useState(0);

  // Customer Stats
  const [leadCount, setLeadCount] = useState(0);
  const [dealCount, setDealCount] = useState(0);
  const [offerCount, setOfferCount] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);

  // Shared Activities (Audit Logs for Super Admin, Activities for Customer)
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const effectiveRole =
    user?.role ||
    (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("nexus-user") || "{}").role : null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !effectiveRole) return;

    async function fetchOverview() {
      setLoading(true);
      try {
        const token = localStorage.getItem("nexus-token");
        const headers = { Authorization: `Bearer ${token}` };

        if (effectiveRole === "SUPER_ADMIN") {
          const [statsRes, auditRes] = await Promise.all([
            fetch("/api/admin/stats", { headers }),
            fetch("/api/audit-logs?limit=10", { headers }),
          ]);

          if (statsRes.ok) {
            const stats = await statsRes.json();
            setCompanyCount(stats.totalOrganizations ?? 0);
            setPlanCount(stats.totalPlans ?? 0);
            setFeatureCount(stats.totalFeatures ?? 0);
          }

          if (auditRes.ok) {
            const logs = await auditRes.json();
            setRecentActivity(logs || []);
          }
        } else {
          // Admin or User -> Customer Dashboard
          const statsRes = await fetch("/api/dashboard/stats", { headers });
          if (statsRes.ok) {
            const stats = await statsRes.json();
            setLeadCount(stats.leadCount ?? 0);
            setDealCount(stats.dealCount ?? 0);
            setOfferCount(stats.offerCount ?? 0);
            setDocumentCount(stats.documentCount ?? 0);
            
            // Format recent activities for unified rendering
            const activities = (stats.recentActivities || []).slice(0, 10).map((act: any) => ({
              id: act.id,
              summary: act.description || `${act.type} logged`,
              actorName: act.user?.name || "System",
              createdAt: act.createdAt,
              severity: "INFO",
            }));
            setRecentActivity(activities);
          }
        }
      } catch (err) {
        console.error("Error fetching overview:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchOverview();
  }, [isMounted, effectiveRole]);

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-[#10D078] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isSuperAdmin = effectiveRole === "SUPER_ADMIN";

  const cards = isSuperAdmin
    ? [
        {
          label: "Organizations",
          value: companyCount,
          sub: "Total registered",
          icon: IconBuildingSkyscraper,
          color: "text-[#38BDF8] bg-[#03203C] border-[#0A3A6B]",
          href: "/admin/organizations",
        },

        {
          label: "Plans",
          value: planCount,
          sub: "Platform plans",
          icon: IconUsers,
          color: "text-[#C084FC] bg-[#2E1065] border-[#4C1D95]",
          href: "/admin/plans",
        },
        {
          label: "Features",
          value: featureCount,
          sub: "Platform features",
          icon: IconAddressBook,
          color: "text-orange-400 bg-[#3A2308] border-[#6B440A]",
          href: "/admin/features",
        },
      ]
    : [
        {
          label: "Total Leads",
          value: leadCount,
          sub: "All time leads",
          icon: IconUsers,
          color: "text-[#38BDF8] bg-[#03203C] border-[#0A3A6B]",
          href: "/leads/crm",
        },
        {
          label: "Total Deals",
          value: dealCount,
          sub: "Active pipeline deals",
          icon: IconTarget,
          color: "text-[#10D078] bg-[#063022] border-[#0C583E]",
          href: "/sales/pipeline",
        },
        {
          label: "Total Offers",
          value: offerCount,
          sub: "Proposals sent",
          icon: IconReceipt,
          color: "text-[#C084FC] bg-[#2E1065] border-[#4C1D95]",
          href: "/offer/revenue-generator",
        },
        {
          label: "Total Documents",
          value: documentCount,
          sub: "Files uploaded",
          icon: IconFileDescription,
          color: "text-orange-400 bg-[#3A2308] border-[#6B440A]",
          href: "/documents/files",
        },
      ];

  return (
    <div className="space-y-6 text-nexus-text font-sans">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-nexus-primary/10 border border-nexus-primary/20 text-nexus-primary flex items-center justify-center shadow-lg shadow-nexus-primary/5">
          <IconLayoutDashboard size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-nexus-text tracking-tight">Dashboard</h1>
          <p className="text-xs text-nexus-text-secondary">
            {isSuperAdmin
              ? "Platform-wide overview across all companies, admins, and users."
              : "Overview of your company's CRM metrics and recent activity."}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="bg-[#0B0F19] border border-[#151B2C] rounded-xl p-5 flex items-center justify-between shadow-sm hover:border-nexus-primary/40 transition-colors"
          >
            <div>
              <span className="text-[11px] font-bold tracking-wider text-nexus-text-secondary uppercase">
                {c.label}
              </span>
              <div className="text-2xl font-bold text-white mt-1">{loading ? "..." : c.value}</div>
              <div className="text-xs text-nexus-muted mt-0.5">{c.sub}</div>
            </div>
            <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${c.color}`}>
              <c.icon size={22} />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-[#0B0F19] border border-[#151B2C] rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <IconActivity size={18} className="text-nexus-primary" />
            Recent Activity
          </h3>
          {isSuperAdmin && (
            <Link
              href="/admin/audit-logs"
              className="text-xs font-semibold text-nexus-primary hover:underline flex items-center gap-0.5"
            >
              View All <IconChevronRight size={14} />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="text-xs text-nexus-muted text-center py-6">Loading activity…</div>
        ) : recentActivity.length === 0 ? (
          <div className="text-xs text-nexus-muted text-center py-6">No recent activity.</div>
        ) : (
          <div className="divide-y divide-[#151B2C]">
            {recentActivity.map((log) => (
              <div key={log.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${SEVERITY_DOT[log.severity] || "bg-sky-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-nexus-text truncate">{log.summary}</p>
                  <p className="text-[11px] text-nexus-muted mt-0.5">
                    {log.actorName} · {timeAgo(log.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
