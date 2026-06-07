"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { useRouter } from "next/navigation";
import { 
  getOpportunities, 
  getProfile, 
  getSavedOpportunities, 
  saveOpportunity, 
  unsaveOpportunity,
  getApplications,
  setApplicationStatus,
  removeApplication,
  type ApplicationStatus,
  type Application
} from "@/lib/firestore";
import { calculateMatchScore } from "@/lib/match-score";
import {
  ALL_CATEGORIES,
  categoryFilters,
  type CategoryFilter,
} from "@/lib/categories";
import type { Opportunity } from "@/types/opportunity";
import { OpportunityCard } from "./OpportunityCard";
import type { UserProfile } from "@/types/profile";

interface OpportunitiesExplorerProps {
  opportunities: Opportunity[];
}

export function OpportunitiesExplorer({ opportunities = [] }: OpportunitiesExplorerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>(ALL_CATEGORIES);
  const { user } = useAuth();
  const router = useRouter();
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [profile, setProfile] = useState<Omit<UserProfile, "updatedAt"> | null>(null);
  const [opportunitiesList, setOpportunitiesList] = useState<Opportunity[]>(opportunities);
  const [loadingOpps, setLoadingOpps] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);

  // Fetch opportunities from Firestore on mount
  useEffect(() => {
    getOpportunities()
      .then(setOpportunitiesList)
      .catch((err) => console.error("Error loading opportunities:", err))
      .finally(() => {
        setLoadingOpps(false);
      });
  }, []);

  // Fetch profile on mount/user change
  useEffect(() => {
    if (user?.uid) {
      getProfile(user.uid)
        .then(setProfile)
        .catch((err) => console.error("Error fetching profile:", err));
    } else {
      Promise.resolve().then(() => {
        setProfile(null);
      });
    }
  }, [user]);

  // Helper fetch functions
  const fetchSaved = useCallback(() => {
    if (user?.uid) {
      getSavedOpportunities(user.uid)
        .then(setSavedIds)
        .catch((err) => console.error("Error fetching saved opportunities:", err));
    } else {
      Promise.resolve().then(() => {
        setSavedIds([]);
      });
    }
  }, [user]);

  const fetchApplications = useCallback(() => {
    if (user?.uid) {
      getApplications(user.uid)
        .then(setApplications)
        .catch((err) => console.error("Error fetching applications:", err));
    } else {
      Promise.resolve().then(() => {
        setApplications([]);
      });
    }
  }, [user]);
 
  // Fetch saved opportunities on mount/user change
  useEffect(() => {
    Promise.resolve().then(() => {
      fetchSaved();
    });
    window.addEventListener("bookmark-updated", fetchSaved);
    return () => {
      window.removeEventListener("bookmark-updated", fetchSaved);
    };
  }, [user, fetchSaved]);

  // Fetch applications on mount/user change
  useEffect(() => {
    Promise.resolve().then(() => {
      fetchApplications();
    });
    window.addEventListener("tracker-updated", fetchApplications);
    window.addEventListener("bookmark-updated", fetchApplications);
    return () => {
      window.removeEventListener("tracker-updated", fetchApplications);
      window.removeEventListener("bookmark-updated", fetchApplications);
    };
  }, [user, fetchApplications]);

  const handleToggleSave = async (oppId: string) => {
    if (!user) {
      router.push("/login");
      return;
    }

    const isSaved = savedIds.includes(oppId);
    // Optimistic Update
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
      console.error("Failed to save/unsave bookmark:", err);
      // Revert optimistic update
      setSavedIds((prev) =>
        isSaved ? [...prev, oppId] : prev.filter((id) => id !== oppId)
      );
    }
  };

  const handleStatusChange = async (oppId: string, status: ApplicationStatus | "none") => {
    if (!user) {
      router.push("/login");
      return;
    }

    // Optimistic Update
    setApplications((prev) => {
      const filteredList = prev.filter((app) => app.opportunityId !== oppId);
      if (status === "none") return filteredList;
      return [...filteredList, { opportunityId: oppId, status }];
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
      fetchApplications();
    }
  };

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return opportunitiesList.filter((opp) => {
      const matchesCategory =
        category === ALL_CATEGORIES || opp.category === category;

      if (!normalizedQuery) return matchesCategory;

      const haystack = [
        opp.title,
        opp.organizer,
        opp.description,
        opp.category,
      ]
        .join(" ")
        .toLowerCase();

      return matchesCategory && haystack.includes(normalizedQuery);
    });
  }, [opportunitiesList, query, category]);

  if (loadingOpps) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-sm text-zinc-500">Loading opportunities…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, organizer, or keyword…"
            aria-label="Search opportunities"
            className="w-full rounded-full border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <p className="shrink-0 text-sm text-zinc-500">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div
        className="mt-6 flex flex-wrap gap-2"
        role="group"
        aria-label="Filter by category"
      >
        {categoryFilters.map((filter) => {
          const isActive = category === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setCategory(filter)}
              aria-pressed={isActive}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "bg-white text-zinc-950 shadow-lg shadow-white/10"
                  : "border border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white"
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {filtered.length > 0 ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((opportunity) => {
            const { score, reasons } = calculateMatchScore(profile, opportunity);
            const app = applications.find((a) => a.opportunityId === opportunity.id);
            const trackerStatus = app ? app.status : "none";

            return (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                isSaved={savedIds.includes(opportunity.id)}
                onToggleSave={() => handleToggleSave(opportunity.id)}
                matchScore={user ? score : undefined}
                matchReasons={user ? reasons : undefined}
                trackerStatus={trackerStatus}
                onChangeTrackerStatus={user ? (newStatus) => handleStatusChange(opportunity.id, newStatus) : undefined}
              />
            );
          })}
        </div>
      ) : (
        <div className="mt-16 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <p className="text-lg font-medium text-white">No opportunities found</p>
          <p className="mt-2 text-sm text-zinc-500">
            Try adjusting your search or selecting a different category.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory(ALL_CATEGORIES);
            }}
            className="mt-6 inline-flex rounded-full border border-white/10 px-5 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-white/20 hover:text-white"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
