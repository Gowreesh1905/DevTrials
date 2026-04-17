import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { createRegistrationOtpSession } from "@/lib/registration-otp-store";

interface SendOtpPayload {
  phone?: string;
}

interface DbError {
  code?: string;
  message?: string;
}

const PHONE_REGEX = /^\d{10}$/;

function normalizeIndianPhone(phone: string) {
  return `+91${phone}`;
}

function getPhoneLookupValues(phone: string): string[] {
  return [phone, normalizeIndianPhone(phone)];
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
    const payload = (await request.json()) as SendOtpPayload;
    const phone = payload.phone?.trim();

    if (!phone || !PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit phone number" },
        { status: 400 }
      );
    }

    const phoneLookupValues = getPhoneLookupValues(phone);

    const admin = createAdminClient();
    
    // Check users table (primary auth table) for existing phone
    const { data: existingUser, error: existingUserError } = await admin
      .from("users")
      .select("id")
      .in("phone", phoneLookupValues)
      .maybeSingle();

    if (existingUserError) {
      if (isPermissionDenied(existingUserError)) {
        return NextResponse.json(
          { error: "Database permissions are not configured for registration checks. Apply latest Supabase migrations and verify service role key." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: existingUserError.message }, { status: 500 });
    }

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this phone number already exists. Please login instead." },
        { status: 409 }
      );
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
    console.error("Registration OTP error:", error);
    const message = error instanceof Error ? error.message : "Failed to send OTP";
    return NextResponse.json({ 
      error: message,
    }, { status: 500 });
  }
}
