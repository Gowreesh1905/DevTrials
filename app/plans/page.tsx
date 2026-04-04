"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface PlanFeature {
  label: string;
  starter: string | boolean;
  shield: string | boolean;
  pro: string | boolean;
}

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    icon: "🟢",
    price: 29,
    color: "from-emerald-500 to-teal-600",
    borderColor: "border-emerald-500/30",
    glowColor: "shadow-emerald-500/10",
    badgeColor: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    popular: false,
    tagline: "Basic Protection",
    coverage: "50%",
    dailyCap: 500,
    weeklyCap: 1500,
    triggers: ["Rain", "Heat"],
    claimWait: "2 hrs",
  },
  {
    id: "shield",
    name: "Shield",
    icon: "🔵",
    price: 59,
    color: "from-blue-500 to-indigo-600",
    borderColor: "border-blue-500/30",
    glowColor: "shadow-blue-500/20",
    badgeColor: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
    popular: true,
    tagline: "Most Popular",
    coverage: "70%",
    dailyCap: 1200,
    weeklyCap: 3600,
    triggers: ["Weather", "Curfew"],
    claimWait: "1 hr",
  },
  {
    id: "pro",
    name: "Pro",
    icon: "🟣",
    price: 99,
    color: "from-purple-500 to-violet-600",
    borderColor: "border-purple-500/30",
    glowColor: "shadow-purple-500/10",
    badgeColor: "bg-purple-500/10 text-purple-400 ring-purple-500/20",
    popular: false,
    tagline: "Maximum Coverage",
    coverage: "90%",
    dailyCap: 2000,
    weeklyCap: 6000,
    triggers: ["All", "Platform Outage"],
    claimWait: "30 min",
  },
];

const COMPARISON_FEATURES: PlanFeature[] = [
  { label: "Weekly Premium", starter: "₹29", shield: "₹59", pro: "₹99" },
  { label: "Income Coverage", starter: "50%", shield: "70%", pro: "90%" },
  { label: "Daily Cap", starter: "₹500", shield: "₹1,200", pro: "₹2,000" },
  {
    label: "Weekly Max",
    starter: "₹1,500",
    shield: "₹3,600",
    pro: "₹6,000",
  },
  {
    label: "Triggers",
    starter: "Rain · Heat",
    shield: "Weather · Curfew",
    pro: "All + Platform Outage",
  },
  { label: "Claim Wait", starter: "2 hrs", shield: "1 hr", pro: "30 min" },
  {
    label: "AI Risk Assessment",
    starter: true,
    shield: true,
    pro: true,
  },
  {
    label: "Auto Claim Detection",
    starter: true,
    shield: true,
    pro: true,
  },
  {
    label: "UPI Instant Payout",
    starter: true,
    shield: true,
    pro: true,
  },
  {
    label: "Platform Outage Cover",
    starter: false,
    shield: false,
    pro: true,
  },
  {
    label: "Priority Support",
    starter: false,
    shield: true,
    pro: true,
  },
  {
    label: "Wallet Credit on Pause",
    starter: false,
    shield: true,
    pro: true,
  },
];

export default function PlansPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [workerInfo, setWorkerInfo] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cancelled") === "true") {
      setCancelled(true);
      setTimeout(() => setCancelled(false), 5000);
    }

    const workerId = localStorage.getItem("workerId") || "";
    const name = localStorage.getItem("workerName") || "";
    const phone = localStorage.getItem("userPhone") || "";
    if (workerId) {
      setWorkerInfo({ id: workerId, name, phone });
    }
  }, []);

  const handleSubscribe = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          workerId: workerInfo?.id || "",
          workerName: workerInfo?.name || "",
          workerPhone: workerInfo?.phone || "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: unknown) {
      console.error("Checkout error:", err);
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      alert(message);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/3 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard/user" className="flex items-center group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-xl flex items-center justify-center mr-3 group-hover:scale-105 transition-transform">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">SwiftShield</span>
          </Link>
          <Link
            href="/dashboard/user"
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Cancelled Banner */}
      {cancelled && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <p className="text-yellow-400 text-sm">
              Payment was cancelled. Feel free to try again when you&apos;re
              ready!
            </p>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-12 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-medium mb-6">
            <span className="mr-2">🛡️</span> Insurance Plans
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Choose Your{" "}
            <span className="bg-gradient-to-r from-blue-400 via-emerald-400 to-purple-400 bg-clip-text text-transparent">
              Protection Plan
            </span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            AI-powered parametric income protection for Q-commerce delivery
            workers. Instant payouts. Zero paperwork.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border ${plan.borderColor} bg-zinc-900/60 backdrop-blur-sm p-6 flex flex-col transition-all duration-300 hover:scale-[1.02] hover:${plan.glowColor} hover:shadow-2xl ${
                plan.popular
                  ? "ring-2 ring-blue-500/40 shadow-xl shadow-blue-500/10"
                  : ""
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold rounded-full shadow-lg shadow-blue-500/30">
                    ⭐ MOST POPULAR
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6 pt-2">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{plan.icon}</span>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-zinc-500">{plan.tagline}</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-white">
                    ₹{plan.price}
                  </span>
                  <span className="text-zinc-500 text-sm">/week</span>
                </div>
              </div>

              {/* Income Coverage Badge */}
              <div
                className={`inline-flex items-center self-start px-3 py-1.5 rounded-lg ring-1 ${plan.badgeColor} text-sm font-medium mb-6`}
              >
                {plan.coverage} Income Coverage
              </div>

              {/* Features List */}
              <div className="space-y-3 mb-8 flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-3 h-3 text-emerald-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                  </div>
                  <span className="text-zinc-300 text-sm">
                    Daily cap:{" "}
                    <span className="text-white font-medium">
                      ₹{plan.dailyCap.toLocaleString()}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-3 h-3 text-emerald-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                  </div>
                  <span className="text-zinc-300 text-sm">
                    Weekly max:{" "}
                    <span className="text-white font-medium">
                      ₹{plan.weeklyCap.toLocaleString()}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-3 h-3 text-emerald-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                  </div>
                  <span className="text-zinc-300 text-sm">
                    Triggers:{" "}
                    <span className="text-white font-medium">
                      {plan.triggers.join(" · ")}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-3 h-3 text-emerald-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                  </div>
                  <span className="text-zinc-300 text-sm">
                    Claim wait:{" "}
                    <span className="text-white font-medium">
                      {plan.claimWait}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-3 h-3 text-emerald-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                  </div>
                  <span className="text-zinc-300 text-sm">
                    Instant UPI payouts
                  </span>
                </div>
                {plan.id === "pro" && (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-3 h-3 text-purple-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <span className="text-purple-300 text-sm font-medium">
                      Platform outage coverage
                    </span>
                  </div>
                )}
              </div>

              {/* Subscribe Button */}
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loadingPlan !== null}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                  plan.popular
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/25 active:scale-[0.98]"
                    : `bg-gradient-to-r ${plan.color} text-white hover:opacity-90 active:scale-[0.98]`
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100`}
              >
                {loadingPlan === plan.id ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Subscribe — ₹{plan.price}/week
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white mb-2">
              Compare Plans
            </h2>
            <p className="text-zinc-400">
              Side-by-side comparison of all features
            </p>
          </div>

          <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-4 px-6 text-zinc-400 font-medium text-sm w-1/4">
                      Feature
                    </th>
                    <th className="text-center py-4 px-6 w-1/4">
                      <div className="flex items-center justify-center gap-2">
                        <span>🟢</span>
                        <span className="text-white font-semibold">
                          Starter
                        </span>
                      </div>
                    </th>
                    <th className="text-center py-4 px-6 w-1/4 bg-blue-500/5">
                      <div className="flex items-center justify-center gap-2">
                        <span>🔵</span>
                        <span className="text-white font-semibold">Shield</span>
                      </div>
                    </th>
                    <th className="text-center py-4 px-6 w-1/4">
                      <div className="flex items-center justify-center gap-2">
                        <span>🟣</span>
                        <span className="text-white font-semibold">Pro</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_FEATURES.map((feature, idx) => (
                    <tr
                      key={feature.label}
                      className={`border-b border-zinc-800/50 ${
                        idx % 2 === 0 ? "" : "bg-zinc-800/10"
                      }`}
                    >
                      <td className="py-3.5 px-6 text-zinc-300 text-sm font-medium">
                        {feature.label}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        {typeof feature.starter === "boolean" ? (
                          feature.starter ? (
                            <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-emerald-500/20">
                              <svg
                                className="w-3.5 h-3.5 text-emerald-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                              </svg>
                            </span>
                          ) : (
                            <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-zinc-800">
                              <svg
                                className="w-3.5 h-3.5 text-zinc-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                              </svg>
                            </span>
                          )
                        ) : (
                          <span className="text-zinc-300 text-sm">
                            {feature.starter}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-center bg-blue-500/5">
                        {typeof feature.shield === "boolean" ? (
                          feature.shield ? (
                            <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-emerald-500/20">
                              <svg
                                className="w-3.5 h-3.5 text-emerald-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                              </svg>
                            </span>
                          ) : (
                            <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-zinc-800">
                              <svg
                                className="w-3.5 h-3.5 text-zinc-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                              </svg>
                            </span>
                          )
                        ) : (
                          <span className="text-zinc-300 text-sm font-medium">
                            {feature.shield}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        {typeof feature.pro === "boolean" ? (
                          feature.pro ? (
                            <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-emerald-500/20">
                              <svg
                                className="w-3.5 h-3.5 text-emerald-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                              </svg>
                            </span>
                          ) : (
                            <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-zinc-800">
                              <svg
                                className="w-3.5 h-3.5 text-zinc-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                              </svg>
                            </span>
                          )
                        ) : (
                          <span className="text-zinc-300 text-sm">
                            {feature.pro}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white mb-2">How It Works</h2>
            <p className="text-zinc-400">
              From subscription to instant payout in 3 simple steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">1️⃣</span>
              </div>
              <h3 className="text-white font-semibold mb-2">Choose a Plan</h3>
              <p className="text-zinc-400 text-sm">
                Select the coverage that fits your delivery schedule and risk
                profile.
              </p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">2️⃣</span>
              </div>
              <h3 className="text-white font-semibold mb-2">Stay Protected</h3>
              <p className="text-zinc-400 text-sm">
                Our AI monitors weather, curfews, and disruptions in your zone
                24/7.
              </p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">3️⃣</span>
              </div>
              <h3 className="text-white font-semibold mb-2">Get Paid</h3>
              <p className="text-zinc-400 text-sm">
                Automatic payout via UPI within 30 minutes of a verified
                disruption.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white mb-2">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "Can I change my plan later?",
                a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect from the next weekly cycle. Unused premium is credited to your wallet.",
              },
              {
                q: "How are payouts calculated?",
                a: "Payouts are based on your average daily earnings, disruption duration, and your plan's coverage percentage. Our AI dynamically adjusts for time-slot demand and zone activity.",
              },
              {
                q: "What if I want to pause my coverage?",
                a: "You can pause anytime (except during an active claim window). Unused premium days are automatically converted to wallet credits that can be applied to future premiums.",
              },
              {
                q: "Is there a waiting period?",
                a: "No long waiting periods! Coverage begins immediately after your first premium payment. Each plan has a short claim processing wait time (30 min to 2 hours depending on your plan).",
              },
            ].map((faq) => (
              <div
                key={faq.q}
                className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5"
              >
                <h3 className="text-white font-medium mb-2">{faq.q}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Security Footer */}
        <div className="text-center pb-8">
          <div className="flex items-center justify-center gap-6 text-zinc-500 text-sm mb-4">
            <span className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Secure Payments via Stripe
            </span>
            <span className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              256-bit SSL Encryption
            </span>
            <span className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              All Major Cards Accepted
            </span>
          </div>
          <p className="text-zinc-600 text-xs">
            SwiftShield © 2026 • All rights reserved • Built for India&apos;s
            gig workforce
          </p>
        </div>
      </main>
    </div>
  );
}
