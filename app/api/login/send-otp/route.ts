import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { createRegistrationOtpSession } from "@/lib/registration-otp-store";
import type { Platform, UserRole } from "@/lib/database.types";

interface LoginSendOtpPayload {
  phone?: string;
  platform?: Platform;
  role?: UserRole;
}

const PHONE_REGEX = /^\d{10}$/;
const PLATFORM_VALUES: Platform[] = ["blinkit", "zepto", "instamart"];

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as LoginSendOtpPayload;
    const phone = payload.phone?.trim();
    const platform = payload.platform;
    const requestedRole = payload.role || "user";

    if (!phone || !PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit phone number" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Check if user exists in the users table (primary auth table)
    const { data: userData, error: userError } = await admin
      .from("users")
      .select("id, name, phone, role")
      .eq("phone", phone)
      .maybeSingle();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    if (!userData) {
      return NextResponse.json(
        { error: "No account found with this phone number. Please check and try again." },
        { status: 404 }
      );
    }

    // Role validation - ensure user has the requested role
    if (userData.role !== requestedRole) {
      if (requestedRole === "user") {
        return NextResponse.json(
          { error: "This account is registered as an administrator. Please select the correct role." },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: `Your account does not have ${requestedRole.replace('_', ' ')} access.` },
        { status: 403 }
      );
    }

    // For delivery partners (role='user'), validate platform
    if (requestedRole === "user") {
      if (!platform || !PLATFORM_VALUES.includes(platform)) {
        return NextResponse.json({ error: "Please select a valid platform" }, { status: 400 });
      }

      // Check worker's platform
      const { data: workerData, error: workerError } = await admin
        .from("workers")
        .select("id, platform")
        .eq("user_id", userData.id)
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

      if (workerData.platform !== platform) {
        const platformName =
          workerData.platform === "blinkit"
            ? "Blinkit"
            : workerData.platform === "instamart"
              ? "Swiggy Instamart"
              : "Zepto";

        return NextResponse.json(
          { error: `This number is registered with ${platformName}` },
          { status: 409 }
        );
      }
    }

    const { sessionId, otp, ttlSeconds } = createRegistrationOtpSession(phone);

    // Development mode: Always return OTP for display on frontend
    return NextResponse.json({
      sessionId,
      ttlSeconds,
      smsDispatched: false,
      debugOtp: otp,
      warning: "Development mode: OTP displayed on screen",
    });
  } catch {
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
