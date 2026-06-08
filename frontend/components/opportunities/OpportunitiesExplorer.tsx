"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
import type { Opportunity } from "@/types/opportunity";
import { OpportunityCard } from "./OpportunityCard";
import type { UserProfile } from "@/types/profile";
import { daysUntilDeadline } from "@/lib/format-date";

// Helper to safely extract milliseconds from various Firestore/Date formats
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getTimestampMs = (val: any): number => {
  if (!val) return 0;
  if (typeof val.toDate === "function") return val.toDate().getTime();
  if (val.seconds !== undefined) {
    return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1000000);
  }
  if (val instanceof Date) return val.getTime();
  if (typeof val === "string" || typeof val === "number") {
    return new Date(val).getTime();
  }
  return 0;
};

interface OpportunitiesExplorerProps {
  opportunities?: Opportunity[];
}

export function OpportunitiesExplorer({ opportunities = [] }: OpportunitiesExplorerProps) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Primary state management
  const [opportunitiesList, setOpportunitiesList] = useState<Opportunity[]>(opportunities);
  const [loadingOpps, setLoadingOpps] = useState(true);
  const [profile, setProfile] = useState<Omit<UserProfile, "updatedAt"> | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [deadlineFilter, setDeadlineFilter] = useState("Any Time");
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [minMatchScore, setMinMatchScore] = useState<number>(0);
  const [sortBy, setSortBy] = useState("Highest Match Score");

  // Drawer / overlay UI state
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [isInitialSyncDone, setIsInitialSyncDone] = useState(false);

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
    fetchSaved();
    window.addEventListener("bookmark-updated", fetchSaved);
    return () => {
      window.removeEventListener("bookmark-updated", fetchSaved);
    };
  }, [user, fetchSaved]);

  // Fetch applications on mount/user change
  useEffect(() => {
    fetchApplications();
    window.addEventListener("tracker-updated", fetchApplications);
    window.addEventListener("bookmark-updated", fetchApplications);
    return () => {
      window.removeEventListener("tracker-updated", fetchApplications);
      window.removeEventListener("bookmark-updated", fetchApplications);
    };
  }, [user, fetchApplications]);

  // Handle URL Query Parameter updates
  const updateUrl = useCallback((newParams: Record<string, string | null>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === "" || value === undefined) {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    });
    
    const search = current.toString();
    const queryStr = search ? `?${search}` : "";
    router.replace(`${pathname}${queryStr}`, { scroll: false });
  }, [router, searchParams, pathname]);

  // 1. Sync FROM URL query params on mount/initial load
  useEffect(() => {
    const q = searchParams.get("q") || "";
    const categories = searchParams.get("categories")?.split(",").filter(Boolean) || [];
    const sources = searchParams.get("sources")?.split(",").filter(Boolean) || [];
    const deadline = searchParams.get("deadline") || "Any Time";
    const active = searchParams.get("active") !== "false"; // default true
    const match = parseInt(searchParams.get("match") || "0", 10) || 0;
    const sort = searchParams.get("sort") || "Highest Match Score";

    Promise.resolve().then(() => {
      setSearchQuery(q);
      setDebouncedSearchQuery(q);
      setSelectedCategories(categories);
      setSelectedSources(sources);
      setDeadlineFilter(deadline);
      setShowOnlyActive(active);
      setMinMatchScore(match);
      setSortBy(sort);
      setIsInitialSyncDone(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 3. Sync TO URL query params when state changes
  useEffect(() => {
    if (!isInitialSyncDone) return;

    const params: Record<string, string | null> = {
      q: debouncedSearchQuery || null,
      categories: selectedCategories.length > 0 ? selectedCategories.join(",") : null,
      sources: selectedSources.length > 0 ? selectedSources.join(",") : null,
      deadline: deadlineFilter !== "Any Time" ? deadlineFilter : null,
      active: showOnlyActive ? null : "false", // true is default, omit it from url
      match: minMatchScore > 0 ? minMatchScore.toString() : null,
      sort: sortBy !== "Highest Match Score" ? sortBy : null, // Highest Match Score is default
    };

    updateUrl(params);
  }, [debouncedSearchQuery, selectedCategories, selectedSources, deadlineFilter, showOnlyActive, minMatchScore, sortBy, isInitialSyncDone, updateUrl]);

  // Bookmark / status action handlers
  const handleToggleSave = async (oppId: string) => {
    if (!user) {
      router.push("/login");
      return;
    }

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
      console.error("Failed to save/unsave bookmark:", err);
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

  // Suggest profile improvements if matching fields are missing
  const missingFieldsList = useMemo(() => {
    if (!profile) return [];
    const list: string[] = [];
    if (!profile.skills || profile.skills.length === 0) list.push("skills");
    if (!profile.interests || profile.interests.length === 0) list.push("interests");
    if (!profile.careerGoal || profile.careerGoal.trim() === "") list.push("career goals");
    if (!profile.preferredDomains || profile.preferredDomains.length === 0) list.push("preferred domains");
    return list;
  }, [profile]);

  // Performance Optimization: Memoize match scores for all opportunities
  const opportunitiesWithScores = useMemo(() => {
    return opportunitiesList.map((opp) => {
      const { score, reasons } = calculateMatchScore(profile, opp);
      return {
        ...opp,
        matchScore: score,
        matchReasons: reasons,
      };
    });
  }, [opportunitiesList, profile]);

  // Base opportunities matching the "Show Only Active" toggle
  const baseOpps = useMemo(() => {
    return opportunitiesWithScores.filter((opp) => {
      if (showOnlyActive) {
        // active status true/undefined AND deadline not expired
        const days = opp.deadline ? daysUntilDeadline(opp.deadline) : 0;
        return opp.isActive !== false && days >= 0;
      }
      return true;
    });
  }, [opportunitiesWithScores, showOnlyActive]);

  // Dynamic filter count facets
  const sourceCounts = useMemo(() => {
    const counts = { devfolio: 0, unstop: 0, manual: 0 };
    baseOpps.forEach((opp) => {
      const src = (opp.source || "manual").toLowerCase();
      if (src === "devfolio") counts.devfolio++;
      else if (src === "unstop") counts.unstop++;
      else counts.manual++;
    });
    return counts;
  }, [baseOpps]);

  const categoryCounts = useMemo(() => {
    const counts = { Hackathon: 0, Competition: 0, Internship: 0, Scholarship: 0, Fellowship: 0 };
    baseOpps.forEach((opp) => {
      if (opp.category in counts) {
        counts[opp.category as keyof typeof counts]++;
      }
    });
    return counts;
  }, [baseOpps]);

  // Main Filtering Logic
  const filteredOpportunities = useMemo(() => {
    const queryLower = debouncedSearchQuery.trim().toLowerCase();

    return baseOpps.filter((opp) => {
      // 1. Category Filter (Multi-select)
      if (selectedCategories.length > 0 && !selectedCategories.includes(opp.category)) {
        return false;
      }

      // 2. Source Filter (Multi-select)
      const src = (opp.source || "manual").toLowerCase();
      if (selectedSources.length > 0 && !selectedSources.includes(src)) {
        return false;
      }

      // 3. Deadline Filter
      if (deadlineFilter !== "Any Time" && opp.deadline) {
        const daysLeft = daysUntilDeadline(opp.deadline);
        if (deadlineFilter === "This Week" && (daysLeft < 0 || daysLeft > 7)) return false;
        if (deadlineFilter === "This Month" && (daysLeft < 0 || daysLeft > 30)) return false;
        if (deadlineFilter === "Next 3 Months" && (daysLeft < 0 || daysLeft > 90)) return false;
      }

      // 4. Match Score Filter
      if (minMatchScore > 0 && (opp.matchScore || 0) < minMatchScore) {
        return false;
      }

      // 5. Search Text Filter
      if (queryLower) {
        const titleMatch = opp.title.toLowerCase().includes(queryLower);
        const organizerMatch = opp.organizer.toLowerCase().includes(queryLower);
        const descMatch = opp.description.toLowerCase().includes(queryLower);
        const tagsMatch = opp.tags && opp.tags.some(tag => tag.toLowerCase().includes(queryLower));

        if (!titleMatch && !organizerMatch && !descMatch && !tagsMatch) {
          return false;
        }
      }

      return true;
    });
  }, [baseOpps, debouncedSearchQuery, selectedCategories, selectedSources, deadlineFilter, minMatchScore]);

  // Main Sorting Logic
  const sortedAndFilteredOpportunities = useMemo(() => {
    const sorted = [...filteredOpportunities];

    sorted.sort((a, b) => {
      if (sortBy === "Highest Match Score") {
        const diff = (b.matchScore || 0) - (a.matchScore || 0);
        if (diff !== 0) return diff;
        return getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt);
      }

      if (sortBy === "Latest Added") {
        return getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt);
      }

      if (sortBy === "Deadline Soonest") {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        if (a.deadline !== b.deadline) {
          return a.deadline.localeCompare(b.deadline);
        }
        return (b.matchScore || 0) - (a.matchScore || 0);
      }

      if (sortBy === "Deadline Latest") {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        if (a.deadline !== b.deadline) {
          return b.deadline.localeCompare(a.deadline);
        }
        return (b.matchScore || 0) - (a.matchScore || 0);
      }

      return 0;
    });

    return sorted;
  }, [filteredOpportunities, sortBy]);

  // Generate Filter Chips list
  const chips = useMemo(() => {
    const list: Array<{ label: string; onRemove: () => void }> = [];

    selectedCategories.forEach((cat) => {
      list.push({
        label: cat,
        onRemove: () => setSelectedCategories((prev) => prev.filter((c) => c !== cat)),
      });
    });

    selectedSources.forEach((src) => {
      list.push({
        label: src.charAt(0).toUpperCase() + src.slice(1),
        onRemove: () => setSelectedSources((prev) => prev.filter((s) => s !== src)),
      });
    });

    if (deadlineFilter !== "Any Time") {
      list.push({
        label: deadlineFilter,
        onRemove: () => setDeadlineFilter("Any Time"),
      });
    }

    if (minMatchScore > 0) {
      list.push({
        label: `Match ≥ ${minMatchScore}%`,
        onRemove: () => setMinMatchScore(0),
      });
    }

    return list;
  }, [selectedCategories, selectedSources, deadlineFilter, minMatchScore]);

  const handleClearAll = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setSelectedCategories([]);
    setSelectedSources([]);
    setDeadlineFilter("Any Time");
    setMinMatchScore(0);
    setShowOnlyActive(true);
    setSortBy("Highest Match Score");
  };

  // Shared Filters Layout (rendered in Sidebar on Desktop, Drawer on Mobile)
  const renderFilters = () => (
    <div className="space-y-6">
      {/* 1. Active Opportunities Filter */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-md">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Status</h3>
        <label className="flex items-center gap-3 cursor-pointer text-sm text-zinc-400 hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={showOnlyActive}
            onChange={(e) => setShowOnlyActive(e.target.checked)}
            className="h-4 w-4 rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-950 cursor-pointer"
          />
          Show Only Active
        </label>
      </div>

      {/* 2. Category Filters (Multi-select) */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-md">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Category</h3>
        <div className="flex flex-col gap-2.5">
          <label className="flex items-center gap-3 cursor-pointer text-sm text-zinc-400 hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={selectedCategories.length === 0}
              onChange={() => setSelectedCategories([])}
              className="h-4 w-4 rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-950 cursor-pointer"
            />
            All Categories ({baseOpps.length})
          </label>
          {["Internship", "Hackathon", "Scholarship", "Fellowship", "Competition"].map((cat) => {
            const count = categoryCounts[cat as keyof typeof categoryCounts] || 0;
            return (
              <label key={cat} className="flex items-center gap-3 cursor-pointer text-sm text-zinc-400 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat)}
                  onChange={() => {
                    setSelectedCategories((prev) =>
                      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
                    );
                  }}
                  className="h-4 w-4 rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-950 cursor-pointer"
                />
                {cat} ({count})
              </label>
            );
          })}
        </div>
      </div>

      {/* 3. Source Filters (Multi-select) */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-md">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Source</h3>
        <div className="flex flex-col gap-2.5">
          <label className="flex items-center gap-3 cursor-pointer text-sm text-zinc-400 hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={selectedSources.length === 0}
              onChange={() => setSelectedSources([])}
              className="h-4 w-4 rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-950 cursor-pointer"
            />
            All Sources ({baseOpps.length})
          </label>
          {[
            { key: "devfolio", label: "Devfolio" },
            { key: "unstop", label: "Unstop" },
            { key: "manual", label: "Manual" },
          ].map((src) => {
            const count = sourceCounts[src.key as keyof typeof sourceCounts] || 0;
            return (
              <label key={src.key} className="flex items-center gap-3 cursor-pointer text-sm text-zinc-400 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={selectedSources.includes(src.key)}
                  onChange={() => {
                    setSelectedSources((prev) =>
                      prev.includes(src.key) ? prev.filter((s) => s !== src.key) : [...prev, src.key]
                    );
                  }}
                  className="h-4 w-4 rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-950 cursor-pointer"
                />
                {src.label} ({count})
              </label>
            );
          })}
        </div>
      </div>

      {/* 4. Deadline Filters (Single-select radio) */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-md">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Deadline</h3>
        <div className="flex flex-col gap-2.5">
          {["Any Time", "This Week", "This Month", "Next 3 Months"].map((opt) => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer text-sm text-zinc-400 hover:text-white transition-colors">
              <input
                type="radio"
                name="deadline-filter-group"
                checked={deadlineFilter === opt}
                onChange={() => setDeadlineFilter(opt)}
                className="h-4 w-4 border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-950 cursor-pointer"
              />
              {opt}
            </label>
          ))}
        </div>
      </div>

      {/* 5. Match Score Filters (Single-select radio) */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-md">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">AI Match Score</h3>
        <div className="flex flex-col gap-2.5">
          {[
            { value: 0, label: "Any Score", count: baseOpps.length },
            { value: 50, label: "50%+ Match", count: baseOpps.filter((o) => (o.matchScore || 0) >= 50).length },
            { value: 70, label: "70%+ Match", count: baseOpps.filter((o) => (o.matchScore || 0) >= 70).length },
            { value: 90, label: "90%+ Match", count: baseOpps.filter((o) => (o.matchScore || 0) >= 90).length },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-3 cursor-pointer text-sm text-zinc-400 hover:text-white transition-colors">
              <input
                type="radio"
                name="match-score-filter-group"
                checked={minMatchScore === opt.value}
                onChange={() => setMinMatchScore(opt.value)}
                className="h-4 w-4 border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-950 cursor-pointer"
              />
              {opt.label} ({opt.count})
            </label>
          ))}
        </div>
      </div>
    </div>
  );

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
      {/* Search Bar and Sorting Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, organizer, tags, or keyword…"
            aria-label="Search opportunities"
            className="w-full rounded-full border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        
        <div className="flex items-center gap-3">
          {/* Mobile Filters Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="lg:hidden flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-white/20 hover:text-white cursor-pointer"
          >
            <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 8.293A1 1 0 013 7.586V4z" />
            </svg>
            Filters {chips.length > 0 && `(${chips.length})`}
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="sort-dropdown" className="text-xs text-zinc-500 font-medium hidden sm:inline">
              Sort By:
            </label>
            <select
              id="sort-dropdown"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-full border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-zinc-300 outline-none hover:border-white/20 focus:border-indigo-500/50 cursor-pointer"
            >
              <option value="Highest Match Score">Highest Match Score</option>
              <option value="Latest Added">Latest Added</option>
              <option value="Deadline Soonest">Deadline Soonest</option>
              <option value="Deadline Latest">Deadline Latest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count & active chips summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 border-b border-white/5 pb-4">
        <div className="text-sm text-zinc-400">
          <span className="font-semibold text-white">{sortedAndFilteredOpportunities.length}</span> opportunities found
          {chips.length > 0 && (
            <span className="text-zinc-500 ml-1">
              • <span className="font-semibold text-zinc-300">{chips.length}</span> filter{chips.length !== 1 ? "s" : ""} active
            </span>
          )}
        </div>
      </div>

      {/* Active Chips Row */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {chips.map((chip, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1 px-3 text-xs text-zinc-300"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                className="text-zinc-500 hover:text-rose-400 font-bold transition-colors cursor-pointer ml-1"
                aria-label={`Remove ${chip.label} filter`}
              >
                &times;
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium ml-2 cursor-pointer transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Main Grid & Sidebar Layout */}
      <div className="mt-8 lg:grid lg:grid-cols-4 lg:gap-8 items-start">
        {/* Desktop Sidebar (inline, persistent) */}
        <aside className="hidden lg:block lg:col-span-1 space-y-6">
          {renderFilters()}
        </aside>

        {/* Opportunities grid container - flat list map style is virtualization-ready */}
        <div className="lg:col-span-3">
          {/* Profile Improvement Banner */}
          {user && missingFieldsList.length > 0 && (
            <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 backdrop-blur-md">
              <div className="flex items-start gap-3">
                <span className="text-lg shrink-0">⚡</span>
                <div>
                  <p className="font-semibold text-white">Improve your profile to get better recommendations</p>
                  <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">
                    Your opportunity matches will be much more accurate if you add your: <span className="text-amber-300 font-medium">{missingFieldsList.join(", ")}</span>.
                  </p>
                </div>
              </div>
              <a 
                href="/profile" 
                className="shrink-0 rounded-full bg-amber-500/15 border border-amber-500/30 px-3.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 transition-all text-center"
              >
                Update Profile &rarr;
              </a>
            </div>
          )}

          {sortedAndFilteredOpportunities.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sortedAndFilteredOpportunities.map((opportunity) => {
                const app = applications.find((a) => a.opportunityId === opportunity.id);
                const trackerStatus = app ? app.status : "none";

                return (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    isSaved={savedIds.includes(opportunity.id)}
                    onToggleSave={() => handleToggleSave(opportunity.id)}
                    matchScore={user ? opportunity.matchScore : undefined}
                    matchReasons={user ? opportunity.matchReasons : undefined}
                    trackerStatus={trackerStatus}
                    onChangeTrackerStatus={user ? (newStatus) => handleStatusChange(opportunity.id, newStatus) : undefined}
                  />
                );
              })}
            </div>
          ) : (
            /* Premium Empty State */
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-zinc-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-white">No opportunities match your filters.</h3>
              <p className="mt-2 text-sm text-zinc-500 max-w-sm mx-auto">
                Try adjusting your search terms, selecting different categories, or resetting the filters.
              </p>
              <button
                type="button"
                onClick={handleClearAll}
                className="mt-6 inline-flex rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 cursor-pointer shadow-lg shadow-indigo-500/20"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer (Collapsible slider) */}
      {isMobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsMobileFiltersOpen(false)} 
          />
          
          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-zinc-950 border-l border-white/10 p-6 shadow-2xl flex flex-col h-full transform transition-transform">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Filters</h2>
              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen(false)}
                className="rounded-full p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <span className="sr-only">Close menu</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Filters Content */}
            <div className="flex-1 overflow-y-auto py-6 space-y-6">
              {renderFilters()}
            </div>

            {/* Bottom Actions inside Drawer */}
            <div className="pt-4 border-t border-white/10 flex gap-3">
              <button
                type="button"
                onClick={handleClearAll}
                className="flex-1 rounded-full border border-white/10 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/5 cursor-pointer transition-colors"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen(false)}
                className="flex-1 rounded-full bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 cursor-pointer transition-colors shadow-lg shadow-indigo-500/20"
              >
                Apply ({sortedAndFilteredOpportunities.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
