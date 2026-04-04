import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { Platform, VehicleType, User, UserRole } from "@/lib/database.types";
import { verifyRegistrationOtpSession } from "@/lib/registration-otp-store";

interface RegisterPayload {
  name?: string;
  phone?: string;
  platform?: Platform;
  city?: string;
  role?: UserRole;
  upiId?: string;
  vehicleType?: VehicleType;
  vehicleRegistration?: string;
  otp?: string;
  otpSessionId?: string;
}

const PHONE_REGEX = /^\d{10}$/;
const UPI_REGEX = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/;
const VEHICLE_TYPES: VehicleType[] = ["bike", "scooter", "bicycle"];

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RegisterPayload;

    const name = payload.name?.trim();
    const phone = payload.phone?.trim();
    const platform = payload.platform;
    const city = payload.city?.trim();
    const role = payload.role || 'user'; // Default to user (delivery partner)
    const upiId = payload.upiId?.trim() || null;
    const vehicleType = payload.vehicleType;
    const vehicleRegistration = payload.vehicleRegistration?.trim() || null;
    const otp = payload.otp?.trim();
    const otpSessionId = payload.otpSessionId?.trim();

    if (!name || !phone || !otp || !otpSessionId) {
      return NextResponse.json(
        { error: "Name, phone, and OTP verification are required" },
        { status: 400 }
      );
    }

    // Role-specific validation
    if (role === 'user') {
      if (!platform || !city || !vehicleType) {
        return NextResponse.json(
          { error: "Platform, city, and vehicle details are required for delivery partners" },
          { status: 400 }
        );
      }
      if (!VEHICLE_TYPES.includes(vehicleType)) {
        return NextResponse.json({ error: "Please select a valid vehicle type" }, { status: 400 });
      }
    }

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json({ error: "Please enter a valid full name" }, { status: 400 });
    }

    if (!PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit phone number" },
        { status: 400 }
      );
    }

    if (upiId && !UPI_REGEX.test(upiId)) {
      return NextResponse.json({ error: "Please enter a valid UPI ID" }, { status: 400 });
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: "Please enter a valid 6-digit OTP" }, { status: 400 });
    }

    const otpVerification = verifyRegistrationOtpSession(otpSessionId, phone, otp);
    if (!otpVerification.ok) {
      return NextResponse.json({ error: otpVerification.error }, { status: 401 });
    }

    const admin = createAdminClient();

    // Check existing user in users table
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
        { error: "A user with this phone number already exists" },
        { status: 409 }
      );
    }

    // 1. Create Identity in users table
    const { data: user, error: userCreateError } = await admin
      .from("users")
      .insert({
        name,
        phone,
        role,
      })
      .select("*")
      .single();

    if (userCreateError || !user) {
      return NextResponse.json(
        { error: userCreateError?.message || "Failed to create user identity" },
        { status: 500 }
      );
    }

    // 2. If role is 'user', create Partner specifics in workers table
    if (role === 'user' && platform && city && vehicleType) {
      const { data: worker, error: workerCreateError } = await admin
        .from("workers")
        .insert({
          user_id: user.id,
          name,
          phone,
          platform,
          city,
          upi_id: upiId,
        } as any)
        .select("*")
        .single();

      if (workerCreateError || !worker) {
        // Rollback user creation
        await admin.from("users").delete().eq("id", user.id);
        return NextResponse.json(
          { error: workerCreateError?.message || "Failed to create worker profile" },
          { status: 500 }
        );
      }

      // 3. Create vehicle entry
      const { error: vehicleCreateError } = await admin.from("worker_vehicles").insert({
        worker_id: worker.id,
        vehicle_type: vehicleType,
        registration_number: vehicleRegistration,
        is_primary: true,
      });

      if (vehicleCreateError) {
        // Rollback
        await admin.from("workers").delete().eq("id", worker.id);
        await admin.from("users").delete().eq("id", user.id);
        return NextResponse.json({ error: "Failed to save vehicle details" }, { status: 500 });
      }

      return NextResponse.json({ user, worker }, { status: 201 });
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
