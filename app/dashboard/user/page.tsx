"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  Worker,
  InsuranceSubscription,
  Claim,
  Payout,
  DeliveryZone,
  WorkerVehicle,
  WorkerWeeklyStats,
  PlanTierConfig,
  TriggerType,
} from "@/lib/database.types";

const TRIGGER_INFO: Record<TriggerType, { name: string; icon: string }> = {
  rainfall: { name: "Heavy Rainfall", icon: "🌧️" },
  extreme_heat: { name: "Extreme Heat", icon: "🔥" },
  flood: { name: "Urban Flooding", icon: "🌊" },
  cold_fog: { name: "Dense Fog/Cold", icon: "🌫️" },
  civil_unrest: { name: "Civil Disruption", icon: "⚠️" },
  accident: { name: "Minor Accident", icon: "🚗" },
};

interface DashboardData {
  worker: Worker;
  subscription: InsuranceSubscription | null;
  planConfig: PlanTierConfig | null;
  vehicle: WorkerVehicle | null;
  zone: DeliveryZone | null;
  claims: Claim[];
  payouts: Payout[];
  weeklyStats: WorkerWeeklyStats | null;
  walletBalance: number;
}

export default function UserDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        const dashboardData = (await res.json()) as DashboardData;
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

  const { worker, subscription, planConfig, vehicle, zone, claims, payouts, weeklyStats, walletBalance } = data;

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

  const totalClaimsPaid = claims
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const weeklyClaimTotal = subscription?.weekly_claim_total || 0;
  const weeklyCap = planConfig?.weekly_cap || 0;
  const remainingCap = weeklyCap - weeklyClaimTotal;

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
                {worker.name.charAt(0)}
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
            Welcome back, {worker.name.split(" ")[0]}!
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

        {/* Insurance Status Card */}
        {subscription && planConfig ? (
          <div className={`bg-gradient-to-r ${getPlanColor(subscription.plan_tier)} rounded-2xl p-6 mb-6 text-white`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-white/70 text-sm">SwiftShield Insurance</p>
                <h2 className="text-2xl font-bold">{planConfig.name} Plan</h2>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${subscription.status === "active"
                  ? "bg-white/20 text-white"
                  : "bg-red-500 text-white"
                  }`}
              >
                {subscription.status.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-white/70 text-sm">Weekly Premium</p>
                <p className="text-xl font-semibold">{formatCurrency(planConfig.weekly_premium)}</p>
              </div>
              <div>
                <p className="text-white/70 text-sm">Weekly Cap</p>
                <p className="text-xl font-semibold">{formatCurrency(planConfig.weekly_cap)}</p>
              </div>
              <div>
                <p className="text-white/70 text-sm">Remaining This Week</p>
                <p className="text-xl font-semibold">{formatCurrency(remainingCap)}</p>
              </div>
              <div>
                <p className="text-white/70 text-sm">Total Claims Paid</p>
                <p className="text-xl font-semibold">{formatCurrency(totalClaimsPaid)}</p>
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

            {/* Covered Triggers */}
            <div>
              <p className="text-white/70 text-sm mb-2">Covered Events</p>
              <div className="flex flex-wrap gap-2">
                {planConfig.triggers.map((t) => (
                  <span key={t} className="inline-flex items-center px-2 py-1 bg-white/20 rounded-lg text-sm">
                    {TRIGGER_INFO[t]?.icon} {TRIGGER_INFO[t]?.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-200 dark:bg-zinc-800 rounded-2xl p-6 mb-6 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">No active insurance subscription</p>
            <Link href="/plans" className="text-blue-600 hover:underline mt-2 inline-block">
              View Plans
            </Link>
          </div>
        )}

        {/* Quick Action - Simulate Button */}
        {/* Removed disruption simulator as per requirements */}

        {/* Worker Info Card - UPI & Vehicle */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Your Profile</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {/* UPI Info */}
            <div className="flex items-start">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mr-4">
                <span className="text-2xl">💳</span>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">UPI ID</p>
                <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {worker.upi_id || "Not set"}
                </p>
                <p className="text-xs text-zinc-400">Payouts will be sent here</p>
              </div>
            </div>

            {/* Vehicle Info */}
            <div className="flex items-start">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mr-4">
                <span className="text-2xl">
                  {vehicle?.vehicle_type === "bike" ? "🏍️" : vehicle?.vehicle_type === "scooter" ? "🛵" : "🚲"}
                </span>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Vehicle</p>
                <p className="text-lg font-semibold text-zinc-900 dark:text-white capitalize">
                  {vehicle?.vehicle_type || "Not registered"}
                </p>
                {vehicle?.registration_number && (
                  <p className="text-xs text-zinc-400">{vehicle.registration_number}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Wallet Card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                <span className="text-2xl">👛</span>
              </div>
              <div>
                <p className="text-white/70 text-sm">SwiftShield Wallet</p>
                <p className="text-2xl font-bold">{formatCurrency(walletBalance)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-xs">Credit Balance</p>
              <p className="text-sm">Use for premiums</p>
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-white/80 text-xs">
              💡 Unused premium days are converted to wallet credit. Balance can be used for future premium payments only.
            </p>
          </div>
        </div>

        {/* Claims & Payouts */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Claims */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 dark:text-white">Recent Claims</h3>
              <span className="text-sm text-zinc-500">{claims.length} total</span>
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
    </div>
  );
}
