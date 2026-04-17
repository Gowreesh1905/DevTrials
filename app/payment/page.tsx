import Link from "next/link";
import { createAdminClient } from "@/lib/supabase";
import type { InsurancePlan } from "@/lib/database.types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPlanName(plan: string) {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

export default async function PaymentPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string }>;
}) {
  const params = (await searchParams) || {};
  const selectedPlanName = params.plan;

  const admin = createAdminClient();
  const { data: plans, error } = await admin.from("insurance_plans").select("*");

  if (error) {
    throw new Error(error.message);
  }

  const availablePlans = (plans || []) as InsurancePlan[];
  const selectedPlan =
    availablePlans.find((plan) => plan.name === selectedPlanName) ||
    availablePlans.find((plan) => plan.name === "shield") ||
    availablePlans[0];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_28%),linear-gradient(180deg,#020617_0%,#111827_100%)] px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-orange-300">Payment</p>
            <h1 className="mt-2 text-3xl font-bold">Confirm your plan</h1>
          </div>
          <Link href="/plans" className="text-sm text-slate-300 hover:text-white">
            Back to plans
          </Link>
        </div>

        {selectedPlan ? (
          <div className="mt-8 grid gap-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-orange-200">Selected plan</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">{formatPlanName(selectedPlan.name)}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {selectedPlan.description || "Review the plan benefits before completing payment."}
              </p>

              <div className="mt-6 space-y-3 text-sm text-slate-200">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3">
                  <span>Weekly premium</span>
                  <span className="font-semibold text-white">{formatCurrency(selectedPlan.weekly_premium)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3">
                  <span>Weekly max payout</span>
                  <span className="font-semibold text-white">{formatCurrency(selectedPlan.weekly_max_payout)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3">
                  <span>Coverage</span>
                  <span className="font-semibold text-white">{selectedPlan.coverage_percentage}%</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3">
                  <span>Claim wait</span>
                  <span className="font-semibold text-white">{selectedPlan.claim_wait_minutes} mins</span>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-orange-500/20 to-rose-500/10 p-5">
              <p className="text-sm uppercase tracking-[0.22em] text-orange-200">Checkout summary</p>
              <div className="mt-4 space-y-4 text-sm text-slate-200">
                <div className="flex items-center justify-between">
                  <span>Plan</span>
                  <span className="font-semibold text-white">{formatPlanName(selectedPlan.name)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Payable now</span>
                  <span className="font-semibold text-white">{formatCurrency(selectedPlan.weekly_premium)}</span>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 text-slate-200">
                  {selectedPlan.includes_platform_outage
                    ? "This plan includes platform outage coverage."
                    : "This plan does not include platform outage coverage."}
                </div>
              </div>

              <Link
                href="/dashboard/user"
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition-transform hover:scale-[1.01]"
              >
                Complete Payment
              </Link>
              <p className="mt-3 text-xs leading-5 text-slate-300">
                This button is the payment handoff point. Wire your gateway here when you are ready.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-6 text-center text-slate-200">
            No plan selected.
            <div className="mt-4">
              <Link href="/plans" className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950">
                View Plans
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
