import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import type { Claim, Disruption, TriggerType } from "@/lib/database.types";

type Severity = "low" | "medium" | "high" | "critical";

type PlanPricing = {
  starter: number;
  shield: number;
  pro: number;
};

const TRIGGER_TAG_REGEX = /^\[trigger:([a-z_]+)\]\s*/i;

function extractTriggerAndDescription(reason: unknown): {
  triggerType?: TriggerType;
  description: string;
} {
  if (typeof reason !== "string") {
    return { description: "" };
  }

  const match = reason.match(TRIGGER_TAG_REGEX);
  if (!match) {
    return { description: reason };
  }

  return {
    triggerType: match[1] as TriggerType,
    description: reason.replace(TRIGGER_TAG_REGEX, "").trim(),
  };
}

function normalizeClaim(claim: any): Claim {
  const extracted = extractTriggerAndDescription(claim?.reason);

  let durationMinutes = Number(claim?.duration_minutes || 0);
  if (!durationMinutes && claim?.start_time && claim?.end_time) {
    const start = new Date(claim.start_time).getTime();
    const end = new Date(claim.end_time).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      durationMinutes = Math.round((end - start) / (1000 * 60));
    }
  }

  return {
    ...claim,
    trigger_type: extracted.triggerType || claim?.trigger_type || "rainfall",
    description: claim?.description || extracted.description || claim?.reason || "",
    duration_minutes: durationMinutes,
  } as Claim;
}

function severityFromLevel(level: number | null | undefined): Severity {
  const value = Number(level || 0);
  if (value >= 4) return "critical";
  if (value >= 3) return "high";
  if (value >= 2) return "medium";
  return "low";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const adminId = url.searchParams.get("adminId");

    if (!adminId) {
      return NextResponse.json({ error: "adminId is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: adminProfile, error: adminError } = await admin
      .from("admins")
      .select("id, user_id, role")
      .eq("user_id", adminId)
      .eq("role", "control_admin")
      .maybeSingle();

    if (adminError) {
      return NextResponse.json({ error: adminError.message }, { status: 500 });
    }

    if (!adminProfile) {
      return NextResponse.json({ error: "Control admin profile not found" }, { status: 404 });
    }

    const [
      zonesRes,
      workersRes,
      allClaimsRes,
      recentClaimsRes,
      disruptionsRes,
      payoutsRes,
      logsRes,
      plansRes,
      subscriptionsCountRes,
      totalClaimsCountRes,
      pendingClaimsCountRes,
      approvedClaimsCountRes,
      rejectedClaimsCountRes,
      autoClaimsCountRes,
    ] = await Promise.all([
      admin.from("delivery_zones").select("*").order("name", { ascending: true }),
      admin.from("workers").select("id, name, assigned_zone_id, fraud_score, is_logged_in").order("created_at", { ascending: false }),
      admin.from("claims").select("*"),
      admin.from("claims").select("*").order("created_at", { ascending: false }).limit(20),
      admin.from("disruptions").select("*").is("end_time", null).order("start_time", { ascending: false }).limit(10),
      admin.from("payouts").select("amount, status"),
      admin.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(10),
      admin.from("insurance_plans").select("name, weekly_premium"),
      admin.from("worker_insurance").select("id", { count: "exact", head: true }),
      admin.from("claims").select("id", { count: "exact", head: true }),
      admin.from("claims").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("claims").select("id", { count: "exact", head: true }).eq("status", "approved"),
      admin.from("claims").select("id", { count: "exact", head: true }).eq("status", "rejected"),
      admin.from("claims").select("id", { count: "exact", head: true }).eq("claim_type", "auto"),
    ]);

    const possibleError = [
      zonesRes.error,
      workersRes.error,
      allClaimsRes.error,
      recentClaimsRes.error,
      disruptionsRes.error,
      payoutsRes.error,
      logsRes.error,
      plansRes.error,
      subscriptionsCountRes.error,
      totalClaimsCountRes.error,
      pendingClaimsCountRes.error,
      approvedClaimsCountRes.error,
      rejectedClaimsCountRes.error,
      autoClaimsCountRes.error,
    ].find(Boolean);

    if (possibleError) {
      return NextResponse.json({ error: possibleError.message }, { status: 500 });
    }

    const zones = (zonesRes.data || []) as any[];
    const workers = (workersRes.data || []) as any[];
    const allClaims = ((allClaimsRes.data || []) as any[]).map(normalizeClaim);
    const recentClaims = ((recentClaimsRes.data || []) as any[]).map(normalizeClaim);

    const payouts = (payoutsRes.data || []) as Array<{ amount: number; status: string }>;
    const totalPayouts = payouts.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const processingPayouts = payouts
      .filter((p) => p.status === "processing")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const completedPayouts = payouts
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const failedPayouts = payouts
      .filter((p) => p.status === "failed")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const zoneWorkerMap = new Map<string, string[]>();
    workers.forEach((worker) => {
      const zoneId = worker.assigned_zone_id;
      if (!zoneId) return;
      const existing = zoneWorkerMap.get(zoneId) || [];
      existing.push(worker.id);
      zoneWorkerMap.set(zoneId, existing);
    });

    const claimCountByWorker = new Map<string, number>();
    allClaims.forEach((claim) => {
      const key = claim.worker_id;
      claimCountByWorker.set(key, (claimCountByWorker.get(key) || 0) + 1);
    });

    const zonesWithCounts = zones.map((zone) => {
      const zoneWorkerIds = zoneWorkerMap.get(zone.id) || [];
      const claimCount = zoneWorkerIds.reduce((sum, workerId) => sum + (claimCountByWorker.get(workerId) || 0), 0);
      return {
        ...zone,
        worker_count: zoneWorkerIds.length,
        claim_count: claimCount,
      };
    });

    const highRiskWorkers = workers
      .filter((worker) => Number(worker.fraud_score || 0) >= 70)
      .sort((a, b) => Number(b.fraud_score || 0) - Number(a.fraud_score || 0))
      .slice(0, 10)
      .map((worker) => ({
        ...worker,
        claim_count: claimCountByWorker.get(worker.id) || 0,
      }));

    const flaggedClaims = allClaims
      .filter((claim) => Number(claim.fraud_score || 0) >= 70)
      .sort((a, b) => Number(b.fraud_score || 0) - Number(a.fraud_score || 0))
      .slice(0, 20)
      .map((claim) => ({ ...claim, anomaly_score: 0 }));

    const activeDisruptions = ((disruptionsRes.data || []) as any[]).map((d) => ({
      ...d,
      is_active: true,
      severity: severityFromLevel(d.severity_level),
      trigger_type: d.trigger_type || "rainfall",
    })) as Disruption[];

    const totalClaims = totalClaimsCountRes.count || 0;
    const pendingClaims = pendingClaimsCountRes.count || 0;
    const approvedClaims = approvedClaimsCountRes.count || 0;
    const rejectedClaims = rejectedClaimsCountRes.count || 0;
    const activeSubscriptions = subscriptionsCountRes.count || 0;

    const avgFraudScore = workers.length
      ? Math.round(
          (workers.reduce((sum, worker) => sum + Number(worker.fraud_score || 0), 0) / workers.length) * 100
        ) / 100
      : 0;

    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(today.getDate() - 14);

    const claimsLast7 = allClaims.filter((c) => new Date(c.created_at) >= sevenDaysAgo).length;
    const claimsPrev7 = allClaims.filter(
      (c) => new Date(c.created_at) >= fourteenDaysAgo && new Date(c.created_at) < sevenDaysAgo
    ).length;

    const claimTrend = claimsPrev7
      ? Math.round(((claimsLast7 - claimsPrev7) / claimsPrev7) * 100)
      : claimsLast7 > 0
        ? 100
        : 0;

    const autoClaims = autoClaimsCountRes.count || 0;
    const automationRate = totalClaims ? Math.round((autoClaims / totalClaims) * 100) : 0;

    const failureRate = payouts.length
      ? Math.round((payouts.filter((p) => p.status === "failed").length / payouts.length) * 10000) / 100
      : 0;

    const systemStatus = activeDisruptions.length > 0 || failureRate > 5 ? "degraded" : "healthy";
    const uptime = `${Math.max(0, 100 - failureRate).toFixed(2)}%`;

    const planPricing: PlanPricing = {
      starter: 29,
      shield: 59,
      pro: 99,
    };

    (plansRes.data || []).forEach((plan: any) => {
      if (plan?.name === "starter") {
        planPricing.starter = Number(plan.weekly_premium || planPricing.starter);
      } else if (plan?.name === "shield") {
        planPricing.shield = Number(plan.weekly_premium || planPricing.shield);
      } else if (plan?.name === "pro") {
        planPricing.pro = Number(plan.weekly_premium || planPricing.pro);
      }
    });

    return NextResponse.json({
      admin: adminProfile,
      globalStats: {
        total_workers: workers.length,
        total_claims: totalClaims,
        total_payouts: totalPayouts,
        active_subscriptions: activeSubscriptions,
        avg_fraud_score: avgFraudScore,
        pending_claims: pendingClaims,
        approved_claims: approvedClaims,
        rejected_claims: rejectedClaims,
      },
      zones: zonesWithCounts,
      activeDisruptions,
      recentClaims,
      highRiskWorkers,
      flaggedClaims,
      payoutMetrics: {
        total: totalPayouts,
        processing: processingPayouts,
        completed: completedPayouts,
        failed: failedPayouts,
      },
      systemMetrics: {
        claimTrend,
        automationRate,
      },
      recentLogs: logsRes.data || [],
      systemStatus: {
        status: systemStatus,
        uptime,
      },
      planPricing,
    });
  } catch (error: unknown) {
    console.error("Control stats error:", error);
    return NextResponse.json({ error: "Failed to load control dashboard data" }, { status: 500 });
  }
}
