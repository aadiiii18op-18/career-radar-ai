import { OpportunityDetailClient } from "@/components/opportunities/OpportunityDetailClient";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Opportunity Details | Career Radar AI",
  description: "View details, requirements, and personalized AI match scores for this opportunity on CareerRadar.",
};

export default async function OpportunityDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="mesh-bg flex min-h-full flex-col text-white">
      <Header />
      <main className="flex-1 pt-28 pb-20">
        <OpportunityDetailClient id={id} />
      </main>
      <Footer />
    </div>
  );
}
