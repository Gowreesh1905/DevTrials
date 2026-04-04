import { NextResponse } from "next/server";
import { createServerClient } from "./supabase";
import { UserRole, Worker } from "./database.types";

/**
 * Higher-order function to require a specific role for an API route.
 */
export async function requireRole(request: Request, allowedRoles: UserRole[]) {
  const supabase = createServerClient();
  
  // In a real application, we would use Supabase Auth session.
  // For this project, we'll check the 'workerId' from headers or cookies
  // since the current login system handles it that way.
  
  const workerId = request.headers.get("x-user-id") || 
                   request.headers.get("worker-id");
                   
  if (!workerId) {
    return { error: "Unauthorized", status: 401 };
  }

  const { data: user, error } = await supabase
    .from("workers")
    .select("*")
    .eq("id", workerId)
    .single();

  if (error || !user) {
    return { error: "User not found", status: 404 };
  }

  const worker = user as Worker;
  if (!allowedRoles.includes(worker.role)) {
    return { error: "Forbidden: Insufficient permissions", status: 403 };
  }

  return { user, error: null };
}

export const requireUser = (request: Request) => requireRole(request, ["user"]);
export const requireZonalAdmin = (request: Request) => requireRole(request, ["zonal_admin"]);
export const requireControlAdmin = (request: Request) => requireRole(request, ["control_admin"]);
export const requireAnyAdmin = (request: Request) => requireRole(request, ["zonal_admin", "control_admin"]);
