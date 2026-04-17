import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import type { ClaimStatus } from "@/lib/database.types";

export async function POST(request: Request) {
  try {
    const { claim_id, status, admin_id, reason } = await request.json();

    if (!claim_id || !status || !admin_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Frontend stores userId in localStorage. Resolve it to admins.id when needed.
    const { data: adminProfile } = await adminClient
      .from("admins")
      .select("id")
      .eq("user_id", admin_id)
      .maybeSingle();

    const adminActionId = (adminProfile as { id?: string } | null)?.id || admin_id;

    // 1. Fetch the claim first to get worker_id and amount
    const { data: claim, error: claimFetchError } = await adminClient
      .from("claims")
      .select("*")
      .eq("id", claim_id)
      .single();

    if (claimFetchError || !(claim as any)) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // 2. Update claim status
    const { error: claimUpdateError } = await (adminClient
      .from("claims") as any)
      .update({
        status: status as ClaimStatus,
      })
      .eq("id", claim_id);

    if (claimUpdateError) {
      return NextResponse.json({ error: claimUpdateError.message }, { status: 500 });
    }

    // 3. If approved, handle payout and wallet
    if (status === "approved") {
      const amount = Number((claim as any).amount);
      const workerId = (claim as any).worker_id;

      // Create a payout record
      const { error: payoutError } = await (adminClient
        .from("payouts") as any)
        .insert({
          worker_id: workerId,
          claim_id: claim_id,
          amount: amount,
          status: "processing",
        });

      if (payoutError) {
        console.error("Failed to create payout record:", payoutError);
      }

      // Update worker wallet balance (if the column exists)
      // Since we identified a mismatch, we'll try to update it and catch error if missing
      try {
        const { data: worker } = await adminClient
          .from("workers")
          .select("wallet_balance")
          .eq("id", workerId)
          .single();
        
        if (worker) {
          const currentBalance = Number((worker as any).wallet_balance || 0);
          await (adminClient
            .from("workers") as any)
            .update({ wallet_balance: currentBalance + amount })
            .eq("id", workerId);
        }
      } catch (err) {
        console.warn("Worker table might be missing wallet_balance column. Skipping wallet update.");
      }

      // Create a wallet transaction
      await (adminClient.from("wallet_transactions") as any).insert({
        worker_id: workerId,
        amount: amount,
        transaction_type: "claim_payout",
        created_at: new Date().toISOString(),
      });
    }

    // 4. Log admin action
    await (adminClient.from("admin_actions") as any).insert({
      admin_id: adminActionId,
      action_type: status === "approved" ? "approve_claim" : "reject_claim",
      target_id: claim_id,
      target_type: "claim",
      reason: reason || (status === "approved" ? "Approved by Zonal Admin" : "Rejected by Zonal Admin"),
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Approve claim error:", error);
    return NextResponse.json({ error: "Failed to process claim approval" }, { status: 500 });
  }
}
