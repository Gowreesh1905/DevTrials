"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { 
  Worker, 
  AuditLog, 
  Claim,
  Disruption,
  DeliveryZone,
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

interface ControlDashboardData {
  admin: { id: string; user_id: string; role: string };
  globalStats: {
    total_workers: number;
    total_claims: number;
    total_payouts: number;
    active_subscriptions: number;
    avg_fraud_score: number;
    pending_claims: number;
    approved_claims: number;
    rejected_claims: number;
  };
  zones: (DeliveryZone & { worker_count?: number; claim_count?: number })[];
  activeDisruptions: Disruption[];
  recentClaims: Claim[];
  highRiskWorkers: (Worker & { claim_count?: number })[];
  flaggedClaims: (Claim & { fraud_score?: number; anomaly_score?: number })[];
  payoutMetrics: {
    total: number;
    processing: number;
    completed: number;
    failed: number;
  };
  systemMetrics: {
    claimTrend: number;
    automationRate: number;
  };
  recentLogs: AuditLog[];
  systemStatus: {
    status: "healthy" | "degraded" | "outage";
    uptime: string;
  };
  planPricing?: {
    starter: number;
    shield: number;
    pro: number;
  };
}

export default function ControlDashboardPage() {
  const [data, setData] = useState<ControlDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"overview" | "claims" | "fraud" | "zones">("overview");
  
  // Insurance tier pricing state
  const [tierPrices, setTierPrices] = useState({
    starter: 29,
    shield: 59,
    pro: 99,
  });
  const [editingPrices, setEditingPrices] = useState(false);
  const [tempPrices, setTempPrices] = useState({ ...tierPrices });
  const [priceUpdateStatus, setPriceUpdateStatus] = useState<string | null>(null);
  const [savingPrices, setSavingPrices] = useState(false);

  useEffect(() => {
    async function fetchControlData() {
      const userId = localStorage.getItem("userId");
      const role = localStorage.getItem("userRole");

      if (role !== "control_admin") {
        window.location.href = "/dashboard";
        return;
      }

      if (!userId) {
        setError("Not logged in");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/admin/control-stats?adminId=${userId}`);
        if (!res.ok) {
          const payload = await res.json();
          throw new Error(payload.error || "Failed to fetch control data");
        }
        const controlData = (await res.json()) as ControlDashboardData;
        setData(controlData);
        if (controlData.planPricing) {
          setTierPrices(controlData.planPricing);
          setTempPrices(controlData.planPricing);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load control dashboard data");
      } finally {
        setLoading(false);
      }
    }

    fetchControlData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSavePrices = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setPriceUpdateStatus("Unable to update pricing: admin session not found.");
      return;
    }

    setSavingPrices(true);
    setPriceUpdateStatus(null);

    try {
      const res = await fetch("/api/admin/update-plan-pricing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminId: userId,
          planPricing: tempPrices,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to update pricing");
      }

      setTierPrices({ ...tempPrices });
      setEditingPrices(false);
      setPriceUpdateStatus("Prices updated successfully!");
      setTimeout(() => setPriceUpdateStatus(null), 3000);
    } catch (err) {
      setPriceUpdateStatus(err instanceof Error ? err.message : "Failed to update pricing");
    } finally {
      setSavingPrices(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-lg font-semibold">Unable to load control dashboard</p>
          <p className="text-zinc-400 text-sm mt-2">{error || "No data returned from server"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-mono">
      <header className="border-b border-zinc-800 p-4 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 text-emerald-500 rounded-lg flex items-center justify-center text-xl">⚙️</div>
            <div>
              <h1 className="text-xl font-bold tracking-tighter">SWIFT-CONTROL-v3.0</h1>
              <p className="text-xs text-zinc-500">Global Operations Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-xs px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/30">
              <span className={`w-2 h-2 rounded-full ${data?.systemStatus.status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></span>
              {data?.systemStatus.status === 'healthy' ? 'SYSTEM NORMAL' : 'SYSTEM ALERT'}
            </span>
            <button 
              onClick={() => {
                localStorage.clear();
                document.cookie = "user-role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
                window.location.href = "/login";
              }}
              className="text-xs font-semibold px-4 py-2 bg-zinc-800 hover:bg-red-900 transition-colors rounded-lg border border-zinc-700"
            >
              TERMINATE_SESSION
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-zinc-800 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {["overview", "claims", "fraud", "zones"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveSection(tab as any)}
                className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                  activeSection === tab 
                    ? "text-emerald-400 border-b-2 border-emerald-400" 
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab === "overview" && "🌍 Overview"}
                {tab === "claims" && "🧾 Claims"}
                {tab === "fraud" && "🛡 Fraud"}
                {tab === "zones" && "📍 Zones"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Active Disruptions Banner */}
        {data?.activeDisruptions && data.activeDisruptions.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-red-900/50 to-orange-900/50 border border-red-500/30 rounded-xl p-4">
            <h3 className="font-bold text-red-400 mb-3 flex items-center text-sm">
              🚨 ACTIVE DISRUPTIONS SYSTEM-WIDE ({data.activeDisruptions.length})
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {data.activeDisruptions.map(d => (
                <div key={d.id} className="flex-shrink-0 bg-zinc-900/50 rounded-lg p-3 border border-zinc-700 min-w-[200px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{TRIGGER_INFO[d.trigger_type]?.icon || "⚠️"}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      d.severity === 'critical' ? 'bg-red-500 animate-pulse' : 
                      d.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                    } text-white`}>
                      {d.severity?.toUpperCase()}
                    </span>
                  </div>
                  <p className="font-medium text-sm">{TRIGGER_INFO[d.trigger_type]?.name}</p>
                  <p className="text-xs text-zinc-500">Since {new Date(d.start_time).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overview Section */}
        {activeSection === "overview" && (
          <>
            {/* Global Stats Grid */}
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl hover:border-emerald-500/50 transition-all">
                <p className="text-zinc-500 text-xs mb-2 uppercase">Global Partners</p>
                <p className="text-3xl font-bold tracking-widest">{data?.globalStats.total_workers || 0}</p>
                <p className="text-[10px] text-emerald-500 mt-2 font-bold">{data?.globalStats.active_subscriptions} ACTIVE SUBS</p>
              </div>
              
              <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl">
                <p className="text-zinc-500 text-xs mb-2 uppercase">Total Claims</p>
                <p className="text-3xl font-bold tracking-widest">{data?.globalStats.total_claims || 0}</p>
                <div className="flex gap-2 mt-2 text-[10px]">
                  <span className="text-yellow-500">{data?.globalStats.pending_claims} pending</span>
                  <span className="text-emerald-500">{data?.globalStats.approved_claims} approved</span>
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl">
                <p className="text-zinc-500 text-xs mb-2 uppercase">Total Payouts</p>
                <p className="text-3xl font-bold tracking-widest">{formatCurrency(data?.globalStats.total_payouts || 0)}</p>
                <p className="text-[10px] text-emerald-500 mt-2 font-bold">{formatCurrency(data?.payoutMetrics?.processing || 0)} PROCESSING</p>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl border-dashed">
                <p className="text-zinc-500 text-xs mb-2 uppercase">System Uptime</p>
                <p className="text-3xl font-bold text-emerald-500">{data?.systemStatus.uptime || '99%'}</p>
                <p className="text-[10px] text-zinc-500 mt-2">AUTOMATION: {data?.systemMetrics.automationRate}%</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Insurance Tier Pricing */}
              <div className="bg-gradient-to-br from-blue-950/30 to-zinc-900 border border-blue-500/20 p-5 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                    💰 INSURANCE TIER PRICING
                  </h3>
                  {!editingPrices ? (
                    <button 
                      onClick={() => {
                        setTempPrices({ ...tierPrices });
                        setEditingPrices(true);
                        setPriceUpdateStatus(null);
                      }}
                      className="text-[10px] px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      EDIT PRICES
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        onClick={handleSavePrices}
                        disabled={savingPrices}
                        className="text-[10px] px-3 py-1 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {savingPrices ? "SAVING..." : "SAVE"}
                      </button>
                      <button 
                        onClick={() => {
                          setEditingPrices(false);
                          setTempPrices({ ...tierPrices });
                        }}
                        className="text-[10px] px-3 py-1 bg-zinc-600 hover:bg-zinc-700 rounded-lg transition-colors"
                      >
                        CANCEL
                      </button>
                    </div>
                  )}
                </div>
                
                {priceUpdateStatus && (
                  <div className="mb-4 p-2 bg-emerald-900/30 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs text-center">
                    {priceUpdateStatus}
                  </div>
                )}
                
                <div className="space-y-4">
                  {/* Starter Tier */}
                  <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-zinc-500 rounded-full"></span>
                        <span className="text-sm font-bold text-zinc-300">STARTER</span>
                      </div>
                      {editingPrices ? (
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-500">₹</span>
                          <input
                            type="number"
                            value={tempPrices.starter}
                            onChange={(e) => setTempPrices({ ...tempPrices, starter: Number(e.target.value) })}
                            className="w-20 bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-right text-lg font-bold text-zinc-300 focus:outline-none focus:border-blue-500"
                          />
                          <span className="text-zinc-500 text-xs">/mo</span>
                        </div>
                      ) : (
                        <span className="text-xl font-bold text-zinc-300">₹{tierPrices.starter}<span className="text-xs text-zinc-500">/mo</span></span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500">Basic coverage for new gig workers</p>
                  </div>

                  {/* Shield Tier */}
                  <div className="p-4 bg-zinc-800/50 rounded-lg border border-amber-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
                        <span className="text-sm font-bold text-amber-400">SHIELD</span>
                        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">POPULAR</span>
                      </div>
                      {editingPrices ? (
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-500">₹</span>
                          <input
                            type="number"
                            value={tempPrices.shield}
                            onChange={(e) => setTempPrices({ ...tempPrices, shield: Number(e.target.value) })}
                            className="w-20 bg-zinc-900 border border-amber-600 rounded px-2 py-1 text-right text-lg font-bold text-amber-400 focus:outline-none focus:border-amber-400"
                          />
                          <span className="text-zinc-500 text-xs">/mo</span>
                        </div>
                      ) : (
                        <span className="text-xl font-bold text-amber-400">₹{tierPrices.shield}<span className="text-xs text-zinc-500">/mo</span></span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500">Enhanced protection with faster claims</p>
                  </div>

                  {/* Pro Tier */}
                  <div className="p-4 bg-zinc-800/50 rounded-lg border border-emerald-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                        <span className="text-sm font-bold text-emerald-400">PRO</span>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">PREMIUM</span>
                      </div>
                      {editingPrices ? (
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-500">₹</span>
                          <input
                            type="number"
                            value={tempPrices.pro}
                            onChange={(e) => setTempPrices({ ...tempPrices, pro: Number(e.target.value) })}
                            className="w-20 bg-zinc-900 border border-emerald-600 rounded px-2 py-1 text-right text-lg font-bold text-emerald-400 focus:outline-none focus:border-emerald-400"
                          />
                          <span className="text-zinc-500 text-xs">/mo</span>
                        </div>
                      ) : (
                        <span className="text-xl font-bold text-emerald-400">₹{tierPrices.pro}<span className="text-xs text-zinc-500">/mo</span></span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500">Complete coverage with priority support</p>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
                <h3 className="text-sm font-bold text-zinc-400 mb-4">💸 FINANCIAL METRICS</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Total Payouts</span>
                    <span className="font-bold text-emerald-400">{formatCurrency(data?.payoutMetrics?.total || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Processing</span>
                    <span className="font-bold text-yellow-400">{formatCurrency(data?.payoutMetrics?.processing || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Completed</span>
                    <span className="font-bold text-emerald-400">{formatCurrency(data?.payoutMetrics?.completed || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Failed</span>
                    <span className="font-bold text-red-400">{formatCurrency(data?.payoutMetrics?.failed || 0)}</span>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-zinc-800">
                  <h4 className="text-xs font-bold text-zinc-500 mb-3">CURRENT TIER REVENUE (EST.)</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Starter ({Math.floor((data?.globalStats.active_subscriptions || 0) * 0.3)} subs)</span>
                      <span className="text-zinc-400">{formatCurrency(Math.floor((data?.globalStats.active_subscriptions || 0) * 0.3) * tierPrices.starter)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Shield ({Math.floor((data?.globalStats.active_subscriptions || 0) * 0.5)} subs)</span>
                      <span className="text-amber-400">{formatCurrency(Math.floor((data?.globalStats.active_subscriptions || 0) * 0.5) * tierPrices.shield)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Pro ({Math.floor((data?.globalStats.active_subscriptions || 0) * 0.2)} subs)</span>
                      <span className="text-emerald-400">{formatCurrency(Math.floor((data?.globalStats.active_subscriptions || 0) * 0.2) * tierPrices.pro)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Claims Section */}
        {activeSection === "claims" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl">
                <p className="text-xs text-zinc-500 mb-1">Total Claims</p>
                <p className="text-3xl font-bold">{data?.globalStats.total_claims}</p>
              </div>
              <div className="bg-zinc-900/50 border border-yellow-500/30 p-5 rounded-xl">
                <p className="text-xs text-yellow-500 mb-1">Pending</p>
                <p className="text-3xl font-bold text-yellow-400">{data?.globalStats.pending_claims}</p>
              </div>
              <div className="bg-zinc-900/50 border border-emerald-500/30 p-5 rounded-xl">
                <p className="text-xs text-emerald-500 mb-1">Approved</p>
                <p className="text-3xl font-bold text-emerald-400">{data?.globalStats.approved_claims}</p>
              </div>
              <div className="bg-zinc-900/50 border border-red-500/30 p-5 rounded-xl">
                <p className="text-xs text-red-500 mb-1">Rejected</p>
                <p className="text-3xl font-bold text-red-400">{data?.globalStats.rejected_claims}</p>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="font-bold text-sm">🧾 GLOBAL CLAIMS MONITORING</h3>
                <button className="px-3 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700">Export CSV</button>
              </div>
              <div className="divide-y divide-zinc-800 max-h-96 overflow-y-auto">
                {data?.recentClaims?.length ? (
                  data.recentClaims.map((claim) => (
                    <div key={claim.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/30">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{TRIGGER_INFO[claim.trigger_type || "rainfall"]?.icon || "⚠️"}</span>
                        <div>
                          <p className="font-medium text-sm">Worker #{claim.worker_id?.slice(0, 8)}</p>
                          <p className="text-xs text-zinc-500">
                            {TRIGGER_INFO[claim.trigger_type || "rainfall"]?.name || "Unknown Trigger"} • {new Date(claim.claim_time || claim.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(Number(claim.amount || 0))}</p>
                        <p className={`text-xs ${
                          claim.status === "approved"
                            ? "text-emerald-400"
                            : claim.status === "rejected"
                              ? "text-red-400"
                              : "text-yellow-400"
                        }`}>
                          {claim.status?.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-zinc-500">No claims available</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fraud Section */}
        {activeSection === "fraud" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl">
                <p className="text-xs text-zinc-500 mb-1">Avg Fraud Score</p>
                <p className="text-3xl font-bold text-amber-400">{data?.globalStats.avg_fraud_score || 0}</p>
              </div>
              <div className="bg-zinc-900/50 border border-red-500/30 p-5 rounded-xl">
                <p className="text-xs text-red-500 mb-1">High-Risk Workers</p>
                <p className="text-3xl font-bold text-red-400">{data?.highRiskWorkers?.length || 0}</p>
              </div>
              <div className="bg-zinc-900/50 border border-orange-500/30 p-5 rounded-xl">
                <p className="text-xs text-orange-500 mb-1">Flagged Claims</p>
                <p className="text-3xl font-bold text-orange-400">{data?.flaggedClaims?.length || 0}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* High Risk Workers */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800 bg-red-900/20">
                  <h3 className="font-bold text-sm text-red-400">🛡 HIGH-RISK WORKERS</h3>
                </div>
                <div className="divide-y divide-zinc-800">
                  {data?.highRiskWorkers?.map(worker => (
                    <div key={worker.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/30">
                      <div>
                        <p className="font-medium">{worker.name || `Worker #${worker.id?.slice(0, 8)}`}</p>
                        <p className="text-xs text-zinc-500">{worker.claim_count} claims</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded font-bold">
                          Score: {worker.fraud_score}
                        </span>
                        <button className="px-2 py-1 bg-zinc-700 text-xs rounded hover:bg-zinc-600">Investigate</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flagged Claims */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800 bg-orange-900/20">
                  <h3 className="font-bold text-sm text-orange-400">⚠️ FLAGGED CLAIMS</h3>
                </div>
                <div className="divide-y divide-zinc-800">
                  {data?.flaggedClaims?.map(claim => (
                    <div key={claim.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/30">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{TRIGGER_INFO[claim.trigger_type || "rainfall"]?.icon}</span>
                        <div>
                          <p className="font-medium">{formatCurrency(Number(claim.amount))}</p>
                          <p className="text-xs text-zinc-500">Worker #{claim.worker_id?.slice(0, 8)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-red-400">Fraud: {claim.fraud_score}</p>
                        <p className="text-xs text-orange-400">Anomaly: {((claim.anomaly_score || 0) * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Zones Section */}
        {activeSection === "zones" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">🌍 ALL ZONES OVERVIEW</h3>
              <button className="px-4 py-2 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700">
                + Add Zone
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.zones?.map(zone => (
                <div key={zone.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-emerald-500/50 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold">{zone.name}</h4>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      (zone as any).risk_score > 70 ? 'bg-red-500/20 text-red-400' :
                      (zone as any).risk_score > 40 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      Risk: {(zone as any).risk_score || 0}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-3">{zone.city}</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">👷 {(zone as any).worker_count || 0} workers</span>
                    <span className="text-zinc-400">🧾 {(zone as any).claim_count || 0} claims</span>
                  </div>
                  <button className="w-full mt-3 py-2 bg-zinc-800 text-xs rounded hover:bg-zinc-700 transition-colors">
                    Manage Zone
                  </button>
                </div>
              ))}
            </div>

            {/* Zone Risk Distribution */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
              <h3 className="text-sm font-bold opacity-70 mb-4 uppercase">Regional Risk Distribution</h3>
              <div className="flex h-32 items-end gap-2 px-4">
                {data?.zones?.map((zone, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div 
                      className={`w-full rounded-t transition-all hover:opacity-80 ${
                        (zone as any).risk_score > 70 ? 'bg-red-500' :
                        (zone as any).risk_score > 40 ? 'bg-yellow-500' : 'bg-emerald-500'
                      }`} 
                      style={{ height: `${(zone as any).risk_score || 0}%` }}
                    ></div>
                    <span className="text-[8px] text-zinc-600 mt-2 truncate max-w-full">{zone.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
