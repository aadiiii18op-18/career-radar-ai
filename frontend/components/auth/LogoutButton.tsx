"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/firebase/auth";

interface LogoutButtonProps {
  variant?: "primary" | "ghost";
  className?: string;
}

export function LogoutButton({ variant = "ghost", className = "" }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await signOut();
      router.replace("/login");
    } catch {
      setLoading(false);
    }
  }

  const baseClassName =
    variant === "primary"
      ? "rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
      : "rounded-full px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white";

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={`${baseClassName} disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {loading ? "Signing out…" : "Log out"}
    </button>
  );
}
