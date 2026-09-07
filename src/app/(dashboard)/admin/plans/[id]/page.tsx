"use client";

import { use, useEffect, useState } from "react";
import PlanForm from "../PlanForm";
import { IconRefresh } from "@tabler/icons-react";

export default function PlanDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id === "new") return; // Handled by new/page.tsx now, but just in case
    
    async function fetchPlan() {
      try {
        const res = await fetch(`/api/admin/plans/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("nexus-token")}` },
        });
        if (!res.ok) throw new Error("Failed to load plan details");
        const data = await res.json();
        setPlan(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPlan();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-nexus-muted">
        <IconRefresh className="animate-spin text-nexus-primary" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-400">
        <h2 className="text-xl font-bold mb-2">Error Loading Plan</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="pt-6">
      <PlanForm mode="edit" initialData={plan} />
    </div>
  );
}
