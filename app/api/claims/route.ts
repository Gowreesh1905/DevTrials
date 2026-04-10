import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import type { ClaimInsert, TriggerType } from "@/lib/database.types";

const ALLOWED_TRIGGER_TYPES: TriggerType[] = [
  "rainfall",
  "extreme_heat",
  "flood",
  "cold_fog",
  "civil_unrest",
  "platform_outage",
];

function buildTaggedReason(triggerType: TriggerType, description?: string) {
  const plainDescription = (description || "").trim();
  return `[trigger:${triggerType}]${plainDescription ? ` ${plainDescription}` : ""}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Manual claim submission body:", JSON.stringify(body, null, 2));
    const {
      worker_id,
      subscription_id,
      worker_insurance_id,
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
      disruption_id,
    } = body;

    const claimDateValue = claim_date || new Date().toISOString().split("T")[0];
    const startDateTimeIso = start_time ? new Date(`${claimDateValue}T${start_time}`).toISOString() : null;
    const endDateTimeIso = end_time ? new Date(`${claimDateValue}T${end_time}`).toISOString() : null;
    const claimHour = start_time ? Number(String(start_time).split(":")[0]) : null;

    // Basic validation
    const requiredFields = { worker_id, trigger_type, claim_date, start_time, amount };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => value === undefined || value === null || value === "")
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: `Missing required fields: ${missingFields.join(", ")}`,
        received: { worker_id, trigger_type, claim_date, start_time, amount }
      }, { status: 400 });
    }

    if (!ALLOWED_TRIGGER_TYPES.includes(trigger_type as TriggerType)) {
      return NextResponse.json({ error: "Invalid trigger_type" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Ensure the worker has at least one selected insurance plan.
    const { data: workerInsurance, error: insuranceError } = await adminClient
      .from("worker_insurance")
      .select("id")
      .eq("worker_id", worker_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (insuranceError) {
      return NextResponse.json({ error: insuranceError.message || "Failed to validate worker insurance" }, { status: 500 });
    }

    if (!workerInsurance && !worker_insurance_id) {
      return NextResponse.json(
        { error: "No insurance plan is selected for this worker. Please choose a plan first." },
        { status: 400 }
      );
    }

    // 1. Create the claim record according to updated schema
    const claimData: Record<string, any> = {
      worker_id,
      disruption_id: disruption_id || null, // disruption_id if linked to an event
      claim_type: "manual",
      status: "pending",
      claim_time: startDateTimeIso || new Date().toISOString(),
      start_time: startDateTimeIso,
      end_time: endDateTimeIso,
      claim_hour: claimHour,
      fraud_score: 0,
      reason: buildTaggedReason(trigger_type as TriggerType, description),
      amount: Number(amount),
      payment_status: "pending",
    };

    const { data: claim, error: claimError } = await adminClient
      .from("claims")
      .insert(claimData as any)
      .select()
      .single();

    if (claimError || !claim) {
      console.error("Claim insertion error:", claimError);
      return NextResponse.json({ error: claimError?.message || "Failed to create claim" }, { status: 500 });
    }

    // Keep dashboard compatibility
    const claimForClient = {
      ...(claim as any),
      trigger_type: trigger_type, // Still return it for UI icons
      claim_date: claimDateValue,
      duration_minutes: duration_minutes || 0,
      description: description || "",
      status: "pending"
    };

    // 2. Update subscription aggregate when subscription exists (legacy flow compatibility).
    if (subscription_id) {
      const { data: subscription, error: subError } = await adminClient
        .from("insurance_subscriptions")
        .select("weekly_claim_total")
        .eq("id", subscription_id)
        .single();

      if (!subError && subscription) {
        const currentTotal = (subscription as any).weekly_claim_total || 0;
        const newTotal = currentTotal + Number(amount);
        await (adminClient
          .from("insurance_subscriptions") as any)
          .update({ weekly_claim_total: newTotal } as any)
          .eq("id", subscription_id);
      }
    }

    // 3. Create Audit Log
    try {
      await adminClient.from("audit_logs").insert({
        user_id: worker_id,
        user_type: "worker",
        action: "manual_claim_submission",
        entity_type: "claim",
        entity_id: (claim as any).id,
        new_values: claimForClient,
        metadata: { source: "manual_claim_form" },
      } as any);
    } catch (e) {
      console.warn("Failed to create audit log, skipping.");
    }

    return NextResponse.json({ success: true, claim: claimForClient });
  } catch (error: any) {
    console.error("Manual claim error:", error);
    return NextResponse.json({ error: "Failed to process manual claim" }, { status: 500 });
  }
}
