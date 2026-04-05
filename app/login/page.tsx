"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Worker, User } from "@/lib/database.types";

type Platform = "blinkit" | "zepto" | "instamart" | null;
type UserRole = "worker" | "zonal_admin" | "control_admin";
type Step = "role" | "admin_role" | "platform" | "phone" | "otp";

// Platform logo components
const BlinkitLogo = ({ size = 32 }: { size?: number }) => (
  <Image
    src="/logos/blinkit.svg"
    alt="Blinkit"
    width={size}
    height={size}
    className="object-contain"
  />
);

const ZeptoLogo = ({ size = 32 }: { size?: number }) => (
  <Image
    src="/logos/zepto.svg"
    alt="Zepto"
    width={size}
    height={size}
    className="object-contain"
  />
);

const SwiggyLogo = ({ size = 32 }: { size?: number }) => (
  <Image
    src="/logos/swiggy.svg"
    alt="Swiggy Instamart"
    width={size}
    height={size}
    className="object-contain"
  />
);

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("worker");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(null);
  const [step, setStep] = useState<Step>("role");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpInfo, setOtpInfo] = useState("");
  const [debugOtp, setDebugOtp] = useState("");
  const [otpSessionId, setOtpSessionId] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);

  const handleRoleSelect = (role: "worker" | "admin") => {
    if (role === "admin") {
      setStep("admin_role");
    } else {
      setSelectedRole("worker");
      setStep("platform");
    }
  };

  const handleAdminRoleSelect = (role: "zonal_admin" | "control_admin") => {
    setSelectedRole(role);
    setStep("phone"); // Admins might not need platform selection, or we can default it.
    // For now, let's assume admins log in with phone only, or we skip platform for them.
    if (role === "zonal_admin" || role === "control_admin") {
      setSelectedPlatform("blinkit"); // Default platform for admin login if needed by API
    }
  };

  const handlePlatformSelect = (platform: Platform) => {
    setSelectedPlatform(platform);
    setStep("phone");
    setError("");
    setOtpInfo("");
    setDebugOtp("");
    setOtpSessionId("");
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For delivery partners, platform is required
    if (selectedRole === "worker" && !selectedPlatform) {
      setError("Please select a platform to continue");
      return;
    }

    if (phoneNumber.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setIsLoading(true);
    setError("");
    setOtpInfo("");
    setDebugOtp("");

    try {
      const res = await fetch("/api/login/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneNumber,
          platform: selectedPlatform,
          role: selectedRole,
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
        setIsLoading(false);
        return;
      }

      setOtpSessionId(payload.sessionId);
      setOtp(["", "", "", "", "", ""]);
      setDebugOtp(payload.debugOtp || "");
      setOtpInfo(payload.smsDispatched ? "OTP sent to your mobile number." : (payload.warning || "OTP generated."));
      setIsLoading(false);
      setStep("otp");
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For delivery partners, platform is required
    if (selectedRole === "worker" && !selectedPlatform) {
      setError("Platform selection is missing. Please try again.");
      setStep("platform");
      return;
    }

    if (!otpSessionId) {
      setError("OTP session expired. Please request a new OTP.");
      setStep("phone");
      return;
    }

    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      setError("Please enter the complete OTP");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneNumber,
          platform: selectedPlatform,
          otp: otpValue,
          otpSessionId,
          role: selectedRole,
        }),
      });

      const payload = (await res.json()) as { error?: string; user?: User; worker?: Worker; role?: UserRole };
      if (!res.ok || !payload.user) {
        setError(payload.error || "OTP verification failed. Please try again.");
        setIsLoading(false);
        return;
      }

      setUser(payload.user);
      if (payload.worker) {
        setWorker(payload.worker);
      }
      
      const userRole = payload.role || payload.user.role;
      
      // Store user info in localStorage
      localStorage.setItem("userId", payload.user.id);
      localStorage.setItem("userPhone", payload.user.phone);
      localStorage.setItem("userRole", userRole);
      
      // Store worker info if available (for delivery partners)
      if (payload.worker) {
        localStorage.setItem("workerId", payload.worker.id);
        localStorage.setItem("userPlatform", payload.worker.platform);
      }
      
      // Set a cookie for the middleware
      document.cookie = `user-role=${userRole}; path=/; max-age=3600; SameSite=Strict`;

      setIsLoading(false);
      
      // Redirect based on role
      if (userRole === "zonal_admin") {
        window.location.href = "/dashboard/zonal";
      } else if (userRole === "control_admin") {
        window.location.href = "/dashboard/control";
      } else {
        window.location.href = "/dashboard/user";
      }
    } catch {
      setError("OTP verification failed. Please try again.");
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    // For delivery partners, platform is required
    if (selectedRole === "worker" && !selectedPlatform) {
      setError("Please select a platform to continue");
      setStep("platform");
      return;
    }

    if (phoneNumber.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      setStep("phone");
      return;
    }

    setIsLoading(true);
    setError("");
    setOtpInfo("");
    setDebugOtp("");

    try {
      const res = await fetch("/api/login/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneNumber,
          platform: selectedPlatform,
          role: selectedRole,
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
        setError(payload.error || "Failed to resend OTP.");
        setIsLoading(false);
        return;
      }

      setOtpSessionId(payload.sessionId);
      setOtp(["", "", "", "", "", ""]);
      setDebugOtp(payload.debugOtp || "");
      setOtpInfo(payload.smsDispatched ? "OTP resent to your mobile number." : (payload.warning || "OTP regenerated."));
      setIsLoading(false);
    } catch {
      setError("Failed to resend OTP.");
      setIsLoading(false);
    }
  };

  const goBack = () => {
    if (step === "otp") {
      setStep("phone");
      setOtp(["", "", "", "", "", ""]);
    } else if (step === "phone") {
      if (selectedRole === "worker") {
        setStep("platform");
      } else {
        setStep("admin_role");
      }
    } else if (step === "platform") {
      setStep("role");
    } else if (step === "admin_role") {
      setStep("role");
    }
    
    setOtpInfo("");
    setDebugOtp("");
    setOtpSessionId("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-2xl mb-4 shadow-lg">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            SwiftShield
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            AI-Powered Parametric Insurance
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6">
          {/* Back Button */}
          {step !== "role" && (
            <button
              onClick={goBack}
              className="flex items-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-4 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>
          )}

          {/* Role Selection Step */}
          {step === "role" && (
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                Who are you?
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                Select your role to continue
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleRoleSelect("worker")}
                  className="w-full flex items-center justify-between p-4 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all group"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mr-4">
                      <span className="text-2xl text-blue-600 dark:text-blue-400">🚲</span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-zinc-900 dark:text-white">
                        Delivery Partner
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Login as a driver/partner
                      </p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-zinc-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => handleRoleSelect("admin")}
                  className="w-full flex items-center justify-between p-4 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all group"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mr-4">
                      <span className="text-2xl text-emerald-600 dark:text-emerald-400">🛡️</span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-zinc-900 dark:text-white">
                        Administrator
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Zonal or Control access
                      </p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-zinc-400 group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Admin Role Selection Step */}
          {step === "admin_role" && (
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                Admin Access Level
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                Choose your administration role
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleAdminRoleSelect("zonal_admin")}
                  className="w-full flex items-center justify-between p-4 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all group"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mr-4">
                      <span className="text-2xl">📍</span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-zinc-900 dark:text-white">
                        Zonal Admin
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Manage regional claims
                      </p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-zinc-400 group-hover:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => handleAdminRoleSelect("control_admin")}
                  className="w-full flex items-center justify-between p-4 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all group"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mr-4">
                      <span className="text-2xl">⚙️</span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-zinc-900 dark:text-white">
                        Control Admin
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        System-wide policies
                      </p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-zinc-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Platform Selection Step */}
          {step === "platform" && (
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                Select Platform
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                Login with your delivery platform account
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handlePlatformSelect("blinkit")}
                  className="w-full flex items-center justify-between p-4 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950/20 transition-all group"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center mr-4">
                      <BlinkitLogo size={28} />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-zinc-900 dark:text-white">Blinkit</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-zinc-400 group-hover:text-yellow-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => handlePlatformSelect("zepto")}
                  className="w-full flex items-center justify-between p-4 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-all group"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mr-4">
                      <ZeptoLogo size={28} />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-zinc-900 dark:text-white">Zepto</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-zinc-400 group-hover:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => handlePlatformSelect("instamart")}
                  className="w-full flex items-center justify-between p-4 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all group"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mr-4">
                      <SwiggyLogo size={28} />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-zinc-900 dark:text-white">Swiggy Instamart</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-zinc-400 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Phone Number Step */}
          {step === "phone" && (
            <div>
              <div className="flex items-center mb-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${
                    selectedPlatform === "blinkit"
                      ? "bg-yellow-400"
                      : selectedPlatform === "instamart"
                      ? "bg-orange-500"
                      : "bg-purple-600"
                  }`}
                >
                  {selectedPlatform === "blinkit" && <BlinkitLogo size={24} />}
                  {selectedPlatform === "zepto" && <ZeptoLogo size={24} />}
                  {selectedPlatform === "instamart" && <SwiggyLogo size={24} />}
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white uppercase">
                    {selectedRole.replace("_", " ")} Account
                  </p>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                Enter your phone number
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                We'll send an OTP to verify your account
              </p>

              <form onSubmit={handlePhoneSubmit}>
                <div className="mb-4">
                  <div className="flex">
                    <span className="inline-flex items-center px-4 text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-r-0 border-zinc-300 dark:border-zinc-700 rounded-l-xl">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        if (value.length <= 10) setPhoneNumber(value);
                      }}
                      placeholder="Enter 10-digit number"
                      className="flex-1 px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-r-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>
                  {error && (
                    <p className="mt-2 text-sm text-red-500">{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || phoneNumber.length !== 10}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-medium rounded-xl hover:from-blue-700 hover:to-emerald-600 transition-all font-semibold"
                >
                  {isLoading ? "Sending OTP..." : "Get OTP"}
                </button>
              </form>
            </div>
          )}

          {/* OTP Verification Step */}
          {step === "otp" && (
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                Verify OTP
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                Enter the 6-digit code sent to{" "}
                <span className="font-medium text-zinc-900 dark:text-white">
                  +91 {phoneNumber}
                </span>
              </p>

              <form onSubmit={handleOtpSubmit}>
                <div className="flex justify-between gap-2 mb-4">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-14 text-center text-xl font-semibold border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ))}
                </div>

                {error && <p className="mb-4 text-sm text-red-500 text-center">{error}</p>}
                {otpInfo && <p className="mb-4 text-sm text-emerald-600 text-center">{otpInfo}</p>}
                {debugOtp && (
                  <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Development Mode</p>
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-300 tracking-widest">
                      OTP: {debugOtp}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || otp.join("").length !== 6}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-medium rounded-xl hover:from-blue-700 hover:to-emerald-600 transition-all font-semibold"
                >
                  {isLoading ? "Verifying..." : "Verify & Login"}
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="w-full mt-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                >
                  Didn't receive OTP? Resend
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Register here</Link>
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">Terms of Service</Link> and{" "}
            <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</Link>
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            <Link href="/" className="hover:underline">← Back to Home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
