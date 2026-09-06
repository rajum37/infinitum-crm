"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft, IconDeviceFloppy } from "@tabler/icons-react";
import { SuccessPopup } from "@/components/common/SuccessPopup";

export default function FeatureDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const isNew = params.id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [feature, setFeature] = useState<any>({
    code: "",
    name: "",
    description: "",
    featureType: "BOOLEAN",
    module: "",
    resource: "",
    action: "",
    isMetered: false,
    isSystem: false,
    isVisible: true,
  });

  useEffect(() => {
    async function loadData() {
      if (isNew) return;
      try {
        const headers = { Authorization: `Bearer ${localStorage.getItem("nexus-token")}` };
        const res = await fetch(`/api/admin/features/${params.id}`, { headers });
        if (!res.ok) throw new Error("Failed to load feature details");
        const data = await res.json();
        setFeature(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.id, isNew]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("nexus-token")}`,
      };

      const url = isNew ? "/api/admin/features" : `/api/admin/features/${params.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, { method, headers, body: JSON.stringify(feature) });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to save feature");

      setSuccess("Feature saved successfully!");
      if (isNew) {
        setTimeout(() => router.push(`/admin/features/${data.id}`), 1000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-nexus-muted">Loading feature details...</div>;
  }

  return (
    <div className="space-y-6 text-nexus-text max-w-4xl">
      {success && <SuccessPopup message={success} type="success" onClose={() => setSuccess(null)} />}
      {error && <SuccessPopup message={error} type="error" onClose={() => setError(null)} />}

      <div className="flex items-center gap-4">
        <Link href="/admin/features" className="p-2 hover:bg-nexus-hover rounded-xl transition-colors">
          <IconArrowLeft size={20} className="text-nexus-text-secondary" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-nexus-text">{isNew ? "Create Feature" : "Edit Feature"}</h1>
          <p className="text-sm text-nexus-text-secondary mt-1">Configure global feature parameters</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="bg-nexus-card border border-nexus-border rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-nexus-text-secondary">Name</label>
              <input
                type="text"
                required
                value={feature.name}
                onChange={(e) => setFeature({ ...feature, name: e.target.value })}
                className="w-full bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2 text-sm focus:border-nexus-primary focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-nexus-text-secondary">Code (Unique)</label>
              <input
                type="text"
                required
                value={feature.code}
                onChange={(e) => setFeature({ ...feature, code: e.target.value })}
                className="w-full bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2 text-sm focus:border-nexus-primary focus:outline-none uppercase"
                disabled={!isNew}
                title={!isNew ? "Feature codes cannot be changed after creation to prevent entitlement engine breakage" : ""}
              />
              {!isNew && <p className="text-[10px] text-amber-400/80">Code cannot be changed.</p>}
            </div>
            
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-nexus-text-secondary">Description</label>
              <textarea
                rows={2}
                value={feature.description || ""}
                onChange={(e) => setFeature({ ...feature, description: e.target.value })}
                className="w-full bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2 text-sm focus:border-nexus-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-nexus-text-secondary">Feature Type</label>
              <select
                value={feature.featureType}
                onChange={(e) => setFeature({ ...feature, featureType: e.target.value })}
                className="w-full bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2 text-sm focus:border-nexus-primary focus:outline-none"
              >
                <option value="BOOLEAN">Boolean (Toggle)</option>
                <option value="LIMIT">Limit (Quantitative)</option>
                <option value="CONFIG">Config (JSON Options)</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-nexus-text-secondary">Module (Optional)</label>
              <input
                type="text"
                value={feature.module || ""}
                onChange={(e) => setFeature({ ...feature, module: e.target.value })}
                className="w-full bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2 text-sm focus:border-nexus-primary focus:outline-none"
                placeholder="e.g. CRM, FINANCES"
              />
            </div>
            
            <div className="flex flex-col gap-4 md:col-span-2 p-4 bg-nexus-bg/50 rounded-xl border border-nexus-border/50">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={feature.isMetered}
                  onChange={(e) => setFeature({ ...feature, isMetered: e.target.checked })}
                  className="rounded bg-nexus-bg border-nexus-border text-nexus-primary focus:ring-nexus-primary/50 w-4 h-4"
                />
                <div>
                  <span className="text-sm font-semibold block">Metered Usage</span>
                  <span className="text-[11px] text-nexus-muted">Tracks usage events instead of static limits</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={feature.isSystem}
                  onChange={(e) => setFeature({ ...feature, isSystem: e.target.checked })}
                  className="rounded bg-nexus-bg border-nexus-border text-nexus-primary focus:ring-nexus-primary/50 w-4 h-4"
                />
                <div>
                  <span className="text-sm font-semibold block">System Feature</span>
                  <span className="text-[11px] text-nexus-muted">Cannot be deleted normally</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={feature.isVisible}
                  onChange={(e) => setFeature({ ...feature, isVisible: e.target.checked })}
                  className="rounded bg-nexus-bg border-nexus-border text-nexus-primary focus:ring-nexus-primary/50 w-4 h-4"
                />
                <div>
                  <span className="text-sm font-semibold block">Visible in UI</span>
                  <span className="text-[11px] text-nexus-muted">Show this feature in customer-facing plan comparison tables</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 sticky bottom-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-nexus-primary hover:bg-nexus-primary/90 text-nexus-bg font-bold rounded-xl text-sm transition-colors shadow-lg disabled:opacity-50"
          >
            <IconDeviceFloppy size={18} />
            {saving ? "Saving..." : "Save Feature"}
          </button>
        </div>
      </form>
    </div>
  );
}
