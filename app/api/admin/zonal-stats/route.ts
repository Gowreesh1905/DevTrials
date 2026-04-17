import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import type { 
  Claim, 
  Worker, 
  DeliveryZone, 
  Disruption, 
  Payout,
  Admin,
  TriggerType,
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

function normalizeClaimForAdmin(claim: any): Claim {
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
    claim_date: claimDateSource || new Date().toISOString(),
    duration_minutes: durationMinutes,
    description: claim?.description || extracted.description || claim?.reason || "",
  } as Claim;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("adminId"); // This might be user_id from localStorage

    if (!userId) {
      return NextResponse.json({ error: "adminId is required" }, { status:400 });
    }

    const adminClient = createAdminClient();

    // 1. Fetch Admin details
    const { data: admin, error: adminError } = await adminClient
      .from("admins")
      .select("*, delivery_zones(*)")
      .eq("user_id", userId)
      .maybeSingle();

    if (adminError) {
      return NextResponse.json({ error: adminError.message }, { status: 500 });
    }

    if (!admin) {
      return NextResponse.json({ error: "Admin profile not found" }, { status: 404 });
    }

    const typedAdmin = admin as unknown as Admin & { delivery_zones: DeliveryZone };
    const zoneId = typedAdmin.assigned_zone_id;

    if (!zoneId) {
      return NextResponse.json({ error: "No zone assigned to this admin" }, { status: 400 });
    }

    // 2. Fetch Zone data
    const zone = typedAdmin.delivery_zones;

    // 3. Fetch Workers in this zone
    const { data: workers, error: workersError } = await adminClient
      .from("workers")
      .select("*")
      .eq("assigned_zone_id", zoneId);

    if (workersError) {
      return NextResponse.json({ error: workersError.message }, { status: 500 });
    }

    const workerIds = (workers as Worker[]).map(w => w.id);

    // 4. Fetch Claims for these workers
    // We filter claims by worker_ids since claims don't have zone_id directly
    const { data: claims, error: claimsError } = workerIds.length
      ? await adminClient
          .from("claims")
          .select("*")
          .in("worker_id", workerIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

    if (claimsError) {
      return NextResponse.json({ error: claimsError.message }, { status: 500 });
    }

    const typedClaims = claims as Claim[];

    // Add backward compatibility fields for the frontend
    const augmentedClaims = typedClaims.map((c) => normalizeClaimForAdmin(c));

    // 5. Fetch Active Disruptions in this zone
    const { data: disruptions, error: disruptionsError } = await adminClient
      .from("disruptions")
      .select("*")
      .eq("zone_id", zoneId)
      .eq("is_active", true);

    if (disruptionsError) {
      // If is_active doesn't exist, we might need a different filter
      const { data: allDisruptions } = await adminClient
        .from("disruptions")
        .select("*")
        .eq("zone_id", zoneId)
        .order("created_at", { ascending: false })
        .limit(5);
      
      // Fallback: assume disruptions without end_time are active
      const activeDisruptions = (allDisruptions || []).filter((d: any) => !d.end_time);
      // ... continue with fallback if needed
    }

    // 6. Fetch Payouts in Progress
    const { data: payouts, error: payoutsError } = await adminClient
      .from("payouts")
      .select("*")
      .in("worker_id", workerIds)
      .eq("status", "processing");

    if (payoutsError) {
      return NextResponse.json({ error: payoutsError.message }, { status: 500 });
    }

    // 7. Calculate Metrics
    const approvedClaims = augmentedClaims.filter(c => c.status === "approved");
    const rejectedClaims = augmentedClaims.filter(c => c.status === "rejected");
    const pendingClaims = augmentedClaims.filter(c => c.status === "pending");
    
    const totalPayoutAmount = approvedClaims.reduce((sum, c) => sum + Number(c.amount), 0);
    const avgClaimAmount = augmentedClaims.length > 0 
      ? Math.round(augmentedClaims.reduce((sum, c) => sum + Number(c.amount), 0) / augmentedClaims.length)
      : 0;

    const response = {
      admin: typedAdmin,
      zone: zone,
      pendingClaims: pendingClaims,
      approvedClaims: approvedClaims,
      rejectedClaims: rejectedClaims,
      flaggedClaims: augmentedClaims.filter(c => (c.fraud_score || 0) > 70),
      activeWorkers: {
        count: workers.length,
        online: (workers as Worker[]).filter(w => w.is_logged_in).length,
        offline: (workers as Worker[]).filter(w => !w.is_logged_in).length,
      },
      activeDisruptions: disruptions || [],
      payoutsInProgress: payouts || [],
      zoneMetrics: {
        totalClaims: augmentedClaims.length,
        approvedClaims: approvedClaims.length,
        rejectedClaims: rejectedClaims.length,
        totalPayouts: totalPayoutAmount,
        avgClaimAmount: avgClaimAmount,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Zonal stats error:", error);
    return NextResponse.json({ error: "Failed to load zonal data" }, { status: 500 });
  }
}
