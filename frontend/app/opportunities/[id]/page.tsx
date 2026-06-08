import { getOpportunityById, getSimilarOpportunities } from "@/lib/firestore";
import { OpportunityDetailClient } from "@/components/opportunities/OpportunityDetailClient";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Generate dynamic SEO metadata for each opportunity page
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const opp = await getOpportunityById(id);
  if (!opp) {
    return {
      title: "Opportunity Not Found | Career Radar AI",
      description: "The requested opportunity could not be found.",
    };
  }
  return {
    title: `${opp.title} | ${opp.organizer} | Career Radar AI`,
    description: opp.description.slice(0, 160),
  };
}

export default async function OpportunityDetailPage({ params }: PageProps) {
  const { id } = await params;
  const opp = await getOpportunityById(id);

  // Elegant 404 Screen if Opportunity ID is invalid/not found
  if (!opp) {
    return (
      <div className="mesh-bg flex min-h-full flex-col text-white">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center pt-32 pb-20 px-4">
          <div className="max-w-md text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Opportunity Not Found</h1>
            <p className="text-zinc-500 text-sm leading-relaxed">
              The opportunity with the requested ID does not exist or may have been removed from the database.
            </p>
            <Link
              href="/opportunities"
              className="inline-flex rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
            >
              Back To Opportunities
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Load similarity set server-side
  const similar = await getSimilarOpportunities(opp);

  return (
    <div className="mesh-bg flex min-h-full flex-col text-white">
      <Header />
      <main className="flex-1 pt-28 pb-20">
        <OpportunityDetailClient opportunity={opp} similarOpportunities={similar} />
      </main>
      <Footer />
    </div>
  );
}
