"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconPlus,
  IconTag,
  IconCheck,
  IconX,
  IconCurrencyDollar,
  IconRefresh,
  IconHistory,
} from "@tabler/icons-react";
import { SuccessPopup } from "@/components/common/SuccessPopup";

const INTERVAL_LABELS: Record<string, string> = {
  MONTH: "Monthly",
  QUARTER: "Quarterly",
  HALF_YEAR: "Half-Yearly",
  YEAR: "Yearly",
  WEEK: "Weekly",
  DAY: "Daily",
};

const CURRENCY_LOCALE: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
};

function formatAmount(amount: number | string, currency: string) {
  const n = Number(amount);
  const c = (currency || "USD").toUpperCase();
  const locale = CURRENCY_LOCALE[c] || "en-US";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${c} ${n.toFixed(2)}`;
  }
}

function PriceRow({ price, onToggleActive, onSetCurrent }: { price: any; onToggleActive: () => void; onSetCurrent: () => void }) {
  return (
    <tr className={`border-b border-nexus-border transition-colors ${price.isActive ? "" : "opacity-50"}`}>
      <td className="px-4 py-3">
        <code className="text-xs bg-black/20 text-nexus-primary px-2 py-1 rounded font-mono">{price.code}</code>
        <span className="ml-2 text-xs text-nexus-muted">v{price.version}</span>
      </td>
      <td className="px-4 py-3 text-sm">{INTERVAL_LABELS[price.billingInterval] ?? price.billingInterval}</td>
      <td className="px-4 py-3 text-sm font-mono font-semibold">{formatAmount(price.amount, price.currency)}</td>
      <td className="px-4 py-3 text-sm text-nexus-muted">{price.currency}</td>
      <td className="px-4 py-3 text-xs text-nexus-muted">{price._count?.subscriptions ?? 0} subs</td>
      <td className="px-4 py-3">
        {price.isDefault ? (
          <span className="px-2 py-0.5 rounded-full text-xs bg-nexus-primary/20 text-nexus-primary font-semibold">Current</span>
        ) : (
          <button
            onClick={onSetCurrent}
            className="px-2 py-0.5 rounded-full text-xs bg-nexus-hover text-nexus-text-secondary hover:bg-nexus-primary/20 hover:text-nexus-primary transition-colors"
          >
            Set Current
          </button>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${price.isActive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
          {price.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-nexus-muted">{new Date(price.createdAt).toLocaleDateString()}</td>
      <td className="px-4 py-3">
        <button
          onClick={onToggleActive}
          disabled={(price._count?.subscriptions ?? 0) > 0 && price.isActive}
          title={(price._count?.subscriptions ?? 0) > 0 && price.isActive ? "Cannot deactivate — active subscriptions exist" : ""}
          className="text-xs text-nexus-muted hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {price.isActive ? "Deactivate" : "Reactivate"}
        </button>
      </td>
    </tr>
  );
}

function CreatePriceModal({ planId, planCode, planCurrency, onClose, onCreated }: { planId: string; planCode: string; planCurrency: string; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    billingInterval: "MONTH",
    intervalCount: 1,
    currency: planCurrency || "INR",
    amount: "",
    originalAmount: "",
    isDefault: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-calculate discount % from amount + originalAmount
  const computedDiscountPercent =
    form.amount && form.originalAmount && Number(form.originalAmount) > Number(form.amount)
      ? (((Number(form.originalAmount) - Number(form.amount)) / Number(form.originalAmount)) * 100).toFixed(2)
      : null;
  const computedDiscountAmount =
    form.amount && form.originalAmount && Number(form.originalAmount) > Number(form.amount)
      ? (Number(form.originalAmount) - Number(form.amount)).toFixed(2)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem("nexus-token");
      const res = await fetch(`/api/admin/plans/${planId}/prices`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          billingInterval: form.billingInterval,
          intervalCount: Number(form.intervalCount),
          currency: form.currency.toUpperCase(),
          amount: parseFloat(form.amount),
          originalAmount: form.originalAmount ? parseFloat(form.originalAmount) : undefined,
          discountAmount: computedDiscountAmount ? parseFloat(computedDiscountAmount) : undefined,
          discountPercent: computedDiscountPercent ? parseFloat(computedDiscountPercent) : undefined,
          isDefault: form.isDefault,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create price");
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-nexus-card border border-nexus-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-nexus-text">New Price Version</h2>
            <p className="text-xs text-nexus-muted mt-0.5">Creates an immutable, versioned price entry for <strong>{planCode}</strong></p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-nexus-hover rounded-lg transition-colors">
            <IconX size={18} className="text-nexus-text-secondary" />
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-nexus-text-secondary uppercase">Billing Interval</label>
              <select
                value={form.billingInterval}
                onChange={(e) => setForm({ ...form, billingInterval: e.target.value })}
                className="w-full bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2 text-sm focus:border-nexus-primary focus:outline-none"
              >
                <option value="MONTH">Monthly</option>
                <option value="QUARTER">Quarterly</option>
                <option value="HALF_YEAR">Half-Yearly</option>
                <option value="YEAR">Yearly</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-nexus-text-secondary uppercase">Currency</label>
              <input
                type="text"
                maxLength={3}
                required
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                className="w-full bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2 text-sm focus:border-nexus-primary focus:outline-none uppercase"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-nexus-text-secondary uppercase">Amount <span className="text-red-400">*</span></label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="e.g. 14000"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2 text-sm focus:border-nexus-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-nexus-text-secondary uppercase">Original Amount <span className="text-nexus-muted font-normal">(before discount)</span></label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 25000"
                value={form.originalAmount}
                onChange={(e) => setForm({ ...form, originalAmount: e.target.value })}
                className="w-full bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2 text-sm focus:border-nexus-primary focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-nexus-text-secondary uppercase">Discount</label>
              <div className="h-[38px] flex items-center px-3 rounded-lg border border-nexus-border bg-nexus-bg/50">
                {computedDiscountPercent ? (
                  <span className="text-green-400 font-semibold text-sm">
                    {computedDiscountPercent}% off
                    <span className="ml-1.5 text-xs text-nexus-muted font-normal">(saves {form.currency} {computedDiscountAmount})</span>
                  </span>
                ) : (
                  <span className="text-nexus-muted text-xs">Auto-calculated</span>
                )}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="rounded bg-nexus-bg border-nexus-border text-nexus-primary focus:ring-nexus-primary/50 w-4 h-4"
            />
            <span className="text-sm font-semibold">Set as current price for new subscriptions</span>
          </label>

          <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            ⚠️ This price will be <strong>immutable</strong> once created. To change the amount later, create a new version.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-nexus-text-secondary hover:bg-nexus-hover rounded-lg transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-nexus-primary hover:bg-nexus-primary/90 text-nexus-bg font-bold rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              <IconPlus size={16} />
              {saving ? "Creating..." : "Create Price"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PlanDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreatePrice, setShowCreatePrice] = useState(false);

  const [plan, setPlan] = useState<any>({
    name: "",
    code: "",
    description: "",
    currency: "USD",
    isPublic: true,
    isDefault: false,
    planType: "STANDARD",
  });

  const [prices, setPrices] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [planFeatures, setPlanFeatures] = useState<Record<string, any>>({});

  const loadData = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("nexus-token")}` };

      const fRes = await fetch("/api/admin/features", { headers });
      if (fRes.ok) setFeatures(await fRes.json());

      if (!isNew) {
        const pRes = await fetch(`/api/admin/plans/${id}`, { headers });
        if (!pRes.ok) throw new Error("Failed to load plan details");
        const pData = await pRes.json();
        setPlan(pData);
        setPrices(pData.prices ?? []);

        const pfMap: Record<string, any> = {};
        if (pData.features) {
          pData.features.forEach((pf: any) => {
            pfMap[pf.featureId] = {
              enabled: pf.enabled,
              limitValue: pf.limitValue ? Number(pf.limitValue) : null,
              limitType: pf.limitType || null,
            };
          });
        }
        setPlanFeatures(pfMap);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadData();
  }, [loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("nexus-token")}` };
      const payload = {
        name: plan.name,
        description: plan.description,
        status: plan.status || "ACTIVE",
        planType: plan.planType,
        currency: plan.currency,
        isPublic: plan.isPublic,
        isDefault: plan.isDefault,
        features: Object.entries(planFeatures).map(([featureId, pf]) => ({ featureId, ...pf })),
      };

      const url = isNew ? "/api/admin/plans" : `/api/admin/plans/${id}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save plan");
      setSuccess("Plan saved successfully!");
      if (isNew) setTimeout(() => router.push(`/admin/plans/${data.id}`), 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePriceToggle = async (priceId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem("nexus-token");
      const res = await fetch(`/api/admin/plans/${id}/prices/${priceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPrices((prev) => prev.map((p) => (p.id === priceId ? { ...p, isActive: !isActive } : p)));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSetCurrent = async (priceId: string) => {
    try {
      const token = localStorage.getItem("nexus-token");
      const res = await fetch(`/api/admin/plans/${id}/prices/${priceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isDefault: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Refresh prices from API to get server-authoritative state
      await loadData();
      setSuccess("Price set as current for new subscriptions.");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleFeatureToggle = (featureId: string) => {
    setPlanFeatures((prev) => {
      const existing = prev[featureId];
      if (existing) { const clone = { ...prev }; delete clone[featureId]; return clone; }
      return { ...prev, [featureId]: { enabled: true, limitValue: null, limitType: null } };
    });
  };

  const handleFeatureChange = (featureId: string, field: string, value: any) => {
    setPlanFeatures((prev) => ({ ...prev, [featureId]: { ...prev[featureId], [field]: value } }));
  };

  // Group prices by billingInterval for display
  const pricesByInterval = prices.reduce((acc: Record<string, any[]>, p: any) => {
    const key = p.billingInterval;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  if (loading) return <div className="text-center py-10 text-nexus-muted">Loading plan details...</div>;

  return (
    <div className="space-y-6 text-nexus-text max-w-5xl">
      {success && <SuccessPopup message={success} type="success" onClose={() => setSuccess(null)} />}
      {error && <SuccessPopup message={error} type="error" onClose={() => setError(null)} />}
      {showCreatePrice && (
        <CreatePriceModal
          planId={id}
          planCode={plan.code}
          planCurrency={plan.currency || "INR"}
          onClose={() => setShowCreatePrice(false)}
          onCreated={() => { setShowCreatePrice(false); hasFetched.current = false; loadData(); setSuccess("Price version created successfully!"); }}
        />
      )}

      <div className="flex items-center gap-4">
        <Link href="/admin/plans" className="p-2 hover:bg-nexus-hover rounded-xl transition-colors">
          <IconArrowLeft size={20} className="text-nexus-text-secondary" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-nexus-text">{isNew ? "Create Plan" : plan.name}</h1>
          {!isNew && <p className="text-sm text-nexus-text-secondary mt-1">Plan code: <code className="text-nexus-primary">{plan.code}</code></p>}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Plan Details */}
        <div className="bg-nexus-card border border-nexus-border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4 border-b border-nexus-border pb-2">Plan Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-nexus-text-secondary">Name</label>
              <input type="text" required value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })}
                className="w-full bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2 text-sm focus:border-nexus-primary focus:outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-nexus-text-secondary">Code (Unique — immutable)</label>
              <input type="text" required value={plan.code}
                onChange={(e) => isNew && setPlan({ ...plan, code: e.target.value.toUpperCase() })}
                disabled={!isNew}
                className="w-full bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2 text-sm focus:border-nexus-primary focus:outline-none uppercase disabled:opacity-60 disabled:cursor-not-allowed" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-nexus-text-secondary">Description</label>
              <textarea rows={2} value={plan.description} onChange={(e) => setPlan({ ...plan, description: e.target.value })}
                className="w-full bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2 text-sm focus:border-nexus-primary focus:outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-nexus-text-secondary">Default Currency</label>
              <input type="text" maxLength={3} required value={plan.currency}
                onChange={(e) => setPlan({ ...plan, currency: e.target.value.toUpperCase() })}
                className="w-full bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2 text-sm focus:border-nexus-primary focus:outline-none uppercase" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-nexus-text-secondary">Plan Type</label>
              <select value={plan.planType} onChange={(e) => setPlan({ ...plan, planType: e.target.value })}
                className="w-full bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2 text-sm focus:border-nexus-primary focus:outline-none">
                <option value="STANDARD">Standard</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
            <div className="flex items-center gap-6 md:col-span-2 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={plan.isPublic ?? true} onChange={(e) => setPlan({ ...plan, isPublic: e.target.checked })}
                  className="rounded bg-nexus-bg border-nexus-border text-nexus-primary focus:ring-nexus-primary/50 w-4 h-4" />
                <span className="text-sm font-semibold">Publicly Visible</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={plan.isDefault ?? false} onChange={(e) => setPlan({ ...plan, isDefault: e.target.checked })}
                  className="rounded bg-nexus-bg border-nexus-border text-nexus-primary focus:ring-nexus-primary/50 w-4 h-4" />
                <span className="text-sm font-semibold">Default Plan</span>
              </label>
            </div>
          </div>
        </div>

        {/* Pricing & Billing Cycles — only shown for existing plans */}
        {!isNew && (
          <div className="bg-nexus-card border border-nexus-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-nexus-border pb-3">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <IconTag size={18} className="text-nexus-primary" />
                  Pricing & Billing Cycles
                </h2>
                <p className="text-xs text-nexus-muted mt-1">
                  Each price is immutable once created. To update a price, create a new version.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreatePrice(true)}
                className="flex items-center gap-2 px-4 py-2 bg-nexus-primary/10 hover:bg-nexus-primary/20 text-nexus-primary font-semibold rounded-lg text-sm transition-colors border border-nexus-primary/20"
              >
                <IconPlus size={16} />
                New Price Version
              </button>
            </div>

            {prices.length === 0 ? (
              <div className="text-center py-10 text-nexus-muted">
                <IconCurrencyDollar size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No prices configured yet.</p>
                <p className="text-xs mt-1">Click <strong>New Price Version</strong> to add billing cycles to this plan.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(pricesByInterval).map(([interval, intervalPrices]) => (
                  <div key={interval}>
                    <h3 className="text-xs font-bold text-nexus-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                      <IconHistory size={14} />
                      {INTERVAL_LABELS[interval] ?? interval}
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-nexus-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-nexus-bg border-b border-nexus-border">
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-nexus-text-secondary">Code / Version</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-nexus-text-secondary">Interval</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-nexus-text-secondary">Amount</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-nexus-text-secondary">Currency</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-nexus-text-secondary">Usage</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-nexus-text-secondary">Status</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-nexus-text-secondary">Active</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-nexus-text-secondary">Created</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-nexus-text-secondary">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(intervalPrices as any[]).map((price: any) => (
                            <PriceRow
                              key={price.id}
                              price={price}
                              onToggleActive={() => handlePriceToggle(price.id, price.isActive)}
                              onSetCurrent={() => handleSetCurrent(price.id)}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Feature Configuration */}
        <div className="bg-nexus-card border border-nexus-border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4 border-b border-nexus-border pb-2">Feature Configuration</h2>
          <div className="space-y-4">
            {features.map((feat) => {
              const pf = planFeatures[feat.id];
              const isEnabled = !!pf;
              return (
                <div key={feat.id} className={`p-4 rounded-xl border transition-colors ${isEnabled ? "bg-nexus-primary/5 border-nexus-primary/20" : "bg-nexus-bg border-nexus-border"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        {feat.name}
                        <code className="text-[10px] font-normal text-nexus-text-secondary px-1.5 py-0.5 bg-black/20 rounded">{feat.code}</code>
                      </h3>
                      {feat.description && <p className="text-xs text-nexus-muted mt-0.5">{feat.description}</p>}
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={isEnabled} onChange={() => handleFeatureToggle(feat.id)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-[#151B2C] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-nexus-primary"></div>
                    </label>
                  </div>
                  {isEnabled && (
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-black/10 dark:border-white/10">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-nexus-text-secondary uppercase">Limit Type</label>
                        <select value={pf.limitType || ""} onChange={(e) => handleFeatureChange(feat.id, "limitType", e.target.value || null)}
                          className="w-full bg-nexus-bg border border-nexus-border rounded-md px-2 py-1.5 text-xs focus:border-nexus-primary focus:outline-none">
                          <option value="">None (Boolean check)</option>
                          <option value="MONTHLY">Monthly</option>
                          <option value="LIFETIME">Lifetime</option>
                          <option value="MAX_ACTIVE">Max Active</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-nexus-text-secondary uppercase">Limit Value</label>
                        <input type="number" placeholder="Unlimited" value={pf.limitValue || ""}
                          onChange={(e) => handleFeatureChange(feat.id, "limitValue", e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full bg-nexus-bg border border-nexus-border rounded-md px-2 py-1.5 text-xs focus:border-nexus-primary focus:outline-none" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {features.length === 0 && <div className="text-center py-6 text-sm text-nexus-muted">No features found. Create features first.</div>}
          </div>
        </div>

        <div className="flex justify-end gap-3 sticky bottom-4">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-nexus-primary hover:bg-nexus-primary/90 text-nexus-bg font-bold rounded-xl text-sm transition-colors shadow-lg disabled:opacity-50">
            <IconDeviceFloppy size={18} />
            {saving ? "Saving..." : "Save Plan"}
          </button>
        </div>
      </form>
    </div>
  );
}
