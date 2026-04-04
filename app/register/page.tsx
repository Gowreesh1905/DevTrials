"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Platform, VehicleType, Worker, User, UserRole } from "@/lib/database.types";

type RegisterStep = "consent" | "form" | "otp";

interface PendingRegistration {
  name: string;
  phone: string;
  role: UserRole;
  platform?: Platform;
  city?: string;
  upiId?: string;
  vehicleType?: VehicleType;
  vehicleRegistration?: string;
}

const PLATFORM_OPTIONS: Array<{ value: Platform; label: string }> = [
  { value: "blinkit", label: "Blinkit" },
  { value: "zepto", label: "Zepto" },
  { value: "instamart", label: "Swiggy Instamart" },
];

const VEHICLE_OPTIONS: Array<{ value: VehicleType; label: string }> = [
  { value: "bike", label: "Bike" },
  { value: "scooter", label: "Scooter" }
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<RegisterStep>("consent");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [roleGroup, setRoleGroup] = useState<"user" | "admin">("user");
  const [platform, setPlatform] = useState<Platform>("blinkit");
  const [city, setCity] = useState("");
  const [upiId, setUpiId] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("bike");
  const [vehicleRegistration, setVehicleRegistration] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSessionId, setOtpSessionId] = useState("");
  const [debugOtp, setDebugOtp] = useState("");
  const [otpInfo, setOtpInfo] = useState("");
  const [pendingRegistration, setPendingRegistration] = useState<PendingRegistration | null>(null);

  const canSubmit = useMemo(() => {
    const baseValid = name.trim().length >= 2 && phone.length === 10;
    if (role === 'user') {
      return baseValid && city.trim().length >= 2;
    }
    return baseValid;
  }, [name, phone, city, role]);

  const handleContinue = () => {
    if (!acceptedTerms) {
      setError("Please accept the Terms and Privacy Policy to continue.");
      return;
    }
    setError("");
    setStep("form");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      setError("Please fill all required fields.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const registerPayload: PendingRegistration = {
        name: name.trim(),
        phone,
        role,
        platform: role === 'user' ? platform : undefined,
        city: role === 'user' ? city.trim() : undefined,
        upiId: (role === 'user' && upiId.trim()) ? upiId.trim() : undefined,
        vehicleType: role === 'user' ? vehicleType : undefined,
        vehicleRegistration: (role === 'user' && vehicleRegistration.trim()) ? vehicleRegistration.trim() : undefined,
      };

      const res = await fetch("/api/register/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
        }),
      });

      const payload = (await res.json()) as {
        error?: string;
        sessionId?: string;
        smsDispatched?: boolean;
        warning?: string;
        debugOtp?: string;
      };

      if (!res.ok || !payload.sessionId) {
        setError(payload.error || "Failed to send OTP. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setPendingRegistration(registerPayload);
      setOtpSessionId(payload.sessionId);
      setOtp("");
      setDebugOtp(payload.debugOtp || "");
      setOtpInfo(payload.smsDispatched ? "OTP sent to your mobile number." : (payload.warning || "OTP generated."));
      setStep("otp");
      setIsSubmitting(false);
    } catch {
      setError("Failed to send OTP. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pendingRegistration) {
      setError("Registration session expired. Please fill the form again.");
      setStep("form");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pendingRegistration,
          otp,
          otpSessionId,
        }),
      });

      const payload = (await res.json()) as { error?: string; user: User; worker?: Worker };

      if (!res.ok || !payload.user) {
        setError(payload.error || "OTP verification failed. Please try again.");
        setIsSubmitting(false);
        return;
      }

      localStorage.setItem("userId", payload.user.id);
      localStorage.setItem("userPhone", payload.user.phone);
      localStorage.setItem("userRole", payload.user.role);
      if (payload.worker) {
        localStorage.setItem("workerId", payload.worker.id);
        localStorage.setItem("userPlatform", payload.worker.platform);
      }

      // Set cookie for middleware
      document.cookie = `user-role=${payload.user.role}; path=/; max-age=3600; SameSite=Lax`;

      router.push("/dashboard");
    } catch {
      setError("OTP verification failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingRegistration) {
      setError("Registration session expired. Please fill the form again.");
      setStep("form");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/register/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: pendingRegistration.phone }),
      });

      const payload = (await res.json()) as {
        error?: string;
        sessionId?: string;
        smsDispatched?: boolean;
        warning?: string;
        debugOtp?: string;
      };

      if (!res.ok || !payload.sessionId) {
        setError(payload.error || "Failed to resend OTP.");
        setIsSubmitting(false);
        return;
      }

      setOtpSessionId(payload.sessionId);
      setOtp("");
      setDebugOtp(payload.debugOtp || "");
      setOtpInfo(payload.smsDispatched ? "OTP resent to your mobile number." : (payload.warning || "OTP regenerated."));
      setIsSubmitting(false);
    } catch {
      setError("Failed to resend OTP.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Create your account</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Join SwiftShield in a few steps.
          </p>
        </div>

        {step === "consent" && (
          <div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 bg-zinc-50 dark:bg-zinc-800/40 mb-4 max-h-64 overflow-y-auto">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
                Terms and Conditions
              </h2>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 mb-2">
                By creating an account, you confirm that you are at least 18 years old, are a registered
                delivery partner on a supported platform, and will provide accurate information.
              </p>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 mb-2">
                SwiftShield provides parametric income protection for qualifying disruption events. It does
                not cover health, vehicle damage, or personal liability. Payouts are subject to active
                subscription status, claim rules, fraud checks, and plan limits.
              </p>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 mb-2">
                Fraudulent activity, false information, or policy misuse may lead to account suspension or
                termination.
              </p>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mt-4 mb-2">
                Privacy Policy
              </h2>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 mb-2">
                We collect your profile details, platform details, and contact information to create and
                manage your account and insurance services.
              </p>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 mb-2">
                Location and activity data may be used for claim verification and fraud detection. We do not
                sell your personal data. Information may be shared only with essential service providers and
                payment partners to deliver coverage and payouts.
              </p>
              <p className="text-xs text-zinc-700 dark:text-zinc-300">
                By continuing, you consent to this data processing and acknowledge your rights to request
                correction or deletion subject to legal retention requirements.
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => {
                  setAcceptedTerms(e.target.checked);
                  setError("");
                }}
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                I agree to the Terms and Conditions and Privacy Policy.
              </span>
            </label>

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <button
              onClick={handleContinue}
              className="mt-6 w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-medium rounded-xl hover:from-blue-700 hover:to-emerald-600 transition-all"
            >
              Continue to Registration
            </button>
          </div>
        )}

        {step === "form" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg flex mb-4">
              <button
                type="button"
                onClick={() => { setRoleGroup("user"); setRole("user"); }}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${roleGroup === "user" ? "bg-white dark:bg-zinc-700 text-blue-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
              >
                DELIVERY PARTNER
              </button>
              <button
                type="button"
                onClick={() => { setRoleGroup("admin"); setRole("zonal_admin"); }}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${roleGroup === "admin" ? "bg-white dark:bg-zinc-700 text-blue-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
              >
                ADMINISTRATOR
              </button>
            </div>

            {roleGroup === "admin" && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setRole("zonal_admin")}
                  className={`py-3 px-2 text-[10px] font-black border rounded-xl transition-all ${role === "zonal_admin" ? "bg-blue-600/10 border-blue-600 text-blue-600" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}
                >
                  ZONAL_ADMIN
                </button>
                <button
                  type="button"
                  onClick={() => setRole("control_admin")}
                  className={`py-3 px-2 text-[10px] font-black border rounded-xl transition-all ${role === "control_admin" ? "bg-emerald-600/10 border-emerald-600 text-emerald-600" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}
                >
                  CONTROL_ADMIN
                </button>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Phone Number</label>
              <div className="flex">
                <span className="inline-flex items-center px-4 text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-r-0 border-zinc-300 dark:border-zinc-700 rounded-l-xl">
                  +91
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length <= 10) setPhone(value);
                  }}
                  placeholder="10-digit number"
                  className="flex-1 px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-r-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {role === 'user' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Delivery Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as Platform)}
                    className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PLATFORM_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g., Mumbai"
                    className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">UPI ID (Optional)</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@upi"
                    className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Vehicle Type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                    className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {VEHICLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Vehicle Registration Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={vehicleRegistration}
                    onChange={(e) => setVehicleRegistration(e.target.value.toUpperCase())}
                    placeholder="e.g., MH02AB1234"
                    className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting || !canSubmit}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-medium rounded-xl hover:from-blue-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? "Sending OTP..." : "Send OTP"}
            </button>

            <button
              type="button"
              onClick={() => setStep("consent")}
              className="w-full py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              Back to Terms Acceptance
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Verify OTP</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                {otpInfo || "Enter the OTP sent to your phone."}
              </p>
              {pendingRegistration?.phone && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  +91 {pendingRegistration.phone}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">6-digit OTP</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter OTP"
                className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {debugOtp && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Development Mode</p>
                <p className="text-lg font-bold text-amber-700 dark:text-amber-300 tracking-widest">
                  OTP: {debugOtp}
                </p>
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting || otp.length !== 6}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-medium rounded-xl hover:from-blue-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? "Verifying OTP..." : "Verify OTP & Create Account"}
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isSubmitting}
              className="w-full py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
            >
              Resend OTP
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("form");
                setError("");
              }}
              className="w-full py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              Back to Registration Form
            </button>
          </form>
        )}

        <div className="text-center mt-6 space-y-2">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Already registered?{" "}
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              Login here
            </Link>
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            <Link href="/" className="hover:underline">← Back to Home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
