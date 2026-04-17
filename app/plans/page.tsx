import Link from "next/link";
import { createAdminClient } from "@/lib/supabase";
import type { InsurancePlan } from "@/lib/database.types";

export const metadata = {
  title: "Insurance Plans | SwiftShield",
  description: "Compare SwiftShield insurance plans and choose the one that fits your delivery work.",
};

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

function getPlanAccent(plan: string) {
  const accents: Record<string, string> = {
    starter: "from-sky-500 via-cyan-500 to-teal-400",
    shield: "from-emerald-500 via-lime-400 to-amber-300",
    pro: "from-orange-500 via-rose-500 to-fuchsia-500",
  };
  return accents[plan] || accents.starter;
}

export default async function PlansPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string }>;
}) {
  const params = (await searchParams) || {};
  const selectedPlanName = params.plan;

  const admin = createAdminClient();
  const { data: plans, error } = await admin
    .from("insurance_plans")
    .select("*")
    .order("weekly_premium", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const availablePlans = (plans || []) as InsurancePlan[];
  const selectedPlan =
    availablePlans.find((plan) => plan.name === selectedPlanName) ||
    availablePlans.find((plan) => plan.name === "shield") ||
    availablePlans[0];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_34%),linear-gradient(180deg,#020617_0%,#0f172a_42%,#111827_100%)] text-white">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <Link href="/dashboard/user" className="text-sm text-sky-300 hover:text-sky-200">
            Back to dashboard
          </Link>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Choose a plan built for delivery riders
          </h1>
          <p className="mt-4 text-base text-slate-300 sm:text-lg">
            Compare coverage, payout limits, and claim waiting times. Select a plan to see the full details, then proceed to payment.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {availablePlans.map((plan) => {
            const isSelected = selectedPlan?.name === plan.name;
            return (
              <Link
                key={plan.id}
                href={`/plans?plan=${plan.name}`}
                className={`group rounded-3xl border p-5 transition-all duration-200 ${
                  isSelected
                    ? "border-white/30 bg-white/12 shadow-2xl shadow-sky-950/30"
                    : "border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20"
                }`}
              >
                <div className={`h-2 rounded-full bg-gradient-to-r ${getPlanAccent(plan.name)}`} />
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{plan.name}</p>
                    <h2 className="text-2xl font-semibold text-white">{formatPlanName(plan.name)}</h2>
                  </div>
                  {plan.name === "shield" && (
                    <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                      Popular
                    </span>
                  )}
                </div>
                <p className="mt-4 text-3xl font-bold text-white">{formatCurrency(plan.weekly_premium)}</p>
                <p className="mt-1 text-sm text-slate-300">per week</p>
                <div className="mt-5 space-y-3 text-sm text-slate-200">
                  <div className="flex items-center justify-between gap-4">
                    <span>Weekly max payout</span>
                    <span className="font-semibold text-white">{formatCurrency(plan.weekly_max_payout)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Coverage</span>
                    <span className="font-semibold text-white">{plan.coverage_percentage}%</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Claim wait</span>
                    <span className="font-semibold text-white">{plan.claim_wait_minutes} mins</span>
                  </div>
                </div>
                <div className="mt-5 text-sm text-slate-400 group-hover:text-slate-300">
                  Tap to view plan details
                </div>
              </Link>
            );
          })}
        </div>

        {selectedPlan && (
          <section className="mt-10 rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-sky-300">Plan details</p>
                <h2 className="mt-3 text-3xl font-bold text-white">{formatPlanName(selectedPlan.name)} coverage</h2>
                <p className="mt-4 max-w-2xl text-slate-300">
                  {selectedPlan.description || "This plan provides protection for covered disruption events with a clear weekly premium and payout cap."}
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-400">Weekly premium</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(selectedPlan.weekly_premium)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-400">Weekly max payout</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(selectedPlan.weekly_max_payout)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-400">Coverage percentage</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{selectedPlan.coverage_percentage}%</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-400">Claim wait time</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{selectedPlan.claim_wait_minutes} mins</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                  {selectedPlan.includes_platform_outage
                    ? "Platform outage is included in this plan."
                    : "Platform outage is not included in this plan."}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Next step</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">Proceed to payment</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Review the selected plan one last time, then continue to the payment step to activate coverage.
                </p>
                <Link
                  href={`/payment?plan=${selectedPlan.name}`}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition-transform hover:scale-[1.01]"
                >
                  Proceed to Payment
                </Link>
                <p className="mt-4 text-xs leading-5 text-slate-400">
                  You can still switch plans above before continuing.
                </p>
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
