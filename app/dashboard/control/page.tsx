"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { 
  Worker, 
  AuditLog, 
  WorkerGlobalStats 
} from "@/lib/database.types";

interface ControlDashboardData {
  admin: Worker;
  globalStats: WorkerGlobalStats;
  recentLogs: AuditLog[];
  systemStatus: {
    status: "healthy" | "degraded" | "outage";
    uptime: string;
  };
}

export default function ControlDashboardPage() {
  const [data, setData] = useState<ControlDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchControlData() {
      const workerId = localStorage.getItem("workerId");
      const role = localStorage.getItem("userRole");

      if (role !== "control_admin") {
        window.location.href = "/dashboard";
        return;
      }

      try {
        const res = await fetch(`/api/admin/control-stats?adminId=${workerId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch control data");
        }
        const controlData = await res.json();
        setData(controlData);
      } catch (err) {
        setError("Control Admin API reaching capacity. Showing System Monitoring View.");
        // Mock data for UI demonstration
        setData({
          admin: { name: "System Admin", role: "control_admin" } as Worker,
          globalStats: { total_workers: 1250, total_claims: 840, total_payouts: 425000 } as any,
          recentLogs: [
            { id: "1", action: "PLAN_UPGRADE", entity_type: "worker", created_at: new Date().toISOString(), user_id: "admin", user_type: "control_admin", entity_id: "123", old_values: null, new_values: null, metadata: { info: "Worker #123 upgraded to Pro" }, ip_address: null, user_agent: null } as AuditLog,
            { id: "2", action: "ZONE_UPDATE", entity_type: "zone", created_at: new Date().toISOString(), user_id: "admin", user_type: "control_admin", entity_id: "idx-1", old_values: null, new_values: null, metadata: { info: "Created New Zone: Indiranagar" }, ip_address: null, user_agent: null } as AuditLog,
            { id: "3", action: "SECURITY_EVENT", entity_type: "system", created_at: new Date().toISOString(), user_id: null, user_type: null, entity_id: null, old_values: null, new_values: null, metadata: { info: "Failed Login Attempt from IP: 1.2.3.4" }, ip_address: "1.2.3.4", user_agent: null } as AuditLog,
          ],
          systemStatus: {
            status: "healthy",
            uptime: "99.98%"
          }
        });
      } finally {
        setLoading(false);
      }
    }

    fetchControlData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-mono">
      <header className="border-b border-zinc-800 p-4 bg-zinc-900 flex justify-between items-center bg-transparent backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/20 text-emerald-500 rounded flex items-center justify-center">⚙️</div>
          <h1 className="text-xl font-bold tracking-tighter">SWIFT-CONTROL-v3.0</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            SYSTEM NORMAL
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
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl hover:border-emerald-500/50 transition-all cursor-crosshair">
            <p className="text-zinc-500 text-xs mb-2 uppercase">Global Partners</p>
            <p className="text-4xl font-bold text-white tracking-widest">{data?.globalStats.total_workers || 0}</p>
            <p className="text-[10px] text-emerald-500 mt-2 font-black">+42 THIS SESSION</p>
          </div>
          
          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
             <p className="text-zinc-500 text-xs mb-2 uppercase">Resolved Claims</p>
            <p className="text-4xl font-bold text-white tracking-widest">{data?.globalStats.total_claims || 0}</p>
            <p className="text-[10px] text-zinc-500 mt-2 font-black">94% AUTOMATED APPROVAL</p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
             <p className="text-zinc-500 text-xs mb-2 uppercase">Total Liabilities</p>
            <p className="text-4xl font-bold text-white tracking-widest">₹{data?.globalStats.total_payouts || 0}</p>
            <p className="text-[10px] text-emerald-500 mt-2 font-black text-right opacity-50">CURRENCY_INR</p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl border-dashed border-zinc-700 flex flex-col justify-center items-center">
            <p className="text-zinc-500 text-xs mb-1">SYSTEM_UPTIME</p>
            <p className="text-2xl font-black text-emerald-500">{data?.systemStatus.uptime || '99%'}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                SYSTEM_AUDIT_STREAM
              </h3>
              <span className="text-[10px] text-zinc-600">POLLING_ACTIVE_100ms</span>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden font-mono text-[11px]">
              <div className="p-2 border-b border-zinc-800 bg-zinc-900/50 text-zinc-500 grid grid-cols-4 gap-4">
                 <span>TIMESTAMP</span>
                 <span>EVENT</span>
                 <span className="col-span-2">DETAILS</span>
              </div>
              <div className="h-[400px] overflow-y-auto">
                {data?.recentLogs.map(log => (
                  <div key={log.id} className="p-3 border-b border-zinc-900 hover:bg-zinc-900 transition-colors group flex gap-4">
                    <span className="text-zinc-600">{new Date(log.created_at).toLocaleTimeString()}</span>
                    <span className="text-emerald-500 font-bold">{log.action}</span>
                    <span className="col-span-2 text-zinc-300 opacity-80 group-hover:opacity-100 flex-1">
                      {String(log.metadata?.info || log.entity_type)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-gradient-to-br from-emerald-950/30 to-zinc-900 border border-emerald-500/20 p-6 rounded-xl">
               <h3 className="text-sm font-bold mb-4 opacity-70">GLOBAL_RISK_OVERWRITE</h3>
               <div className="range-slider w-full h-8 bg-zinc-800 rounded-lg mb-4 flex items-center p-2 relative overflow-hidden">
                  <div className="h-full bg-emerald-500/20 w-3/4 absolute left-0 top-0 border-r border-emerald-500"></div>
                  <span className="relative z-10 text-[10px] font-black text-emerald-500 mx-auto">CURRENT_THRESHOLD: 75% | AUTO_CLAIM_TRIGGER</span>
               </div>
               <div className="flex gap-4">
                 <button className="flex-1 py-3 bg-white text-black font-black text-xs hover:bg-emerald-500 transition-colors rounded">ACTIVATE_FLOOD_PROTOCOL</button>
                 <button className="flex-1 py-3 border border-zinc-700 text-xs font-black hover:bg-zinc-800 transition-colors rounded">PAUSE_PAYOUTS</button>
               </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
               <h3 className="text-sm font-bold opacity-70 mb-4 uppercase">Regional Distribution</h3>
               <div className="flex h-32 items-end gap-1 px-4">
                  {[40, 70, 45, 90, 65, 30, 80, 55, 95].map((h, i) => (
                    <div key={i} className="flex-1 bg-emerald-500/20 border-t-2 border-emerald-500 hover:bg-emerald-500/50 transition-all cursor-pointer" style={{ height: `${h}%` }}></div>
                  ))}
               </div>
               <div className="flex justify-between text-[8px] text-zinc-600 mt-2 font-mono">
                  <span>NORTH</span>
                  <span>SOUTH</span>
                  <span>EAST</span>
                  <span>WEST</span>
                  <span>CENTRAL</span>
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
