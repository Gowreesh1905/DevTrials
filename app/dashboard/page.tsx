"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    
    if (!role) {
      router.push("/login");
      return;
    }

    switch (role) {
      case "zonal_admin":
        router.push("/dashboard/zonal");
        break;
      case "control_admin":
        router.push("/dashboard/control");
        break;
      case "user":
      default:
        router.push("/dashboard/user");
        break;
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-zinc-600 dark:text-zinc-400 font-medium animate-pulse">
        Authenticating session...
      </p>
    </div>
  );
}
