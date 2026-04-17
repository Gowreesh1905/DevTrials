import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { Platform, VehicleType, UserRole } from "@/lib/database.types";
import { verifyRegistrationOtpSession } from "@/lib/registration-otp-store";

interface RegisterPayload {
  name?: string;
  phone?: string;
  platform?: Platform;
  city?: string;  // Stored via delivery zone assignment
  role?: UserRole;
  upiId?: string;  // Note: Currently not in DB schema - for future implementation
  vehicleType?: VehicleType;
  vehicleRegistration?: string;
  otp?: string;
  otpSessionId?: string;
}

const PHONE_REGEX = /^\d{10}$/;
const UPI_REGEX = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/;
const VEHICLE_TYPES: VehicleType[] = ["bike", "scooter"];
const ROLE_VALUES: UserRole[] = ["worker", "zonal_admin", "control_admin"];

function normalizeIndianPhone(phone: string) {
  return `+91${phone}`;
}

function getPhoneLookupValues(phone: string): string[] {
  return [phone, normalizeIndianPhone(phone)];
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RegisterPayload;

    const name = payload.name?.trim();
    const phone = payload.phone?.trim();
    const platform = payload.platform;
    const city = payload.city?.trim();
    const role = payload.role || "worker";
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

    if (!ROLE_VALUES.includes(role)) {
      return NextResponse.json({ error: "Invalid role selected" }, { status: 400 });
    }

    // Role-specific validation
    if (role === "worker") {
      if (!platform || !vehicleType) {
        return NextResponse.json(
          { error: "Platform and vehicle details are required for delivery partners" },
          { status: 400 }
        );
      }
      if (!VEHICLE_TYPES.includes(vehicleType)) {
        return NextResponse.json({ error: "Please select a valid vehicle type" }, { status: 400 });
      }
      if (vehicleRegistration && vehicleRegistration.length > 20) {
        return NextResponse.json(
          { error: "Vehicle registration must be 20 characters or less" },
          { status: 400 }
        );
      }
    }

    if (role === "zonal_admin" && !city) {
      return NextResponse.json(
        { error: "City is required for zonal admin registration" },
        { status: 400 }
      );
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

    const phoneWithCountryCode = normalizeIndianPhone(phone);
    const phoneLookupValues = getPhoneLookupValues(phone);
    const admin = createAdminClient() as any;

    // Check existing user in users table
    const { data: existingUser, error: existingUserError } = await admin
      .from("users")
      .select("id")
      .in("phone", phoneLookupValues)
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
        phone: phoneWithCountryCode,
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

    // 2. If role is 'worker', create Partner specifics in workers table
    // Find or create delivery zone for city-driven roles
    let assignedZoneId: string | null = null;
    if (city) {
      const { data: existingZone, error: existingZoneError } = await admin
        .from("delivery_zones")
        .select("id")
        .ilike("city", city)
        .maybeSingle();

      if (existingZoneError) {
        await admin.from("users").delete().eq("id", user.id);
        return NextResponse.json(
          { error: existingZoneError.message || "Failed to lookup delivery zone" },
          { status: 500 }
        );
      }

      if (existingZone?.id) {
        assignedZoneId = existingZone.id;
      } else {
        const { data: createdZone, error: zoneCreateError } = await admin
          .from("delivery_zones")
          .insert({
            city,
            name: `${city} Zone`,
          })
          .select("id")
          .single();

        if (zoneCreateError || !createdZone) {
          await admin.from("users").delete().eq("id", user.id);
          return NextResponse.json(
            { error: zoneCreateError?.message || "Failed to assign delivery zone" },
            { status: 500 }
          );
        }

        assignedZoneId = createdZone.id;
      }
    }

    if (role === "worker" && platform && vehicleType) {

      const { data: worker, error: workerCreateError } = await admin
        .from("workers")
        .insert({
          user_id: user.id,
          name,
          platform,
          assigned_zone_id: assignedZoneId,
        })
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

    // 3. For admin roles, create admin profile row
    const { data: adminProfile, error: adminCreateError } = await admin
      .from("admins")
      .insert({
        user_id: user.id,
        role,
        assigned_zone_id: assignedZoneId,
      })
      .select("*")
      .single();

    if (adminCreateError || !adminProfile) {
      await admin.from("users").delete().eq("id", user.id);
      return NextResponse.json(
        { error: adminCreateError?.message || "Failed to create admin profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ user, admin: adminProfile }, { status: 201 });
  } catch (error: unknown) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to create account") },
      { status: 500 }
    );
  }
}
