"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { 
  Worker, 
  Claim, 
  DeliveryZone, 
  AuditLog,
  Disruption,
  Payout,
  TriggerType,
} from "@/lib/database.types";

const TRIGGER_INFO: Record<TriggerType, { name: string; icon: string }> = {
  rainfall: { name: "Heavy Rainfall", icon: "🌧️" },
  extreme_heat: { name: "Extreme Heat", icon: "🔥" },
  flood: { name: "Urban Flooding", icon: "🌊" },
  cold_fog: { name: "Dense Fog/Cold", icon: "🌫️" },
  civil_unrest: { name: "Civil Disruption", icon: "⚠️" },
  platform_outage: { name: "Platform Outage", icon: "🔌" },
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-yellow-100 text-yellow-700",
  medium: "bg-orange-100 text-orange-700",
  high: "bg-red-100 text-red-700",
  critical: "bg-red-200 text-red-800 animate-pulse",
};

interface ZonalDashboardData {
  admin: Worker;
  zone: DeliveryZone | null;
  pendingClaims: Claim[];
  approvedClaims: Claim[];
  rejectedClaims: Claim[];
  flaggedClaims: (Claim & { fraud_score?: number; anomaly_score?: number })[];
  activeWorkers: { count: number; online: number; offline: number };
  activeDisruptions: Disruption[];
  payoutsInProgress: Payout[];
  zoneMetrics: {
    totalClaims: number;
    approvedClaims: number;
    rejectedClaims: number;
    totalPayouts: number;
    lossRatio: number;
    avgClaimAmount: number;
  };
}

export default function ZonalDashboardPage() {
  const [data, setData] = useState<ZonalDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");

  useEffect(() => {
    async function fetchZonalData() {
      const adminId = localStorage.getItem("userId"); // Logic in LoginPage stores admin user id in userId
      const role = localStorage.getItem("userRole");

      if (role !== "zonal_admin") {
        window.location.href = "/dashboard";
        return;
      }

      if (!adminId) {
        setError("Not logged in");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/admin/zonal-stats?adminId=${adminId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch zonal data");
        }
        const zonalData = await res.json();
        setData(zonalData);
      } catch (err) {
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchZonalData();
  }, []);

  const handleClaimAction = async (claimId: string, status: "approved" | "rejected", reason?: string) => {
    const adminId = localStorage.getItem("userId");
    if (!adminId) return;

    try {
      const res = await fetch("/api/admin/approve-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim_id: claimId,
          status,
          admin_id: adminId,
          reason
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || `Failed to ${status} claim`);
        return;
      }

      // Refresh data
      const statsRes = await fetch(`/api/admin/zonal-stats?adminId=${adminId}`);
      if (statsRes.ok) {
        setData(await statsRes.json());
      }
      alert(`Claim ${status} successfully`);
    } catch (err) {
      alert("Something went wrong");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const currentClaims = activeTab === "pending" ? data?.pendingClaims : 
                        activeTab === "approved" ? data?.approvedClaims : data?.rejectedClaims;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">📍</span>
            </div>
            <div>
              <span className="text-xl font-bold text-amber-600">Zonal Hub</span>
              <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full font-medium">ADMIN</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
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
        {/* Zone Overview Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center">
                📍 Zone: {data?.zone?.name || "Global View"}
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                {data?.zone?.city || "All Cities"} • Regional Claim Management & Oversight
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">Risk Score:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                (data?.zone as any)?.risk_score > 70 ? "bg-red-100 text-red-700" :
                (data?.zone as any)?.risk_score > 40 ? "bg-yellow-100 text-yellow-700" :
                "bg-green-100 text-green-700"
              }`}>
                {(data?.zone as any)?.risk_score || 0}/100
              </span>
            </div>
          </div>
        </div>

        {/* Live Disruptions Alert */}
        {data?.activeDisruptions && data.activeDisruptions.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-4 text-white">
            <h3 className="font-bold text-lg mb-3 flex items-center">
              🚨 Live Disruptions in Zone ({data.activeDisruptions.length})
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.activeDisruptions.map(d => (
                <div key={d.id} className="bg-white/10 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{(TRIGGER_INFO[(d as any).trigger_type as TriggerType] || TRIGGER_INFO.rainfall).icon}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold bg-white/20`}>
                      {(d as any).severity?.toUpperCase()}
                    </span>
                  </div>
                  <p className="font-medium mt-1">{(TRIGGER_INFO[(d as any).trigger_type as TriggerType] || TRIGGER_INFO.rainfall).name}</p>
                  <p className="text-xs text-white/70">Since {new Date((d as any).start_time).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          {/* Active Workers */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">👷</span>
              <span className="text-xs text-zinc-500">WORKERS</span>
            </div>
            <p className="text-3xl font-bold text-blue-600">{data?.activeWorkers.count || 0}</p>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="flex items-center text-emerald-600">
                <span className="w-2 h-2 bg-emerald-500 rounded-full mr-1 animate-pulse"></span>
                {data?.activeWorkers.online || 0} online
              </span>
              <span className="text-zinc-400">{data?.activeWorkers.offline || 0} offline</span>
            </div>
          </div>

          {/* Pending Claims */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🧾</span>
              <span className="text-xs text-amber-600">PENDING</span>
            </div>
            <p className="text-3xl font-bold text-amber-600">{data?.pendingClaims.length || 0}</p>
            <p className="text-xs text-zinc-500 mt-2">Awaiting review</p>
          </div>

          {/* Payouts in Progress */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">💸</span>
              <span className="text-xs text-emerald-600">PAYOUTS</span>
            </div>
            <p className="text-3xl font-bold text-emerald-600">{formatCurrency(data?.zoneMetrics.totalPayouts || 0)}</p>
            <p className="text-xs text-zinc-500 mt-2">{data?.payoutsInProgress.length || 0} processing</p>
          </div>

          {/* Zone Metrics */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">📊</span>
              <span className="text-xs text-purple-600">METRICS</span>
            </div>
            <p className="text-3xl font-bold text-purple-600">{data?.zoneMetrics.lossRatio || 0}%</p>
            <p className="text-xs text-zinc-500 mt-2">Loss Ratio</p>
          </div>
        </div>

        {/* Flagged Claims Alert */}
        {data?.flaggedClaims && data.flaggedClaims.length > 0 && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
            <h3 className="font-bold text-red-700 dark:text-red-400 mb-3 flex items-center">
              🛡 Flagged/Suspicious Claims ({data.flaggedClaims.length})
            </h3>
            <div className="space-y-2">
              {data.flaggedClaims.map(claim => (
                <div key={claim.id} className="bg-white dark:bg-zinc-900 rounded-lg p-3 flex items-center justify-between border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{(TRIGGER_INFO[claim.trigger_type as TriggerType] || TRIGGER_INFO.rainfall).icon}</span>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">Worker #{claim.worker_id?.slice(0, 8)}</p>
                      <p className="text-xs text-zinc-500">{formatCurrency(Number(claim.amount))} • {(TRIGGER_INFO[claim.trigger_type as TriggerType] || TRIGGER_INFO.rainfall).name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-red-600 font-medium">Fraud Score: {claim.fraud_score || 0}</p>
                      <p className="text-xs text-orange-600">ML Anomaly: {((claim.anomaly_score || 0) * 100).toFixed(0)}%</p>
                    </div>
                    <button className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700">Investigate</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Claims Management */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-6">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-zinc-900 dark:text-white flex items-center">
                🧾 Zone Claims Management
              </h2>
              <div className="flex gap-1 bg-zinc-200 dark:bg-zinc-700 p-1 rounded-lg">
                <button 
                  onClick={() => setActiveTab("pending")}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${activeTab === "pending" ? "bg-amber-500 text-white" : "text-zinc-600 dark:text-zinc-400"}`}
                >
                  Pending ({data?.pendingClaims.length || 0})
                </button>
                <button 
                  onClick={() => setActiveTab("approved")}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${activeTab === "approved" ? "bg-emerald-500 text-white" : "text-zinc-600 dark:text-zinc-400"}`}
                >
                  Approved ({data?.approvedClaims.length || 0})
                </button>
                <button 
                  onClick={() => setActiveTab("rejected")}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${activeTab === "rejected" ? "bg-red-500 text-white" : "text-zinc-600 dark:text-zinc-400"}`}
                >
                  Rejected ({data?.rejectedClaims.length || 0})
                </button>
              </div>
            </div>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-96 overflow-y-auto">
            {currentClaims?.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">No {activeTab} claims</div>
            ) : (
              currentClaims?.map(claim => (
                <div key={claim.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                      activeTab === "approved" ? "bg-emerald-100" : 
                      activeTab === "rejected" ? "bg-red-100" : "bg-amber-100"
                    }`}>
                      {(TRIGGER_INFO[claim.trigger_type as TriggerType] || TRIGGER_INFO.rainfall).icon}
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">Worker #{claim.worker_id?.slice(0, 8) || "N/A"}</p>
                      <p className="text-xs text-zinc-500">
                        {(TRIGGER_INFO[claim.trigger_type as TriggerType] || TRIGGER_INFO.rainfall).name} • {new Date((claim.claim_time || (claim as any).claim_date)).toLocaleString()}
                        {claim.duration_minutes && ` • ${claim.duration_minutes} mins`}
                      </p>
                      {claim.rejection_reason && (
                        <p className="text-xs text-red-500 mt-1">❌ {claim.rejection_reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-zinc-900 dark:text-white">{formatCurrency(Number(claim.amount))}</span>
                    {activeTab === "pending" && (
                      <>
                        <button 
                          onClick={() => handleClaimAction(claim.id, "approved")}
                          className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => {
                            const reason = prompt("Enter rejection reason:");
                            if (reason !== null) handleClaimAction(claim.id, "rejected", reason);
                          }}
                          className="px-3 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700"
                        >
                          Deny
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Zone Performance Metrics */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Payouts in Progress */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center">
                💸 Payouts in Progress
              </h3>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-64 overflow-y-auto">
              {data?.payoutsInProgress.length === 0 ? (
                <div className="p-6 text-center text-zinc-500">No payouts processing</div>
              ) : (
                data?.payoutsInProgress.map(payout => (
                  <div key={payout.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">⏳</span>
                      <span className="text-sm text-zinc-900 dark:text-white">Worker #{payout.worker_id?.slice(0, 8)}</span>
                    </div>
                    <span className="font-medium text-emerald-600">{formatCurrency(Number(payout.amount))}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Zone Stats Summary */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center">
              📊 Zone Performance
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-zinc-600 dark:text-zinc-400">Total Claims</span>
                <span className="font-bold text-zinc-900 dark:text-white">{data?.zoneMetrics.totalClaims || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-600 dark:text-zinc-400">Approval Rate</span>
                <span className="font-bold text-emerald-600">
                  {data?.zoneMetrics.totalClaims ? Math.round((data.zoneMetrics.approvedClaims / data.zoneMetrics.totalClaims) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-600 dark:text-zinc-400">Avg. Claim Amount</span>
                <span className="font-bold text-zinc-900 dark:text-white">{formatCurrency(data?.zoneMetrics.avgClaimAmount || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-600 dark:text-zinc-400">Loss Ratio</span>
                <span className={`font-bold ${(data?.zoneMetrics.lossRatio || 0) > 80 ? "text-red-600" : "text-emerald-600"}`}>
                  {data?.zoneMetrics.lossRatio || 0}%
                </span>
              </div>
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600 dark:text-zinc-400">Total Payouts</span>
                  <span className="font-bold text-lg text-blue-600">{formatCurrency(data?.zoneMetrics.totalPayouts || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
