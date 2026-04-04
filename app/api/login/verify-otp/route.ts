import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { verifyRegistrationOtpSession } from "@/lib/registration-otp-store";
import { Platform, User, UserRole, Worker } from "@/lib/database.types";

interface LoginVerifyOtpPayload {
  phone?: string;
  platform?: Platform;
  otp?: string;
  otpSessionId?: string;
  role?: UserRole;
}

const PHONE_REGEX = /^\d{10}$/;
const OTP_REGEX = /^\d{6}$/;
const PLATFORM_VALUES: Platform[] = ["blinkit", "zepto", "instamart"];

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as LoginVerifyOtpPayload;
    const phone = payload.phone?.trim();
    const platform = payload.platform;
    const otp = payload.otp?.trim();
    const otpSessionId = payload.otpSessionId?.trim();
    const requestedRole = payload.role || "user";

    if (!phone || !PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit phone number" },
        { status: 400 }
      );
    }

    if (!otp || !OTP_REGEX.test(otp)) {
      return NextResponse.json({ error: "Please enter a valid 6-digit OTP" }, { status: 400 });
    }

    if (!otpSessionId) {
      return NextResponse.json({ error: "OTP session is required" }, { status: 400 });
    }

    const verification = verifyRegistrationOtpSession(otpSessionId, phone, otp);
    if (!verification.ok) {
      return NextResponse.json({ error: verification.error }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: user, error: userError } = await admin
      .from("users")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this phone number. Please check and try again." },
        { status: 404 }
      );
    }

    const typedUser = user as User;

    // Role Validation - check if user has the requested role access
    if (requestedRole !== "user" && typedUser.role !== requestedRole) {
      return NextResponse.json({ 
        error: `Unauthorized: Your account does not have the ${requestedRole.replace('_', ' ')} role.` 
      }, { status: 403 });
    }

    // For delivery partners (role='user'), validate platform and get worker data
    let worker: Worker | null = null;
    if (typedUser.role === "user") {
      if (!platform || !PLATFORM_VALUES.includes(platform)) {
        return NextResponse.json({ error: "Please select a valid platform" }, { status: 400 });
      }

      const { data: workerData, error: workerError } = await admin
        .from("workers")
        .select("*")
        .eq("user_id", typedUser.id)
        .maybeSingle();

      if (workerError) {
        return NextResponse.json({ error: workerError.message }, { status: 500 });
      }

      if (!workerData) {
        return NextResponse.json(
          { error: "Worker profile not found. Please contact support." },
          { status: 404 }
        );
      }

      worker = workerData as Worker;

      if (worker.platform !== platform) {
        const platformName =
          worker.platform === "blinkit"
            ? "Blinkit"
            : worker.platform === "instamart"
              ? "Swiggy Instamart"
              : "Zepto";
        return NextResponse.json(
          { error: `This number is registered with ${platformName}` },
          { status: 409 }
        );
      }
    }

    // Return user data and optionally worker data for delivery partners
    return NextResponse.json({ 
      user: typedUser,
      worker: worker,
      role: typedUser.role 
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 });
  }
}
