"use client";

import { useAuth } from "@/contexts/AuthProvider";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Stats } from "@/components/landing/Stats";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { PersonalizedFeed } from "@/components/opportunities/PersonalizedFeed";

export default function Home() {
  const { user, loading } = useAuth();

  // Prevent flash of landing page content while checking auth state
  if (loading) {
    return (
      <div className="mesh-bg flex min-h-full flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-24 pb-20">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-sm text-zinc-500">Loading feed…</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="mesh-bg flex min-h-full flex-col">
      <Header />
      {user ? (
        // Logged-In User Homepage Layout
        <main className="flex-1 pt-24 pb-20 sm:pt-28">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div
              className="pointer-events-none absolute inset-x-0 -top-8 h-48 grid-overlay opacity-50"
              aria-hidden
            />
            <PersonalizedFeed />
          </div>
        </main>
      ) : (
        // Logged-Out Guest Landing Page Layout
        <main className="flex-1">
          <Hero />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-20">
            <PersonalizedFeed />
          </div>
          <Features />
          <Stats />
          <CTA />
        </main>
      )}
      <Footer />
    </div>
  );
}
