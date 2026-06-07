"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthProvider";
import { LogoutButton } from "./LogoutButton";

export function HeaderAuthActions() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-9 w-16 animate-pulse rounded-full bg-white/5" />
        <div className="h-9 w-28 animate-pulse rounded-full bg-white/5" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="hidden rounded-full px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white sm:inline-flex"
        >
          Dashboard
        </Link>
        <Link
          href="/profile"
          className="hidden rounded-full px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white sm:inline-flex"
        >
          Profile
        </Link>
        <LogoutButton />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        className="hidden rounded-full px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white sm:inline-flex"
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition-all hover:bg-zinc-100 hover:shadow-lg hover:shadow-white/10"
      >
        Get started
      </Link>
    </div>
  );
}
