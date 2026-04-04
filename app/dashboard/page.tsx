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

// Trigger icons and names
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
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual claim modal state
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimForm, setClaimForm] = useState({
    trigger_type: "rainfall" as TriggerType,
    duration_minutes: 60,
    description: "",
  });
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    const workerId = localStorage.getItem("workerId");
    const phone = localStorage.getItem("userPhone");

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
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSubmitClaim = async () => {
    if (!data?.worker) return;
    setClaimSubmitting(true);
    setClaimError(null);
    setClaimSuccess(null);

    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          worker_id: data.worker.id,
          trigger_type: claimForm.trigger_type,
          duration_minutes: claimForm.duration_minutes,
          description: claimForm.description || undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setClaimError(result.error || "Failed to file claim");
        return;
      }

      setClaimSuccess(`Claim filed successfully! Amount: ₹${result.claim.amount}`);
      setClaimForm({ trigger_type: "rainfall", duration_minutes: 60, description: "" });

      // Refresh dashboard data
      await fetchDashboardData();

      // Auto-close modal after 2 seconds
      setTimeout(() => {
        setShowClaimModal(false);
        setClaimSuccess(null);
      }, 2000);
    } catch {
      setClaimError("Network error. Please try again.");
    } finally {
      setClaimSubmitting(false);
    }
  };

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

  const { worker, subscription, planConfig, vehicle, zone, claims, payouts, weeklyStats } = data;

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
        <div className="mb-6">
          <Link
            href="/simulate"
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white hover:from-orange-600 hover:to-red-600 transition-all"
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">⚡</span>
              <div>
                <p className="font-semibold">Test Disruption Simulator</p>
                <p className="text-sm text-white/80">Trigger weather events and file claims</p>
              </div>
            </div>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Stats Grid - Weekly */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-500 dark:text-zinc-400 text-sm">This Week</span>
              <span className="text-2xl">📦</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">
              {weeklyStats?.total_deliveries || 0}
            </p>
            <p className="text-xs text-zinc-500">deliveries</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-500 dark:text-zinc-400 text-sm">Weekly Earnings</span>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">
              {formatCurrency(weeklyStats?.total_earnings || 0)}
            </p>
            <p className="text-xs text-zinc-500">from deliveries</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-500 dark:text-zinc-400 text-sm">Rating</span>
              <span className="text-2xl">⭐</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{weeklyStats?.avg_rating || 5.0}</p>
            <p className="text-xs text-zinc-500">avg score</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-500 dark:text-zinc-400 text-sm">Hours Active</span>
              <span className="text-2xl">⏱️</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">
              {weeklyStats?.active_hours || 0}h
            </p>
            <p className="text-xs text-zinc-500">this week</p>
          </div>
        </div>

        {/* Claims & Payouts */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Claims */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 dark:text-white">Recent Claims</h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-500">{claims.length} total</span>
                {subscription && (
                  <button
                    onClick={() => { setShowClaimModal(true); setClaimError(null); setClaimSuccess(null); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    File Claim
                  </button>
                )}
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

        {/* Plan Details */}
        {planConfig && (
          <div className="mt-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Plan Details</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Hourly Payout Rate</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">{formatCurrency(planConfig.hourly_payout)}/hr</p>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Max Hours/Day</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">{planConfig.max_hours_per_day} hours</p>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Waiting Period</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">{planConfig.waiting_period_minutes} mins</p>
              </div>
            </div>
          </div>
        )}

        {/* Vehicle & Account Info */}
        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Vehicle Info</h3>
            <div className="flex items-center">
              <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">
                  {vehicle?.vehicle_type === "bike" ? "🏍️" : vehicle?.vehicle_type === "scooter" ? "🛵" : "🚲"}
                </span>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-white capitalize">
                  {vehicle?.vehicle_type || "Not specified"}
                </p>
                {vehicle?.registration_number && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {vehicle.registration_number}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Payout Account</h3>
            <div className="flex items-center">
              <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">💳</span>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">UPI</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{worker.upi_id || "Not configured"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Manual Claim Modal */}
        {showClaimModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md shadow-xl">
              {/* Modal Header */}
              <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">File Manual Claim</h3>
                <button
                  onClick={() => setShowClaimModal(false)}
                  className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4">
                {/* Success Message */}
                {claimSuccess && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                    ✅ {claimSuccess}
                  </div>
                )}

                {/* Error Message */}
                {claimError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                    ⚠️ {claimError}
                  </div>
                )}

                {/* Trigger Type */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Disruption Type
                  </label>
                  <select
                    value={claimForm.trigger_type}
                    onChange={(e) => setClaimForm({ ...claimForm, trigger_type: e.target.value as TriggerType })}
                    className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.entries(TRIGGER_INFO).map(([key, info]) => (
                      <option key={key} value={key}>
                        {info.icon} {info.name}
                      </option>
                    ))}
                  </select>
                  {planConfig && !planConfig.triggers.includes(claimForm.trigger_type) && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      ⚠️ Not covered by your {planConfig.name} plan
                    </p>
                  )}
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Duration: {claimForm.duration_minutes} minutes
                  </label>
                  <input
                    type="range"
                    min={30}
                    max={480}
                    step={30}
                    value={claimForm.duration_minutes}
                    onChange={(e) => setClaimForm({ ...claimForm, duration_minutes: parseInt(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-zinc-400 mt-1">
                    <span>30 min</span>
                    <span>8 hrs</span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Description (optional)
                  </label>
                  <textarea
                    value={claimForm.description}
                    onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
                    placeholder="Describe what happened..."
                    rows={2}
                    className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Estimated Payout */}
                {planConfig && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700 dark:text-blue-400">Estimated Payout</span>
                      <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                        {formatCurrency(Math.round(planConfig.hourly_payout * (claimForm.duration_minutes / 60) * 100) / 100)}
                      </span>
                    </div>
                    <p className="text-xs text-blue-500 dark:text-blue-500 mt-1">
                      {formatCurrency(planConfig.hourly_payout)}/hr × {(claimForm.duration_minutes / 60).toFixed(1)} hrs
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 flex gap-3">
                <button
                  onClick={() => setShowClaimModal(false)}
                  className="flex-1 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitClaim}
                  disabled={claimSubmitting || !!claimSuccess}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                >
                  {claimSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Filing...
                    </span>
                  ) : (
                    "Submit Claim"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
