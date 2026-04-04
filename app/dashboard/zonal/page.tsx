"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { 
  Worker, 
  Claim, 
  DeliveryZone, 
  AuditLog 
} from "@/lib/database.types";

interface ZonalDashboardData {
  admin: Worker;
  zone: DeliveryZone | null;
  pendingClaims: Claim[];
  recentWorkerActivity: Worker[];
  auditLogs: AuditLog[];
}

export default function ZonalDashboardPage() {
  const [data, setData] = useState<ZonalDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchZonalData() {
      const workerId = localStorage.getItem("workerId");
      const role = localStorage.getItem("userRole");

      if (role !== "zonal_admin") {
        window.location.href = "/dashboard";
        return;
      }

      try {
        // In a real app, this would be a dedicated zonal-admin API endpoint
        // For now, we'll mock some data or use existing endpoints if available
        const res = await fetch(`/api/admin/zonal-stats?adminId=${workerId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch zonal data");
        }
        const zonalData = await res.json();
        setData(zonalData);
      } catch (err) {
        setError("Zonal Admin API not fully implemented yet. Showing Mock Data.");
        // Mock data for UI demonstration
        setData({
          admin: { name: "Zonal Admin", role: "zonal_admin" } as Worker,
          zone: { name: "Indiranagar", city: "Bangalore" } as DeliveryZone,
          pendingClaims: [
            { id: "1", amount: 250, trigger_type: "rainfall", status: "pending", claim_date: new Date().toISOString() } as Claim,
            { id: "2", amount: 400, trigger_type: "accident", status: "pending", claim_date: new Date().toISOString() } as Claim,
          ],
          recentWorkerActivity: [],
          auditLogs: []
        });
      } finally {
        setLoading(false);
      }
    }

    fetchZonalData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-amber-600">Zonal Hub</span>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full font-medium">ADMIN</span>
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Zone: {data?.zone?.name || "Global View"}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">Regional claim Management & Oversight</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
           <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <p className="text-zinc-500 text-sm mb-1">Pending Approvals</p>
            <p className="text-3xl font-bold text-amber-600">{data?.pendingClaims.length || 0}</p>
            <Link href="/admin/claims" className="text-sm text-blue-600 hover:underline mt-2 inline-block">Review Claims →</Link>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <p className="text-zinc-500 text-sm mb-1">Active Workers in Zone</p>
            <p className="text-3xl font-bold text-blue-600">124</p>
            <p className="text-xs text-emerald-600 font-medium mt-2">↑ 12% from last week</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <p className="text-zinc-500 text-sm mb-1">Weekly Payouts</p>
            <p className="text-3xl font-bold text-emerald-600">₹42,500</p>
            <p className="text-xs text-zinc-400 mt-2">Budget Utilization: 68%</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <h2 className="font-semibold text-zinc-900 dark:text-white">Active Regional Claims</h2>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data?.pendingClaims.map(claim => (
              <div key={claim.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-xl">
                    {claim.trigger_type === 'rainfall' ? '🌧️' : '⚠️'}
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">Worker ID: #{claim.worker_id?.slice(0, 8) || "N/A"}</p>
                    <p className="text-xs text-zinc-500">{claim.trigger_type.toUpperCase()} • {new Date(claim.claim_date).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-zinc-900 dark:text-white">₹{claim.amount}</span>
                  <button className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">Approve</button>
                  <button className="px-3 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700">Deny</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
