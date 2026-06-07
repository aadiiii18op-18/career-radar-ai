import type { Metadata } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardContent, SavedOpportunitiesCount, SavedOpportunitiesSection, AIRecommendationsCount, AIRecommendationsSection, ApplicationTrackerSummary, ApplicationTrackerBoard } from "@/components/auth/DashboardContent";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";

export const metadata: Metadata = {
  title: "Dashboard — Career Radar AI",
  description: "Your Career Radar AI dashboard.",
};

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="mesh-bg flex min-h-full flex-col">
        <Header />
        <main className="flex-1 pt-24 pb-20 sm:pt-28">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div
              className="pointer-events-none absolute inset-x-0 -top-8 h-48 grid-overlay opacity-50"
              aria-hidden
            />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">
                  Dashboard
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Your career{" "}
                  <span className="text-gradient">command center</span>
                </h1>
                <DashboardContent />
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0 self-start sm:self-auto">
                <Link
                  href="/profile"
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40"
                >
                  Edit Profile
                </Link>
                <LogoutButton variant="primary" className="shrink-0" />
              </div>
            </div>

            <div className="relative mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/opportunities"
                className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:border-white/10 hover:bg-white/[0.04]"
              >
                <div className="mb-4 inline-flex rounded-xl bg-indigo-500/10 p-3 text-indigo-400 ring-1 ring-indigo-500/20">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white group-hover:text-indigo-100">
                  Browse opportunities
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Explore internships, hackathons, scholarships, and more.
                </p>
              </Link>

              <SavedOpportunitiesCount />

              <AIRecommendationsCount />
            </div>

            <ApplicationTrackerSummary />
            <ApplicationTrackerBoard />
            <SavedOpportunitiesSection />
            <AIRecommendationsSection />
          </div>
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
