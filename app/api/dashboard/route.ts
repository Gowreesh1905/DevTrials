import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import type {
  Worker,
  InsuranceSubscription,
  InsurancePlan,
  WorkerInsurance,
  Claim,
  Payout,
  DeliveryZone,
  WorkerVehicle,
  WorkerWeeklyStats,
  TriggerType,
  Disruption,
} from "@/lib/database.types";

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

interface DashboardResponse {
  worker: Worker & { upi_id?: string; city?: string };
  subscription: InsuranceSubscription | null;
  workerInsurance: WorkerInsurance | null;
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

function normalizeClaimForDashboard(claim: any): Claim {
  const claimDateSource = claim?.claim_date || claim?.claim_time || claim?.created_at;
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
    claim_date:
      typeof claimDateSource === "string" && claimDateSource.includes("T")
        ? claimDateSource.split("T")[0]
        : claimDateSource || new Date().toISOString().split("T")[0],
    duration_minutes: durationMinutes,
    description: claim?.description || extracted.description || claim?.reason || "",
  } as Claim;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const workerId = url.searchParams.get("workerId");
    const phone = url.searchParams.get("phone");

    if (!workerId && !phone) {
      return NextResponse.json({ error: "workerId or phone is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    let worker: Worker | null = null;
    let workerError: Error | null = null;

    if (workerId) {
      const workerRes = await admin.from("workers").select("*").eq("id", workerId).maybeSingle();
      workerError = workerRes.error;
      worker = workerRes.data as Worker | null;
    } else if (phone) {
      // First find the user by phone, then get the worker
      const userRes = await admin.from("users").select("id").eq("phone", phone).maybeSingle();
      if (userRes.error) {
        return NextResponse.json({ error: userRes.error.message }, { status: 500 });
      }
      if (!userRes.data) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const workerRes = await admin.from("workers").select("*").eq("user_id", userRes.data.id).maybeSingle();
      workerError = workerRes.error;
      worker = workerRes.data as Worker | null;
    }

    if (workerError) {
      return NextResponse.json({ error: workerError.message }, { status: 500 });
    }

    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    // Get today's date for filtering
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    const [subscriptionRes, workerInsuranceRes, vehicleRes, zoneRes, claimsRes, payoutsRes, weeklyStatsRes, insurancePlansRes, activeDisruptionRes, todayOrdersRes, incomePredictionRes, walletBalanceRes] =
      await Promise.all([
        admin
          .from("insurance_subscriptions")
          .select("*")
          .eq("worker_id", worker.id)
          .eq("status", "active")
          .order("valid_until", { ascending: false })
          .limit(1)
          .maybeSingle(),
        admin
          .from("worker_insurance")
          .select("*")
          .eq("worker_id", worker.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        admin
          .from("worker_vehicles")
          .select("*")
          .eq("worker_id", worker.id)
          .eq("is_primary", true)
          .limit(1)
          .maybeSingle(),
        worker.assigned_zone_id
          ? admin.from("delivery_zones").select("*").eq("id", worker.assigned_zone_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        admin
          .from("claims")
          .select("*")
          .eq("worker_id", worker.id)
          .order("created_at", { ascending: false })
          .limit(10),
        admin
          .from("payouts")
          .select("*")
          .eq("worker_id", worker.id)
          .order("created_at", { ascending: false })
          .limit(10),
        admin
          .from("worker_weekly_stats")
          .select("*")
          .eq("worker_id", worker.id)
          .order("week_start_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        admin.from("insurance_plans").select("*"),
        // Fetch active disruption for worker's zone
        worker.assigned_zone_id
          ? admin
              .from("disruptions")
              .select("*")
              .eq("zone_id", worker.assigned_zone_id)
              .is("end_time", null)
              .order("start_time", { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        // Fetch today's orders for earnings calculation
        admin
          .from("orders")
          .select("earnings")
          .eq("worker_id", worker.id)
          .gte("timestamp", todayStart)
          .lt("timestamp", todayEnd),
        // Fetch income prediction
        admin
          .from("income_predictions")
          .select("predicted_hourly_income")
          .eq("worker_id", worker.id)
          .order("predicted_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        // Fetch latest wallet balance
        admin
          .from("wallet_transactions")
          .select("balance_after")
          .eq("worker_id", worker.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    const rawClaims = ((claimsRes.data as Claim[]) || []) as Array<Claim & { id: string; status: string }>;
    const rejectedClaimIds = rawClaims
      .filter((claim) => claim.status === "rejected")
      .map((claim) => claim.id);

    let rejectionReasonByClaimId: Record<string, string> = {};
    if (rejectedClaimIds.length > 0) {
      const { data: rejectionActions } = await (admin
        .from("admin_actions") as any)
        .select("target_id, reason, created_at")
        .eq("target_type", "claim")
        .eq("action_type", "reject_claim")
        .in("target_id", rejectedClaimIds)
        .order("created_at", { ascending: false });

      rejectionReasonByClaimId = (rejectionActions || []).reduce(
        (acc: Record<string, string>, row: any) => {
          const claimId = row?.target_id;
          if (typeof claimId === "string" && !acc[claimId] && row?.reason) {
            acc[claimId] = String(row.reason);
          }
          return acc;
        },
        {}
      );
    }

    const subscription = (subscriptionRes.data as InsuranceSubscription | null) ?? null;
    const workerInsurance = (workerInsuranceRes.data as WorkerInsurance | null) ?? null;
    const normalizedClaims = rawClaims.map((claim) =>
      normalizeClaimForDashboard({
        ...claim,
        rejection_reason: claim.rejection_reason || rejectionReasonByClaimId[claim.id] || null,
      })
    );
    const selectedPlanName = workerInsurance?.plan ?? subscription?.plan_tier ?? null;
    const insurancePlan = selectedPlanName
      ? insurancePlansRes.data?.find((plan: InsurancePlan) => plan.name === selectedPlanName) || null
      : null;

    // Calculate today's earnings from orders
    const todayOrders = (todayOrdersRes.data || []) as Array<{ earnings: number | string | null }>;
    const todayEarnings = todayOrders.reduce(
      (sum, order) => sum + Number(order.earnings || 0),
      0
    );

    // Get predicted earnings (fallback to 500 if not available)
    const predictedEarnings = Number(
      (incomePredictionRes.data as { predicted_hourly_income?: number } | null)?.predicted_hourly_income || 0
    ) * 8 || 500; // Assume 8 hours of work

    // Get active disruption
    const activeDisruption = (activeDisruptionRes.data as Disruption | null) ?? null;

    // Find pending claim (most recent pending or approved claim from today)
    const pendingClaim = normalizedClaims.find(
      (claim) => claim.status === "pending" || claim.status === "approved"
    ) || null;

    // Get wallet balance from latest transaction or default to 0
    const walletBalance = Number(
      (walletBalanceRes.data as { balance_after?: number } | null)?.balance_after ?? 0
    );

    // Enrich worker with zone city if available
    const zone = (zoneRes.data as DeliveryZone | null) ?? null;
    const enrichedWorker = {
      ...worker,
      city: zone?.city || (worker as Worker & { city?: string }).city || "",
    };

    const response: DashboardResponse = {
      worker: enrichedWorker,
      subscription,
      workerInsurance,
      insurancePlan,
      vehicle: (vehicleRes.data as WorkerVehicle | null) ?? null,
      zone,
      claims: normalizedClaims,
      payouts: (payoutsRes.data as Payout[]) || [],
      weeklyStats: (weeklyStatsRes.data as WorkerWeeklyStats | null) ?? null,
      walletBalance,
      activeDisruption,
      todayEarnings,
      predictedEarnings,
      pendingClaim,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
