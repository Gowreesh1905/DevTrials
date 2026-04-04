import { NextResponse } from "next/server";
import { createServerClient } from "./supabase";
import { UserRole, Worker, User } from "./database.types";

/**
 * Higher-order function to require a specific role for an API route.
 */
export async function requireRole(request: Request, allowedRoles: UserRole[]) {
  const supabase = createServerClient();
  
  // In a real application, we would use Supabase Auth session.
  // For this project, we'll check the 'workerId' or 'userId' from headers
  // since the current login system handles it that way.
  
  const userId = request.headers.get("x-user-id");
  const workerId = request.headers.get("worker-id");
                   
  if (!userId && !workerId) {
    return { error: "Unauthorized", status: 401 };
  }

  // If we have a workerId, look up the user via workers table
  if (workerId) {
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("*, user:users(*)")
      .eq("id", workerId)
      .single();

    if (workerError || !worker) {
      return { error: "Worker not found", status: 404 };
    }

    const user = (worker as any).user as User;
    if (!user || !allowedRoles.includes(user.role)) {
      return { error: "Forbidden: Insufficient permissions", status: 403 };
    }

    return { user, worker: worker as Worker, error: null };
  }

  // If we have a userId, look up the user directly
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !user) {
    return { error: "User not found", status: 404 };
  }

  const typedUser = user as User;
  if (!allowedRoles.includes(typedUser.role)) {
    return { error: "Forbidden: Insufficient permissions", status: 403 };
  }

  return { user: typedUser, error: null };
}

export const requireUser = (request: Request) => requireRole(request, ["worker"]);
export const requireZonalAdmin = (request: Request) => requireRole(request, ["zonal_admin"]);
export const requireControlAdmin = (request: Request) => requireRole(request, ["control_admin"]);
export const requireAnyAdmin = (request: Request) => requireRole(request, ["zonal_admin", "control_admin"]);
