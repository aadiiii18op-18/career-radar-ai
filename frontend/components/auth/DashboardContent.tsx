"use client";

import { useAuth } from "@/contexts/AuthProvider";

export function DashboardContent() {
  const { user } = useAuth();

  const displayName = user?.displayName || user?.email || "there";

  return (
    <p className="mt-4 max-w-xl text-lg text-zinc-400">
      Welcome back,{" "}
      <span className="font-medium text-zinc-200">{displayName}</span>. Track
      your opportunities and stay ahead of deadlines.
    </p>
  );
}
