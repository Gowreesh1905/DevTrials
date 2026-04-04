import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import type {
  Worker,
  InsuranceSubscription,
  Claim,
  Payout,
  DeliveryZone,
  WorkerVehicle,
  WorkerWeeklyStats,
  PlanTierConfig,
} from "@/lib/database.types";

interface DashboardResponse {
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const workerId = url.searchParams.get("workerId");
    const phone = url.searchParams.get("phone");

    if (!workerId && !phone) {
      return NextResponse.json({ error: "workerId or phone is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const workerRes = workerId
      ? await admin.from("workers").select("*").eq("id", workerId).maybeSingle()
      : await admin.from("workers").select("*").eq("phone", phone as string).maybeSingle();

    const workerError = workerRes.error;
    const worker = workerRes.data as Worker | null;

    if (workerError) {
      return NextResponse.json({ error: workerError.message }, { status: 500 });
    }

    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    const [subscriptionRes, vehicleRes, zoneRes, claimsRes, payoutsRes, weeklyStatsRes, planTierRes] =
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
      ]);

    console.log("Insurance plans from DB:", JSON.stringify(planTierRes.data, null, 2));

    const subscription = (subscriptionRes.data as InsuranceSubscription | null) ?? null;
    const planConfig = subscription
      ? planTierRes.data?.find((p: PlanTierConfig) => p.id === subscription.plan_tier) || null
      : null;

    const response: DashboardResponse = {
      worker,
      subscription,
      planConfig,
      vehicle: (vehicleRes.data as WorkerVehicle | null) ?? null,
      zone: (zoneRes.data as DeliveryZone | null) ?? null,
      claims: (claimsRes.data as Claim[]) || [],
      payouts: (payoutsRes.data as Payout[]) || [],
      weeklyStats: (weeklyStatsRes.data as WorkerWeeklyStats | null) ?? null,
      walletBalance: Number((worker as { wallet_balance?: number }).wallet_balance ?? 0),
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
