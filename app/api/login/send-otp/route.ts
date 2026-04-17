import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { createRegistrationOtpSession } from "@/lib/registration-otp-store";
import type { Platform, UserRole } from "@/lib/database.types";

interface LoginSendOtpPayload {
  phone?: string;
  platform?: Platform;
  role?: UserRole;
}

interface DbError {
  code?: string;
  message?: string;
}

const PHONE_REGEX = /^\d{10}$/;
const PLATFORM_VALUES: Platform[] = ["blinkit", "zepto", "instamart"];

function getPhoneLookupValues(phone: string): string[] {
  return [phone, `+91${phone}`];
}

function isPermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const dbError = error as DbError;
  return dbError.code === "42501" || (dbError.message || "").toLowerCase().includes("permission denied");
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as LoginSendOtpPayload;
    const phone = payload.phone?.trim();
    const platform = payload.platform;
    const requestedRole = payload.role || "worker";

    // Validate phone
    if (!phone || !PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit phone number" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Check if user exists in the users table
    const phoneLookupValues = getPhoneLookupValues(phone);
    const { data: userData, error: userError } = await admin
      .from("users")
      .select("id, name, phone, role")
      .in("phone", phoneLookupValues)
      .maybeSingle();

    if (userError) {
      console.error("User lookup error:", userError);
      if (isPermissionDenied(userError)) {
        return NextResponse.json(
          { error: "Database permissions are not configured for login checks. Apply latest Supabase migrations and verify service role key." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    if (!userData) {
      return NextResponse.json(
        { error: "No account found with this phone number. Please register first." },
        { status: 404 }
      );
    }

    // Role validation - ensure user has the requested role
    if (userData.role !== requestedRole) {
      if (requestedRole === "worker") {
        return NextResponse.json(
          { error: "This account is registered as an administrator. Please use the admin login." },
          { status: 403 }
        );
      }
      // User is trying to login as admin but has worker role
      return NextResponse.json(
        { error: "This account is registered as a delivery partner. Please use the partner login." },
        { status: 403 }
      );
    }

    // For delivery partners (role='worker'), validate platform
    if (requestedRole === "worker") {
      if (!platform || !PLATFORM_VALUES.includes(platform)) {
        return NextResponse.json({ error: "Please select your delivery platform" }, { status: 400 });
      }

      // Check worker profile exists and matches platform
      const { data: workerData, error: workerError } = await admin
        .from("workers")
        .select("id, platform")
        .eq("user_id", userData.id)
        .maybeSingle();

      if (workerError) {
        console.error("Worker lookup error:", workerError);
        return NextResponse.json({ error: workerError.message }, { status: 500 });
      }

      if (!workerData) {
        return NextResponse.json(
          { error: "Worker profile not found. Please complete your registration." },
          { status: 404 }
        );
      }

      // Platform validation - check if worker's registered platform matches login platform
      if (workerData.platform && workerData.platform !== platform) {
        const platformName =
          workerData.platform === "blinkit"
            ? "Blinkit"
            : workerData.platform === "instamart"
              ? "Swiggy Instamart"
              : "Zepto";

        return NextResponse.json(
          { error: `This account is registered with ${platformName}. Please select the correct platform.` },
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
  } catch (error: unknown) {
    console.error("Login OTP error:", error);
    const message = error instanceof Error ? error.message : "Failed to send OTP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
