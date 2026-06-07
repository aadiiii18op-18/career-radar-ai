"use client";

import { useAuth } from "@/contexts/AuthProvider";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { 
  getProfile, 
  getSavedOpportunities, 
  saveOpportunity, 
  unsaveOpportunity, 
  getOpportunities,
  getApplications,
  setApplicationStatus,
  removeApplication,
  type Application
} from "@/lib/firestore";
import { calculateMatchScore } from "@/lib/match-score";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import type { Opportunity } from "@/types/opportunity";
import type { UserProfile } from "@/types/profile";

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

export function ApplicationTrackerSummary() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ saved: 0, applied: 0, interview: 0, offer: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);

  const fetchCounts = useCallback(() => {
    if (user?.uid) {
      Promise.all([
        getSavedOpportunities(user.uid),
        getApplications(user.uid)
      ])
        .then(([savedIds, applications]) => {
          const appOppIds = new Set(applications.map((a) => a.opportunityId));
          const savedCount = savedIds.filter((id) => !appOppIds.has(id)).length;
          
          const countsObj = {
            saved: savedCount,
            applied: applications.filter((a) => a.status === "applied").length,
            interview: applications.filter((a) => a.status === "interview").length,
            offer: applications.filter((a) => a.status === "offer").length,
            rejected: applications.filter((a) => a.status === "rejected").length,
          };
          setCounts(countsObj);
        })
        .catch((err) => console.error("Error loading tracker counts:", err))
        .finally(() => setLoading(false));
    }
  }, [user]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchCounts();
    });
    window.addEventListener("tracker-updated", fetchCounts);
    window.addEventListener("bookmark-updated", fetchCounts);
    return () => {
      window.removeEventListener("tracker-updated", fetchCounts);
      window.removeEventListener("bookmark-updated", fetchCounts);
    };
  }, [fetchCounts]);

  if (loading) {
    return (
      <div className="mt-12 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02] p-6 h-24" />
    );
  }

  const stages = [
    { label: "Saved", count: counts.saved, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    { label: "Applied", count: counts.applied, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    { label: "Interview", count: counts.interview, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    { label: "Offer", count: counts.offer, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
    { label: "Rejected", count: counts.rejected, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  ];

  return (
    <div className="mt-12">
      <h2 className="text-xl font-bold tracking-tight text-white">Application Tracker Summary</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {stages.map((stage) => (
          <div key={stage.label} className="rounded-xl border border-white/5 bg-white/[0.01] p-4 text-center">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold border ${stage.color}`}>
              {stage.label}
            </span>
            <p className="mt-2 text-2xl font-bold text-white">{stage.count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ApplicationTrackerBoard() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    if (user?.uid) {
      Promise.all([
        getOpportunities(),
        getSavedOpportunities(user.uid),
        getApplications(user.uid),
        getProfile(user.uid)
      ])
        .then(([allOpps, bookmarks, apps, prof]) => {
          setOpportunities(allOpps);
          setSavedIds(bookmarks);
          setApplications(apps);
          setProfile(prof);
        })
        .catch((err) => console.error("Error loading tracker board data:", err))
        .finally(() => setLoading(false));
    }
  }, [user]);

  useEffect(() => {
    Promise.resolve().then(() => {
      loadData();
    });
    window.addEventListener("tracker-updated", loadData);
    window.addEventListener("bookmark-updated", loadData);
    return () => {
      window.removeEventListener("tracker-updated", loadData);
      window.removeEventListener("bookmark-updated", loadData);
    };
  }, [loadData]);

  const handleStatusChange = async (oppId: string, status: "applied" | "interview" | "offer" | "rejected" | "none") => {
    if (!user) return;

    setApplications((prev) => {
      const filtered = prev.filter((a) => a.opportunityId !== oppId);
      if (status === "none") return filtered;
      return [...filtered, { opportunityId: oppId, status }];
    });

    try {
      if (status === "none") {
        await removeApplication(user.uid, oppId);
      } else {
        await setApplicationStatus(user.uid, oppId, status);
      }
      window.dispatchEvent(new Event("tracker-updated"));
    } catch (err) {
      console.error("Failed to update status:", err);
      loadData();
    }
  };

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
      loadData();
    }
  };

  if (loading) {
    return (
      <div className="mt-12 border-t border-white/5 pt-10">
        <h2 className="text-2xl font-bold tracking-tight text-white">Tracker Board</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-96 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
          ))}
        </div>
      </div>
    );
  }

  const appMap = new Map(applications.map((a) => [a.opportunityId, a.status]));
  const savedOpps = opportunities.filter((opp) => savedIds.includes(opp.id) && !appMap.has(opp.id));
  const appliedOpps = opportunities.filter((opp) => appMap.get(opp.id) === "applied");
  const interviewOpps = opportunities.filter((opp) => appMap.get(opp.id) === "interview");
  const offerOpps = opportunities.filter((opp) => appMap.get(opp.id) === "offer");
  const rejectedOpps = opportunities.filter((opp) => appMap.get(opp.id) === "rejected");

  const columns = [
    { label: "Saved", opportunities: savedOpps },
    { label: "Applied", opportunities: appliedOpps },
    { label: "Interview", opportunities: interviewOpps },
    { label: "Offer", opportunities: offerOpps },
    { label: "Rejected", opportunities: rejectedOpps },
  ];

  return (
    <div className="mt-16 border-t border-white/5 pt-10">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Application Tracker Board</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Manage your opportunities visually and move them through application stages.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-6 overflow-x-auto pb-4 lg:flex-row lg:items-start lg:snap-x">
        {columns.map((column) => (
          <div 
            key={column.label} 
            className="flex flex-col rounded-2xl border border-white/5 bg-white/[0.01] p-4 lg:w-80 lg:shrink-0 lg:snap-align-start"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <h3 className="font-semibold text-white">{column.label}</h3>
              <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-zinc-400">
                {column.opportunities.length}
              </span>
            </div>

            <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-1">
              {column.opportunities.length > 0 ? (
                column.opportunities.map((opp) => {
                  const { score, reasons } = calculateMatchScore(profile, opp);
                  return (
                    <div key={opp.id} className="w-full shrink-0 snap-align-start">
                      <OpportunityCard
                        opportunity={opp}
                        isSaved={savedIds.includes(opp.id)}
                        onToggleSave={() => handleToggleSave(opp.id)}
                        matchScore={score}
                        matchReasons={reasons}
                        trackerStatus={appMap.get(opp.id) || "none"}
                        onChangeTrackerStatus={(status) => handleStatusChange(opp.id, status)}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-white/5 py-12 text-center text-zinc-500 text-sm">
                  No opportunities
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
