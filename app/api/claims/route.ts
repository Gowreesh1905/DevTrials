import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import type { ClaimInsert, TriggerType } from "@/lib/database.types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Manual claim submission body:", JSON.stringify(body, null, 2));
    const {
      worker_id,
      subscription_id,
      trigger_type,
      claim_date,
      start_time,
      end_time,
      duration_minutes,
      amount,
      description,
      location_lat,
      location_lng,
      zone_id,
    } = body;

    // Basic validation
    const requiredFields = { worker_id, subscription_id, trigger_type, claim_date, start_time, amount };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => value === undefined || value === null || value === "")
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: `Missing required fields: ${missingFields.join(", ")}`,
        received: { worker_id, subscription_id, trigger_type, claim_date, start_time, amount }
      }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Insert the claim
    const claimData = {
      worker_id,
      subscription_id,
      disruption_id: null,
      trigger_type: trigger_type,
      claim_date,
      start_time,
      end_time: end_time || null,
      duration_minutes: duration_minutes || null,
      amount: Number(amount),
      status: "pending",
      description: description || null,
      location_lat: location_lat || null,
      location_lng: location_lng || null,
      zone_id: zone_id || null,
      processed_at: null,
      paid_at: null,
      rejection_reason: null,
    };

    const { data: claim, error: claimError } = await (admin as any)
      .from("claims")
      .insert(claimData)
      .select()
      .single();

    if (claimError || !claim) {
      return NextResponse.json({ error: claimError?.message || "Failed to create claim" }, { status: 500 });
    }

    // 2. Update the subscription total
    const { data: subscription, error: subError } = await (admin as any)
      .from("insurance_subscriptions")
      .select("weekly_claim_total")
      .eq("id", subscription_id)
      .single();

    if (!subError && subscription) {
      const currentTotal = (subscription as any).weekly_claim_total || 0;
      const newTotal = currentTotal + Number(amount);
      await (admin as any)
        .from("insurance_subscriptions")
        .update({ weekly_claim_total: newTotal })
        .eq("id", subscription_id);
    }

    // 3. Create Audit Log
    await (admin as any).from("audit_logs").insert({
      user_id: worker_id,
      user_type: "worker",
      action: "manual_claim_submission",
      entity_type: "claim",
      entity_id: claim.id,
      new_values: claim,
      metadata: { source: "manual_claim_form" },
    });

    return NextResponse.json({ success: true, claim });
  } catch (error: any) {
    console.error("Manual claim error:", error);
    return NextResponse.json({ error: "Failed to process manual claim" }, { status: 500 });
  }
}
