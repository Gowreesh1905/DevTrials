"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(10);
  const plan = searchParams.get("plan") || "shield";
  const sessionId = searchParams.get("session_id");

  const planNames: Record<string, string> = {
    starter: "Starter",
    shield: "Shield",
    pro: "Pro",
  };

  const planColors: Record<string, string> = {
    starter: "from-emerald-500 to-teal-600",
    shield: "from-blue-500 to-indigo-600",
    pro: "from-purple-500 to-violet-600",
  };

  const planIcons: Record<string, string> = {
    starter: "🟢",
    shield: "🔵",
    pro: "🟣",
  };

  const planPrices: Record<string, number> = {
    starter: 29,
    shield: 59,
    pro: 99,
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = "/dashboard/user";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-lg w-full relative z-10">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="relative inline-flex">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-bounce">
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="absolute -inset-2 bg-emerald-500/20 rounded-full animate-ping"></div>
          </div>
        </div>

        {/* Success Card */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden">
          <div
            className={`bg-gradient-to-r ${planColors[plan] || planColors.shield} p-6 text-center`}
          >
            <h1 className="text-2xl font-bold text-white mb-1">
              Payment Successful! 🎉
            </h1>
            <p className="text-white/80 text-sm">
              Your insurance is now active
            </p>
          </div>

          <div className="p-6">
            {/* Plan Details */}
            <div className="bg-zinc-800/50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {planIcons[plan] || "🔵"}
                  </span>
                  <div>
                    <h3 className="text-white font-semibold">
                      {planNames[plan] || "Shield"} Plan
                    </h3>
                    <p className="text-zinc-400 text-sm">Weekly subscription</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-lg">
                    ₹{planPrices[plan] || 59}
                  </p>
                  <p className="text-zinc-500 text-xs">/week</p>
                </div>
              </div>
              <div className="border-t border-zinc-700 pt-3">
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                  </svg>
                  <span>Coverage active immediately</span>
                </div>
              </div>
            </div>

            {/* Transaction Info */}
            {sessionId && (
              <div className="bg-zinc-800/30 rounded-lg p-3 mb-6">
                <p className="text-zinc-500 text-xs">
                  Transaction ID:{" "}
                  <span className="text-zinc-400 font-mono">
                    {sessionId.slice(0, 20)}...
                  </span>
                </p>
              </div>
            )}

            {/* What's Next */}
            <div className="space-y-3 mb-6">
              <h4 className="text-white font-medium text-sm">
                What happens next:
              </h4>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs">1</span>
                </div>
                <p className="text-zinc-400 text-sm">
                  Your dashboard now shows your active plan and coverage details
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs">2</span>
                </div>
                <p className="text-zinc-400 text-sm">
                  Our AI is already monitoring disruptions in your zone
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs">3</span>
                </div>
                <p className="text-zinc-400 text-sm">
                  If a disruption occurs, you&apos;ll get an instant alert and
                  automatic payout
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link
                href="/dashboard/user"
                className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all active:scale-[0.98]"
              >
                Go to Dashboard
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
              <p className="text-center text-zinc-600 text-xs">
                Auto-redirecting in {countdown}s...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
