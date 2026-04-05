import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PLAN_DETAILS: Record<string, { name: string; description: string; price: number }> = {
  starter: {
    name: "SwiftShield Starter",
    description: "Basic income protection — Rain & Heat coverage, 50% income coverage, ₹1,500 weekly max",
    price: 2900, // ₹29 in paise
  },
  shield: {
    name: "SwiftShield Shield",
    description: "Enhanced protection — Weather & Curfew coverage, 70% income coverage, ₹3,600 weekly max",
    price: 5900, // ₹59 in paise
  },
  pro: {
    name: "SwiftShield Pro",
    description: "Maximum protection — All triggers + Platform Outage, 90% income coverage, ₹6,000 weekly max",
    price: 9900, // ₹99 in paise
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, workerId, workerName, workerPhone } = body;

    if (!planId || !PLAN_DETAILS[planId]) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
    }

    const plan = PLAN_DETAILS[planId];
    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: plan.name,
              description: plan.description,
            },
            unit_amount: plan.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/plans/success?session_id={CHECKOUT_SESSION_ID}&plan=${planId}`,
      cancel_url: `${origin}/plans?cancelled=true`,
      metadata: {
        planId,
        workerId: workerId || "",
        workerName: workerName || "",
        workerPhone: workerPhone || "",
      },
      customer_email: undefined,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: unknown) {
    console.error("Stripe checkout error:", error);
    const message = error instanceof Error ? error.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
