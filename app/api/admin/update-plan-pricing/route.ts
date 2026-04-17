import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import type { InsurancePlanType } from "@/lib/database.types";

type PlanPricingPayload = {
  starter: number;
  shield: number;
  pro: number;
};

function isValidPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      adminId?: string;
      planPricing?: Partial<PlanPricingPayload>;
    };

    const adminId = body?.adminId;
    const planPricing = body?.planPricing;

    if (!adminId || !planPricing) {
      return NextResponse.json({ error: "adminId and planPricing are required" }, { status: 400 });
    }

    const { starter, shield, pro } = planPricing;
    if (!isValidPrice(starter) || !isValidPrice(shield) || !isValidPrice(pro)) {
      return NextResponse.json({ error: "Invalid pricing payload" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: adminProfile, error: adminError } = await admin
      .from("admins")
      .select("id, role")
      .eq("user_id", adminId)
      .eq("role", "control_admin")
      .maybeSingle();

    if (adminError) {
      return NextResponse.json({ error: adminError.message }, { status: 500 });
    }

    if (!adminProfile) {
      return NextResponse.json({ error: "Unauthorized admin" }, { status: 403 });
    }

    const updates: Array<{ name: InsurancePlanType; weekly_premium: number }> = [
      { name: "starter", weekly_premium: starter },
      { name: "shield", weekly_premium: shield },
      { name: "pro", weekly_premium: pro },
    ];

    for (const update of updates) {
      const { error } = await admin
        .from("insurance_plans")
        .update({ weekly_premium: update.weekly_premium })
        .eq("name", update.name);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, planPricing: { starter, shield, pro } });
  } catch (error: unknown) {
    console.error("Update plan pricing error:", error);
    return NextResponse.json({ error: "Failed to update plan pricing" }, { status: 500 });
  }
}
