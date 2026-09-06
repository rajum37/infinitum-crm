"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { IconCheck, IconBuildingSkyscraper, IconArrowRight, IconBolt, IconTag } from "@tabler/icons-react";
import { getPriceDisplayInfo, intervalToggleLabel } from "@/lib/pricing";

export default function LandingPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<string>("MONTH");
  const [availableIntervals, setAvailableIntervals] = useState<string[]>(["MONTH"]);
  const hasFetched = React.useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    async function fetchPlans() {
      try {
        const res = await fetch("/api/public/plans");
        if (res.ok) {
          const data = await res.json();
          setPlans(data);

          // Determine available intervals from prices (not from plan.billingInterval)
          const intervals = new Set<string>();
          data.forEach((p: any) => {
            p.prices?.forEach((price: any) => intervals.add(price.billingInterval));
          });

          const order = ["MONTH", "QUARTER", "HALF_YEAR", "YEAR"];
          const sorted = order.filter((i) => intervals.has(i));
          if (sorted.length > 0) {
            setAvailableIntervals(sorted);
            setBillingInterval(sorted[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch public plans:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  return (
    <div className="min-h-screen bg-nexus-bg text-nexus-text font-sans selection:bg-nexus-primary/30">
      {/* Navigation */}
      <nav className="border-b border-[#151B2C] bg-nexus-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-nexus-primary/10 border border-nexus-primary/20 text-nexus-primary flex items-center justify-center">
                <IconBuildingSkyscraper size={20} />
              </div>
              <span className="text-xl font-extrabold tracking-tight">Infinity Vibez</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium text-nexus-text-secondary hover:text-white transition-colors">
                Login
              </Link>
              <Link
                href="/signup"
                className="text-sm font-semibold bg-nexus-primary text-white px-4 py-2 rounded-lg hover:bg-nexus-primary/90 transition-colors shadow-lg shadow-nexus-primary/20"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nexus-primary/10 text-nexus-primary text-xs font-semibold uppercase tracking-wider mb-8 border border-nexus-primary/20">
          <IconBolt size={14} />
          The future of CRM
        </div>
        <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-nexus-text-secondary mb-6 leading-tight">
          Supercharge your <br /> sales pipeline.
        </h1>
        <p className="text-lg lg:text-xl text-nexus-text-secondary max-w-2xl mb-10">
          Infinity Vibez is the modern CRM platform designed for high-performing sales teams. Manage leads, track deals, and close more revenue.
        </p>

        {/* Plans Section */}
        <div className="w-full mt-16" id="pricing">
          <h2 className="text-3xl font-bold mb-3">Choose your plan</h2>
          <p className="text-nexus-text-secondary mb-10">No hidden fees. Switch anytime.</p>

          {/* Billing Toggle */}
          {!loading && availableIntervals.length > 1 && (
            <div className="flex justify-center mb-12">
              <div className="bg-[#151B2C] p-1 rounded-xl inline-flex gap-0.5">
                {availableIntervals.map((interval) => (
                  <button
                    key={interval}
                    onClick={() => setBillingInterval(interval)}
                    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                      billingInterval === interval
                        ? "bg-nexus-primary text-white shadow-md"
                        : "text-nexus-text-secondary hover:text-white"
                    }`}
                  >
                    {intervalToggleLabel(interval)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-nexus-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
              {plans.map((plan) => {
                // SOURCE OF TRUTH: activePrice comes from plan.prices[], NEVER from plan.basePrice
                const activePrice =
                  plan.prices?.find((p: any) => p.billingInterval === billingInterval && p.isActive) ||
                  plan.prices?.find((p: any) => p.billingInterval === billingInterval) ||
                  plan.prices?.[0];

                if (!activePrice) return null;

                const priceInfo = getPriceDisplayInfo(activePrice);

                return (
                  <div
                    key={plan.id}
                    className="bg-[#0B0F19] border border-[#151B2C] rounded-2xl p-8 shadow-xl flex flex-col relative overflow-hidden group hover:border-nexus-primary/40 transition-colors"
                  >
                    {plan.isDefault && (
                      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-nexus-primary to-blue-500" />
                    )}

                    {/* Savings badge — top right */}
                    {priceInfo.hasDiscount && priceInfo.savingsPercent !== null && (
                      <div className="absolute top-4 right-4 flex items-center gap-1 bg-green-500/15 border border-green-500/25 text-green-400 text-xs font-bold px-2.5 py-1 rounded-full">
                        <IconTag size={12} />
                        Save {priceInfo.savingsPercent}%
                      </div>
                    )}

                    <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                    <p className="text-sm text-nexus-text-secondary h-10">{plan.description}</p>

                    {/* Price block */}
                    <div className="my-6 space-y-1">
                      {/* Strike-through original price */}
                      {priceInfo.hasDiscount && priceInfo.formattedOriginalAmount && (
                        <div className="text-nexus-text-secondary text-base line-through decoration-red-400/70">
                          {priceInfo.formattedOriginalAmount}
                        </div>
                      )}

                      {/* Current price — dominant */}
                      <div className="flex items-end gap-1.5">
                        <span className="text-4xl font-extrabold text-white">{priceInfo.formattedAmount}</span>
                        <span className="text-nexus-text-secondary text-sm mb-1.5">/ {priceInfo.intervalLabel}</span>
                      </div>
                    </div>

                    <Link
                      href={`/signup?planId=${plan.id}&planPriceId=${activePrice.id}`}
                      className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                        plan.isDefault
                          ? "bg-nexus-primary text-white hover:bg-nexus-primary/90 shadow-lg shadow-nexus-primary/20"
                          : "bg-[#151B2C] text-white hover:bg-[#1A2235]"
                      }`}
                    >
                      Get Started <IconArrowRight size={18} />
                    </Link>

                    <div className="mt-8 space-y-4 flex-1">
                      <p className="text-xs font-semibold text-nexus-text-secondary uppercase tracking-wider">Features included:</p>
                      {plan.features?.map((pf: any) => (
                        <div key={pf.id} className="flex items-start gap-3">
                          <IconCheck size={18} className="text-nexus-primary shrink-0 mt-0.5" />
                          <span className="text-sm text-nexus-text">{pf.feature?.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#151B2C] py-8 text-center text-sm text-nexus-text-secondary mt-20">
        &copy; {new Date().getFullYear()} Infinity Vibez. All rights reserved.
      </footer>
    </div>
  );
}
