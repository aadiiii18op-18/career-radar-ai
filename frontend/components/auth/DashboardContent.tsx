"use client";

import { useAuth } from "@/contexts/AuthProvider";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { getProfile, getSavedOpportunities, saveOpportunity, unsaveOpportunity, getOpportunities } from "@/lib/firestore";
import { calculateMatchScore } from "@/lib/match-score";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import type { Opportunity } from "@/types/opportunity";

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

export function SavedOpportunitiesCount() {
  const { user } = useAuth();
  const [count, setCount] = useState<number | null>(null);

  const fetchCount = useCallback(() => {
    if (user?.uid) {
      getSavedOpportunities(user.uid)
        .then((ids) => setCount(ids.length))
        .catch((err) => console.error("Error loading bookmarks count:", err));
    }
  }, [user]);

  useEffect(() => {
    fetchCount();
    
    window.addEventListener("bookmark-updated", fetchCount);
    return () => {
      window.removeEventListener("bookmark-updated", fetchCount);
    };
  }, [fetchCount]);

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
      <div className="mb-4 inline-flex rounded-xl bg-emerald-500/10 p-3 text-emerald-400 ring-1 ring-emerald-500/20">
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
            d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-white">Saved opportunities</h2>
      <p className="mt-2 text-3xl font-bold text-white tracking-tight">
        {count === null ? "…" : count}
      </p>
      <p className="mt-1 text-sm text-zinc-400">
        opportunities bookmarked
      </p>
    </div>
  );
}

export function SavedOpportunitiesSection() {
  const { user } = useAuth();
  const [savedOpportunities, setSavedOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSaved = useCallback(() => {
    if (user?.uid) {
      Promise.resolve().then(() => {
        setLoading(true);
      });
      Promise.all([
        getSavedOpportunities(user.uid),
        getOpportunities(),
      ])
        .then(([savedIds, allOpps]) => {
          const saved = allOpps.filter((opp) => savedIds.includes(opp.id));
          setSavedOpportunities(saved);
        })
        .catch((err) => console.error("Error loading saved opportunities:", err))
        .finally(() => {
          setLoading(false);
        });
    } else {
      Promise.resolve().then(() => {
        setSavedOpportunities([]);
        setLoading(false);
      });
    }
  }, [user]);

  useEffect(() => {
    loadSaved();

    window.addEventListener("bookmark-updated", loadSaved);
    return () => {
      window.removeEventListener("bookmark-updated", loadSaved);
    };
  }, [loadSaved]);

  const handleUnsave = async (oppId: string) => {
    if (!user) return;

    // Optimistic Update
    setSavedOpportunities((prev) => prev.filter((opp) => opp.id !== oppId));

    try {
      await unsaveOpportunity(user.uid, oppId);
      window.dispatchEvent(new Event("bookmark-updated"));
    } catch (err) {
      console.error("Failed to unsave opportunity:", err);
      loadSaved();
    }
  };

  if (loading) {
    return (
      <div className="mt-16 border-t border-white/5 pt-10">
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Your saved opportunities
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-16 border-t border-white/5 pt-10">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Your saved opportunities
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          A collection of opportunities you have bookmarked.
        </p>
      </div>

      {savedOpportunities.length > 0 ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {savedOpportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              isSaved={true}
              onToggleSave={() => handleUnsave(opportunity.id)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
          <p className="text-base font-medium text-white">No saved opportunities yet</p>
          <p className="mt-1 text-sm text-zinc-500">
            Browse opportunities and click the bookmark icon to save them.
          </p>
          <Link
            href="/opportunities"
            className="mt-5 inline-flex rounded-full bg-white px-5 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-zinc-100"
          >
            Browse Opportunities
          </Link>
        </div>
      )}
    </div>
  );
}

export function AIRecommendationsCount() {
  const { user } = useAuth();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (user?.uid) {
      Promise.all([
        getProfile(user.uid),
        getOpportunities(),
      ])
        .then(([profile, allOpps]) => {
          if (!profile) {
            setCount(0);
            return;
          }
          const matches = allOpps.filter((opp) => {
            const { score } = calculateMatchScore(profile, opp);
            return score >= 80;
          });
          setCount(matches.length);
        })
        .catch((err) => console.error("Error loading recommendations count:", err));
    }
  }, [user]);

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
      <div className="mb-4 inline-flex rounded-xl bg-cyan-500/10 p-3 text-cyan-400 ring-1 ring-cyan-500/20">
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
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-white">AI recommendations</h2>
      <p className="mt-2 text-3xl font-bold text-white tracking-tight">
        {count === null ? "…" : count}
      </p>
      <p className="mt-1 text-sm text-zinc-400">
        {count !== null ? `${count} strong match${count !== 1 ? "es" : ""}` : "loading recommendations…"}
      </p>
    </div>
  );
}

export function AIRecommendationsSection() {
  const { user } = useAuth();
  const [recommended, setRecommended] = useState<{ opportunity: Opportunity; score: number; reasons: string[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  const loadRecommendations = useCallback(() => {
    if (user?.uid) {
      Promise.resolve().then(() => {
        setLoading(true);
      });

      Promise.all([
        getSavedOpportunities(user.uid),
        getProfile(user.uid),
        getOpportunities(),
      ])
        .then(([savedIds, profile, allOpps]) => {
          setSavedIds(savedIds);
          if (!profile) {
            setRecommended([]);
            return;
          }
          const items = allOpps.map((opp) => {
            const { score, reasons } = calculateMatchScore(profile, opp);
            return { opportunity: opp, score, reasons };
          });
          items.sort((a, b) => b.score - a.score);
          setRecommended(items.slice(0, 3));
        })
        .catch((err) => console.error("Error loading recommendations:", err))
        .finally(() => {
          setLoading(false);
        });
    } else {
      Promise.resolve().then(() => {
        setRecommended([]);
        setLoading(false);
      });
    }
  }, [user]);

  useEffect(() => {
    loadRecommendations();
    window.addEventListener("bookmark-updated", loadRecommendations);
    return () => {
      window.removeEventListener("bookmark-updated", loadRecommendations);
    };
  }, [loadRecommendations]);

  const handleToggleSave = async (oppId: string) => {
    if (!user) return;
    const isSaved = savedIds.includes(oppId);
    setSavedIds((prev) =>
      isSaved ? prev.filter((id) => id !== oppId) : [...prev, oppId]
    );
    try {
      if (isSaved) {
        await unsaveOpportunity(user.uid, oppId);
      } else {
        await saveOpportunity(user.uid, oppId);
      }
      window.dispatchEvent(new Event("bookmark-updated"));
    } catch (err) {
      console.error("Failed to toggle bookmark:", err);
      loadRecommendations();
    }
  };

  if (loading) {
    return (
      <div className="mt-16 border-t border-white/5 pt-10">
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Recommended for You
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
          ))}
        </div>
      </div>
    );
  }

  if (recommended.length === 0) return null;

  return (
    <div className="mt-16 border-t border-white/5 pt-10">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Recommended for You
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Top opportunity matches based on your profile skills and interests.
        </p>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {recommended.map(({ opportunity, score, reasons }) => (
          <OpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
            isSaved={savedIds.includes(opportunity.id)}
            onToggleSave={() => handleToggleSave(opportunity.id)}
            matchScore={score}
            matchReasons={reasons}
          />
        ))}
      </div>
    </div>
  );
}
