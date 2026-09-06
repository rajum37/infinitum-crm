"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { IconPlus, IconEdit, IconTrash, IconEye, IconEyeOff, IconCheck, IconX } from "@tabler/icons-react";
import { SuccessPopup } from "@/components/common/SuccessPopup";

export default function PlansAdminPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/plans", {
        headers: { Authorization: `Bearer ${localStorage.getItem("nexus-token")}` },
      });
      if (!res.ok) throw new Error("Failed to load plans");
      const data = await res.json();
      setPlans(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
    try {
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("nexus-token")}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      fetchPlans();
      setSuccess(`Plan ${newStatus === "ACTIVE" ? "activated" : "deactivated"} successfully`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this plan? This may break existing subscriptions.")) return;
    try {
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("nexus-token")}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete plan");
      }
      fetchPlans();
      setSuccess("Plan deleted successfully");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6 text-nexus-text">
      {success && <SuccessPopup message={success} type="success" onClose={() => setSuccess(null)} />}
      {error && <SuccessPopup message={error} type="error" onClose={() => setError(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-nexus-text">Plans</h1>
          <p className="text-sm text-nexus-text-secondary mt-1">Manage platform subscription plans</p>
        </div>
        <Link
          href="/admin/plans/new"
          className="flex items-center gap-2 px-4 py-2 bg-nexus-primary hover:bg-nexus-primary/90 text-nexus-bg font-semibold rounded-xl text-sm transition-colors shadow-lg"
        >
          <IconPlus size={18} />
          Create Plan
        </Link>
      </div>

      <div className="bg-nexus-card border border-nexus-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-nexus-hover/50 text-nexus-text-secondary text-xs uppercase tracking-wider border-b border-nexus-border">
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Code</th>
                <th className="px-6 py-4 font-semibold">Price</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Visibility</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nexus-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-nexus-muted text-sm">
                    Loading plans...
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-nexus-muted text-sm">
                    No plans found.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-nexus-hover/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-nexus-text flex items-center gap-2">
                        {plan.name}
                        {plan.isDefault && (
                          <span className="text-[10px] bg-nexus-primary/20 text-nexus-primary px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-nexus-muted mt-1 truncate max-w-xs">{plan.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs text-nexus-primary bg-nexus-primary/10 px-2 py-1 rounded">
                        {plan.code}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-nexus-text">
                        {plan.currency}
                      </div>
                      <div className="text-[10px] text-nexus-muted uppercase">
                        Versioned Pricing
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(plan.id, plan.status)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                          plan.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                        }`}
                      >
                        {plan.status === "ACTIVE" ? <IconCheck size={14} /> : <IconX size={14} />}
                        {plan.status}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${plan.isPublic ? "text-sky-400" : "text-nexus-muted"}`}>
                        {plan.isPublic ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                        {plan.isPublic ? "Public" : "Hidden"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/plans/${plan.id}`}
                          className="p-2 text-nexus-text-secondary hover:text-nexus-text hover:bg-nexus-hover rounded-lg transition-colors"
                          title="Edit Plan & Features"
                        >
                          <IconEdit size={18} />
                        </Link>
                        <button
                          onClick={() => handleDelete(plan.id)}
                          className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete Plan"
                        >
                          <IconTrash size={18} />
                        </button>
                      </div>
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
