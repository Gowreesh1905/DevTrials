import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { createRegistrationOtpSession } from "@/lib/registration-otp-store";

interface SendOtpPayload {
  phone?: string;
}

const PHONE_REGEX = /^\d{10}$/;

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

    const admin = createAdminClient();
    
    // Check users table (primary auth table) for existing phone
    const { data: existingUser, error: existingUserError } = await admin
      .from("users")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (existingUserError) {
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
  } catch {
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
