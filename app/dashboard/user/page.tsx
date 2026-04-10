"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  Worker,
  InsuranceSubscription,
  InsurancePlan,
  Claim,
  Payout,
  DeliveryZone,
  WorkerVehicle,
  WorkerWeeklyStats,
  TriggerType,
  Disruption,
} from "@/lib/database.types";

const TRIGGER_INFO: Record<TriggerType, { name: string; icon: string }> = {
  rainfall: { name: "Heavy Rainfall", icon: "🌧️" },
  extreme_heat: { name: "Extreme Heat", icon: "🔥" },
  flood: { name: "Urban Flooding", icon: "🌊" },
  cold_fog: { name: "Dense Fog/Cold", icon: "🌫️" },
  civil_unrest: { name: "Civil Disruption", icon: "⚠️" },
  platform_outage: { name: "Platform Outage", icon: "🔌" },
};

const TRIGGER_CODE: Record<TriggerType, string> = {
  rainfall: "T1",
  extreme_heat: "T2",
  flood: "T3",
  cold_fog: "T4",
  civil_unrest: "T5",
  platform_outage: "T6",
};

const PLAN_TRIGGER_OPTIONS: Record<string, TriggerType[]> = {
  starter: ["rainfall", "extreme_heat", "cold_fog"],
  shield: ["rainfall", "extreme_heat", "flood", "cold_fog", "civil_unrest"],
  pro: ["rainfall", "extreme_heat", "flood", "cold_fog", "civil_unrest", "platform_outage"],
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  medium: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  critical: "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300",
};

interface DashboardData {
  worker: Worker & { city?: string; upi_id?: string };
  subscription: InsuranceSubscription | null;
  workerInsurance?: {
    id: string;
    worker_id: string;
    plan: string;
    start_date: string;
    created_at: string;
  } | null;
  insurancePlan: InsurancePlan | null;
  vehicle: WorkerVehicle | null;
  zone: DeliveryZone | null;
  claims: Claim[];
  payouts: Payout[];
  weeklyStats: WorkerWeeklyStats | null;
  walletBalance: number;
  activeDisruption: Disruption | null;
  todayEarnings: number;
  predictedEarnings: number;
  pendingClaim: Claim | null;
}

export default function UserDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showManualClaimModal, setShowManualClaimModal] = useState(false);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  useEffect(() => {
    async function fetchDashboardData() {
      const workerId = localStorage.getItem("workerId");
      const phone = localStorage.getItem("userPhone");
      const role = localStorage.getItem("userRole");

      if (role !== "worker") {
        window.location.href = "/dashboard";
        return;
      }

      if (!workerId && !phone) {
        setError("Not logged in");
        setLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams();
        if (workerId) params.set("workerId", workerId);
        if (!workerId && phone) params.set("phone", phone);

        const res = await fetch(`/api/dashboard?${params.toString()}`);
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          setError(payload?.error || "Failed to load dashboard data");
          return;
        }

        const dashboardData = (await res.json()) as DashboardData & {
          activeDisruption: Disruption | null;
          todayEarnings: number;
          predictedEarnings: number;
          pendingClaim: Claim | null;
        };
        setData(dashboardData);
      } catch {
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
            {error || "Worker not found"}
          </h2>
          <Link href="/login" className="text-blue-600 hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const { 
    worker, 
    subscription, 
    workerInsurance, 
    insurancePlan, 
    vehicle, 
    zone, 
    claims, 
    payouts, 
    weeklyStats, 
    walletBalance,
    activeDisruption,
    todayEarnings: rawTodayEarnings,
    predictedEarnings: rawPredictedEarnings,
    pendingClaim
  } = data;

  // Apply defaults for earnings
  const todayEarnings = rawTodayEarnings ?? 0;
  const predictedEarnings = rawPredictedEarnings ?? 500;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      processing: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      expired: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
    };
    return colors[status] || colors.pending;
  };

  const getPlanColor = (tier: string) => {
    const colors: Record<string, string> = {
      starter: "from-blue-500 to-blue-600",
      shield: "from-emerald-500 to-emerald-600",
      pro: "from-purple-500 to-purple-600",
    };
    return colors[tier] || colors.starter;
  };

  const formatPlanName = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

  const totalClaimsPaid = claims
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const weeklyClaimTotal = subscription?.weekly_claim_total || 0;
  const weeklyCap = insurancePlan?.weekly_max_payout || 0;
  const remainingCap = weeklyCap - weeklyClaimTotal;
  const estimatedHourlyPayout = insurancePlan ? Math.max(1, Math.round(Number(insurancePlan.weekly_max_payout) / 10)) : 0;
  const selectedPlanKey = (insurancePlan?.name || "").toLowerCase();
  const allowedManualTriggers = PLAN_TRIGGER_OPTIONS[selectedPlanKey] || [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-xl flex items-center justify-center mr-3">
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
            <span className="text-xl font-bold text-zinc-900 dark:text-white">
              SwiftShield
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${worker.platform === "blinkit" ? "bg-yellow-400 text-zinc-900" : worker.platform === "instamart" ? "bg-orange-500" : "bg-purple-600"
                  }`}
              >
                {(worker.name || "W").charAt(0)}
              </div>
            </div>
            <button 
              onClick={() => {
                localStorage.clear();
                document.cookie = "user-role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
                window.location.href = "/login";
              }}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Welcome Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Welcome back, {(worker.name || "Worker").split(" ")[0]}!
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 flex items-center mt-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-2 ${worker.platform === "blinkit"
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                : worker.platform === "instamart"
                  ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                  : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                }`}
            >
              {worker.platform === "blinkit" ? "Blinkit" : worker.platform === "instamart" ? "Swiggy Instamart" : "Zepto"} Partner
            </span>
            <span>{zone?.name || "Unknown Zone"}, {zone?.city || worker.city}</span>
          </p>
        </div>

        {/* Live Disruption Alert */}
        {activeDisruption && (
          <div className="mb-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-4 text-white animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-3xl mr-3">{TRIGGER_INFO[activeDisruption.trigger_type]?.icon || "🚨"}</span>
                <div>
                  <h3 className="font-bold text-lg">🚨 LIVE DISRUPTION ACTIVE</h3>
                  <p className="text-white/90">
                    {TRIGGER_INFO[activeDisruption.trigger_type]?.name || activeDisruption.trigger_type} in {zone?.name || "your zone"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium bg-white/20`}>
                  {activeDisruption.severity?.toUpperCase() || "ACTIVE"}
                </span>
                <p className="text-xs mt-1 text-white/80">
                  Since {new Date(activeDisruption.start_time).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Insurance Status Card - AT TOP */}
        {insurancePlan ? (
          <div className={`bg-gradient-to-r ${getPlanColor(insurancePlan.name)} rounded-2xl p-6 mb-6 text-white`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-white/70 text-sm">
                  {subscription ? "SwiftShield Insurance" : "Selected Insurance Plan"}
                </p>
                <h2 className="text-2xl font-bold">{formatPlanName(insurancePlan.name)} Plan</h2>
              </div>
              <span
                className="px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white"
              >
                {subscription ? subscription.status.toUpperCase() : "SELECTED"}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-white/70 text-sm">Weekly Premium</p>
                <p className="text-xl font-semibold">{formatCurrency(insurancePlan.weekly_premium)}</p>
              </div>
              <div>
                <p className="text-white/70 text-sm">Weekly Max Payout</p>
                <p className="text-xl font-semibold">{formatCurrency(insurancePlan.weekly_max_payout)}</p>
              </div>
              <div>
                <p className="text-white/70 text-sm">Coverage</p>
                <p className="text-xl font-semibold">{insurancePlan.coverage_percentage}%</p>
              </div>
              <div>
                <p className="text-white/70 text-sm">Claim Wait</p>
                <p className="text-xl font-semibold">{insurancePlan.claim_wait_minutes} mins</p>
              </div>
            </div>

            {/* Progress bar for weekly usage */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-white/70 mb-1">
                <span>Weekly Usage</span>
                <span>{formatCurrency(weeklyClaimTotal)} / {formatCurrency(weeklyCap)}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white rounded-full h-2 transition-all"
                  style={{ width: `${weeklyCap > 0 ? (weeklyClaimTotal / weeklyCap) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {!subscription && workerInsurance && (
              <div className="mb-4 rounded-xl bg-white/10 p-3 text-sm text-white/90">
                Selected on {new Date(workerInsurance.start_date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-white/70 text-sm">Platform Outage</p>
                <p className="font-semibold">
                  {insurancePlan.includes_platform_outage ? "Included in coverage" : "Not included"}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-white/70 text-sm">Plan Summary</p>
                <p className="font-semibold">
                  {insurancePlan.description || "No description available for this plan."}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-200 dark:bg-zinc-800 rounded-2xl p-6 mb-6 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">No insurance plan selected</p>
            <Link href="/plans" className="text-blue-600 hover:underline mt-2 inline-block">
              View Plans
            </Link>
          </div>
        )}

        {/* Profile Card - with UPI inside */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center">
            <span className="text-xl mr-2">👤</span> Your Profile
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <span className="text-2xl mr-3">👤</span>
              <div>
                <p className="text-xs text-zinc-500">Name</p>
                <p className="font-medium text-zinc-900 dark:text-white">{worker.name || "Not set"}</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <span className="text-2xl mr-3">📱</span>
              <div>
                <p className="text-xs text-zinc-500">Platform</p>
                <p className="font-medium text-zinc-900 dark:text-white capitalize">{worker.platform}</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <span className="text-2xl mr-3">
                {vehicle?.vehicle_type === "bike" ? "🏍️" : vehicle?.vehicle_type === "scooter" ? "🛵" : "🚲"}
              </span>
              <div>
                <p className="text-xs text-zinc-500">Vehicle</p>
                <p className="font-medium text-zinc-900 dark:text-white capitalize">
                  {vehicle?.vehicle_type || "Not set"} {vehicle?.registration_number ? `(${vehicle.registration_number})` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <span className="text-2xl mr-3">📍</span>
              <div>
                <p className="text-xs text-zinc-500">Zone</p>
                <p className="font-medium text-zinc-900 dark:text-white">{zone?.name || "Unassigned"}, {zone?.city || worker.city}</p>
              </div>
            </div>
          </div>
          {/* UPI ID - Full width row */}
          <div className="flex items-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <span className="text-2xl mr-3">💳</span>
            <div>
              <p className="text-xs text-zinc-500">UPI ID for Payouts</p>
              <p className="font-medium text-zinc-900 dark:text-white">{worker.upi_id || "Not set"}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid - Below Profile */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Today's Earnings */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">📊</span>
              <span className="text-xs text-zinc-500">TODAY</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{formatCurrency(todayEarnings)}</p>
            <p className="text-xs text-zinc-500 mt-1">Actual Earnings</p>
          </div>

          {/* Predicted Earnings */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🎯</span>
              <span className="text-xs text-emerald-600">PREDICTED</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(predictedEarnings)}</p>
            <p className="text-xs text-zinc-500 mt-1">
              {todayEarnings >= predictedEarnings ? "✅ On Track" : `${Math.round((todayEarnings / predictedEarnings) * 100)}% of goal`}
            </p>
          </div>

          {/* Auto-Claim Status */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🤖</span>
              <span className="text-xs text-blue-600">AUTO-CLAIM</span>
            </div>
            {pendingClaim ? (
              <>
                <p className={`text-lg font-bold ${
                  pendingClaim.status === 'approved' ? 'text-emerald-600' : 
                  pendingClaim.status === 'pending' ? 'text-yellow-600' : 'text-blue-600'
                }`}>
                  {pendingClaim.status === 'approved' ? '✓ Approved' : 
                   pendingClaim.status === 'pending' ? '⏳ Processing' : '🔄 In Review'}
                </p>
                <p className="text-xs text-zinc-500 mt-1">{formatCurrency(Number(pendingClaim.amount))}</p>
              </>
            ) : activeDisruption && subscription ? (
              <>
                <p className="text-lg font-bold text-emerald-600">✓ Eligible</p>
                <p className="text-xs text-zinc-500 mt-1">Ready for claim</p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-zinc-400">—</p>
                <p className="text-xs text-zinc-500 mt-1">No active claim</p>
              </>
            )}
          </div>

          {/* Wallet Balance */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">💰</span>
              <span className="text-xs text-white/70">WALLET</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(walletBalance)}</p>
            <p className="text-xs text-white/70 mt-1">Credit Balance</p>
          </div>
        </div>

        {/* Claims & Payouts */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Claims */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 dark:text-white">Recent Claims</h3>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    if (!insurancePlan) {
                      alert("Warning: You don't have a selected insurance plan. Please choose a plan first.");
                    }
                    setShowManualClaimModal(true);
                  }}
                  className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                >
                  + Manual Claim
                </button>
                <span className="text-sm text-zinc-500">{claims.length} total</span>
              </div>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-80 overflow-y-auto">
              {claims.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">No claims yet</div>
              ) : (
                claims.slice(0, 5).map((claim) => {
                  const trigger = TRIGGER_INFO[claim.trigger_type];
                  return (
                    <div key={claim.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{trigger?.icon || "📋"}</span>
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-white">
                              {trigger?.name || claim.trigger_type}
                            </p>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                              {formatDate(claim.claim_date)} • {claim.duration_minutes || 0} mins
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-zinc-900 dark:text-white">
                            {formatCurrency(Number(claim.amount))}
                          </p>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                              claim.status
                            )}`}
                          >
                            {claim.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      {claim.status === "rejected" && claim.rejection_reason && (
                        <p className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                          {claim.rejection_reason}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Payouts */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 dark:text-white">Recent Payouts</h3>
              <span className="text-sm text-zinc-500">{payouts.length} total</span>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-80 overflow-y-auto">
              {payouts.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">No payouts yet</div>
              ) : (
                payouts.slice(0, 5).map((payout) => (
                  <div key={payout.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mr-3">
                        <svg
                          className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-white">
                          {payout.description || "Claim Payout"}
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {formatDate(payout.created_at)} • {worker.upi_id || "UPI"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(Number(payout.amount))}
                      </p>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                          payout.status
                        )}`}
                      >
                        {payout.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Manual Claim Modal */}
      {showManualClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-zinc-200 dark:border-zinc-800">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/50">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Submit Manual Claim</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Enter details for missed coverage</p>
              </div>
              <button 
                onClick={() => setShowManualClaimModal(false)}
                className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmittingClaim(true);
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                
                const claimDate = formData.get("claim_date") as string;
                const startTime = formData.get("start_time") as string;
                const endTime = formData.get("end_time") as string;
                const triggerType = formData.get("trigger_type") as TriggerType;
                const description = formData.get("description") as string;

                if (!allowedManualTriggers.includes(triggerType)) {
                  alert("Selected disruption type is not available for your current plan.");
                  setIsSubmittingClaim(false);
                  return;
                }
                
                // Calculate duration and amount
                const start = new Date(`${claimDate}T${startTime}`);
                const end = endTime ? new Date(`${claimDate}T${endTime}`) : new Date(start.getTime() + 60 * 60 * 1000);
                const durationMinutes = Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60)));
                const hourlyPayout = estimatedHourlyPayout;
                const amount = Math.round((durationMinutes / 60) * hourlyPayout);

                if (!insurancePlan) {
                  alert("Please select an insurance plan before filing a claim.");
                  setIsSubmittingClaim(false);
                  return;
                }

                try {
                  const res = await fetch("/api/claims", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      worker_id: worker.id,
                      subscription_id: subscription?.id,
                      worker_insurance_id: workerInsurance?.id,
                      trigger_type: triggerType,
                      claim_date: claimDate,
                      start_time: startTime,
                      end_time: endTime || null,
                      duration_minutes: durationMinutes,
                      amount: amount,
                      description: description,
                      zone_id: zone?.id
                    }),
                  });

                  const result = await res.json();
                  
                  if (!res.ok) {
                    alert(result.error || "Failed to submit claim");
                    console.error("Manual claim error details:", result.received);
                    return;
                  }

                  // Optimistically update the UI
                  setData(prev => prev ? {
                    ...prev,
                    claims: [result.claim, ...prev.claims],
                    walletBalance: prev.walletBalance + amount,
                    subscription: prev.subscription ? {
                      ...prev.subscription,
                      weekly_claim_total: (prev.subscription.weekly_claim_total || 0) + amount
                    } : null
                  } : null);
                  setShowManualClaimModal(false);
                  alert("Claim submitted successfully!");
                } catch (err) {
                  alert("Something went wrong");
                } finally {
                  setIsSubmittingClaim(false);
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  What happened?
                </label>
                <select 
                  name="trigger_type" 
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  {allowedManualTriggers.map((type) => {
                    const info = TRIGGER_INFO[type];
                    return (
                      <option key={type} value={type}>
                        {TRIGGER_CODE[type]} • {info.icon} {info.name}
                      </option>
                    );
                  })}
                </select>
                {insurancePlan ? (
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Allowed by your {formatPlanName(insurancePlan.name)} plan.
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Date of Event
                  </label>
                  <input 
                    type="date" 
                    name="claim_date" 
                    defaultValue={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Start Time
                  </label>
                  <input 
                    type="time" 
                    name="start_time" 
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    End Time (Approx)
                  </label>
                  <input 
                    type="time" 
                    name="end_time" 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Additional Details
                </label>
                <textarea 
                  name="description" 
                  rows={3}
                  placeholder="Tell us what happened..."
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                ></textarea>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={isSubmittingClaim}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                >
                  {isSubmittingClaim ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    "Submit Manual Claim"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
