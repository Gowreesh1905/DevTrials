import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            worker_id,
            trigger_type,
            description,
            duration_minutes,
        } = body;

        if (!worker_id || !trigger_type) {
            return NextResponse.json(
                { error: "worker_id and trigger_type are required" },
                { status: 400 }
            );
        }

        const admin = createAdminClient();

        // 1. Get worker details
        const { data: worker, error: workerError } = await admin
            .from("workers")
            .select("*")
            .eq("id", worker_id)
            .single();

        if (workerError || !worker) {
            return NextResponse.json({ error: "Worker not found" }, { status: 404 });
        }

        // 2. Check cooling period
        if (worker.cooling_period_until && new Date(worker.cooling_period_until) > new Date()) {
            return NextResponse.json(
                { error: "Worker is in cooling period. Cannot file a new claim." },
                { status: 403 }
            );
        }

        // 3. Get active subscription
        const { data: subscription, error: subError } = await admin
            .from("insurance_subscriptions")
            .select("*")
            .eq("worker_id", worker_id)
            .eq("status", "active")
            .order("valid_until", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (subError || !subscription) {
            return NextResponse.json(
                { error: "No active subscription found. Please subscribe to a plan first." },
                { status: 403 }
            );
        }

        // 4. Get plan tier config to check if trigger is covered
        const { data: planConfig } = await admin
            .from("plan_tiers")
            .select("*")
            .eq("id", subscription.plan_tier)
            .single();

        if (planConfig && planConfig.triggers && !planConfig.triggers.includes(trigger_type)) {
            return NextResponse.json(
                { error: `Your ${subscription.plan_tier} plan does not cover ${trigger_type} events. Upgrade your plan.` },
                { status: 403 }
            );
        }

        // 5. Calculate payout amount
        const hourlyRate = planConfig?.hourly_payout || 70;
        const durationHrs = (duration_minutes || 60) / 60;
        const amount = Math.round(hourlyRate * durationHrs * 100) / 100;

        // 6. Check weekly cap
        const weeklyCap = planConfig?.weekly_cap || 500;
        const currentWeeklyTotal = subscription.weekly_claim_total || 0;
        if (currentWeeklyTotal + amount > weeklyCap) {
            const remaining = weeklyCap - currentWeeklyTotal;
            return NextResponse.json(
                { error: `Weekly cap exceeded. You have ₹${remaining.toFixed(0)} remaining this week.` },
                { status: 403 }
            );
        }

        // 7. Insert the claim
        const now = new Date().toISOString();
        const claimData = {
            worker_id,
            subscription_id: subscription.id,
            disruption_id: null, // manual claim — no linked disruption
            trigger_type,
            claim_date: new Date().toISOString().split("T")[0],
            start_time: now,
            end_time: new Date(Date.now() + (duration_minutes || 60) * 60000).toISOString(),
            duration_minutes: duration_minutes || 60,
            amount,
            status: "pending",
            description: description || `Manual claim: ${trigger_type}`,
            location_lat: worker.current_lat,
            location_lng: worker.current_lng,
            zone_id: worker.assigned_zone_id,
        };

        const { data: claim, error: claimError } = await admin
            .from("claims")
            .insert(claimData)
            .select()
            .single();

        if (claimError) {
            console.error("Claim insert error:", claimError);
            return NextResponse.json({ error: claimError.message }, { status: 500 });
        }

        // 8. Update weekly claim total on subscription
        await admin
            .from("insurance_subscriptions")
            .update({ weekly_claim_total: currentWeeklyTotal + amount })
            .eq("id", subscription.id);

        return NextResponse.json({ claim, message: "Claim filed successfully" }, { status: 201 });
    } catch (err) {
        console.error("Claims API error:", err);
        return NextResponse.json({ error: "Failed to file claim" }, { status: 500 });
    }
}
