import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { OpportunitiesExplorer } from "@/components/opportunities/OpportunitiesExplorer";
import { mockOpportunities } from "@/lib/mock-opportunities";

export const metadata: Metadata = {
  title: "Opportunities — Career Radar AI",
  description:
    "Browse internships, hackathons, scholarships, fellowships, and competitions curated for students.",
};

export default function OpportunitiesPage() {
  return (
    <div className="mesh-bg flex min-h-full flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-20 sm:pt-28">
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-x-0 -top-8 h-48 grid-overlay opacity-50" aria-hidden />

          <div className="relative">
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">
              Explore
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Discover your next{" "}
              <span className="text-gradient">opportunity</span>
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-zinc-400">
              Browse internships, hackathons, scholarships, fellowships, and
              competitions — filter by category or search by keyword.
            </p>
          </div>

          <div className="relative mt-12">
            <OpportunitiesExplorer opportunities={mockOpportunities} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
