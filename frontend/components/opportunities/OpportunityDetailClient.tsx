"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { useRouter } from "next/navigation";
import {
  getProfile,
  getSavedOpportunities,
  getApplications,
  saveOpportunity,
  unsaveOpportunity,
  setApplicationStatus,
  removeApplication,
  incrementOpportunityViews,
  getOpportunityById,
  getSimilarOpportunities,
  type ApplicationStatus,
  type Application
} from "@/lib/firestore";
import { calculateMatchScore } from "@/lib/match-score";
import type { Opportunity } from "@/types/opportunity";
import type { UserProfile } from "@/types/profile";
import { OpportunityCard } from "./OpportunityCard";
import { daysUntilDeadline, formatDeadline } from "@/lib/format-date";
import { categoryStyles } from "@/lib/categories";

interface OpportunityDetailClientProps {
  id: string;
}

// Helper to safely format Firestore timestamp or Date strings
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatDateTime = (val: any): string => {
  if (!val) return "N/A";
  let date: Date;
  if (typeof val.toDate === "function") date = val.toDate();
  else if (val.seconds !== undefined) date = new Date(val.seconds * 1000);
  else date = new Date(val);

  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export function OpportunityDetailClient({ id }: OpportunityDetailClientProps) {
  const { user } = useAuth();
  const router = useRouter();

  // Async data states
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [similarOpportunities, setSimilarOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  // Interactivity states
  const [profile, setProfile] = useState<Omit<UserProfile, "updatedAt"> | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [copied, setCopied] = useState(false);
  const [viewsCount, setViewsCount] = useState(0);

  // Fetch opportunity and similar ones client-side on mount
  useEffect(() => {
    if (!id) return;
    Promise.resolve().then(() => {
      setLoading(true);
    });
    getOpportunityById(id)
      .then((opp) => {
        if (opp) {
          setOpportunity(opp);
          
          // Fetch similarity set
          getSimilarOpportunities(opp)
            .then(setSimilarOpportunities)
            .catch(console.error);

          // Atomic view counter with sessionStorage session guard (prevents Strict Mode double increments)
          const sessionKey = `viewed_opportunity_${opp.id}`;
          if (typeof window !== "undefined" && !sessionStorage.getItem(sessionKey)) {
            sessionStorage.setItem(sessionKey, "true");
            incrementOpportunityViews(opp.id).catch(console.error);
            setViewsCount((opp.views || 0) + 1);
          } else {
            setViewsCount(opp.views || 0);
          }
        } else {
          setOpportunity(null);
        }
      })
      .catch((err) => {
        console.error("Error loading opportunity:", err);
        setOpportunity(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // Load user profile, bookmarks, applications on mount/user change
  useEffect(() => {
    if (user?.uid) {
      getProfile(user.uid)
        .then(setProfile)
        .catch((err) => console.error("Error loading profile:", err));

      getSavedOpportunities(user.uid)
        .then(setSavedIds)
        .catch((err) => console.error("Error loading saved ids:", err));

      getApplications(user.uid)
        .then(setApplications)
        .catch((err) => console.error("Error loading applications:", err));
    }
  }, [user]);

  // Sync update callbacks
  const fetchSaved = useCallback(() => {
    if (user?.uid) {
      getSavedOpportunities(user.uid).then(setSavedIds).catch(console.error);
    } else {
      setSavedIds([]);
    }
  }, [user]);

  const fetchApplications = useCallback(() => {
    if (user?.uid) {
      getApplications(user.uid).then(setApplications).catch(console.error);
    } else {
      setApplications([]);
    }
  }, [user]);

  useEffect(() => {
    window.addEventListener("bookmark-updated", fetchSaved);
    window.addEventListener("tracker-updated", fetchApplications);
    return () => {
      window.removeEventListener("bookmark-updated", fetchSaved);
      window.removeEventListener("tracker-updated", fetchApplications);
    };
  }, [fetchSaved, fetchApplications]);

  // Bookmark / status action handlers
  const handleToggleSave = async (oppId: string) => {
    if (!user) {
      router.push("/login");
      return;
    }

    const isSaved = savedIds.includes(oppId);
    setSavedIds((prev) =>
      isSaved ? prev.filter((item) => item !== oppId) : [...prev, oppId]
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
        isSaved ? [...prev, oppId] : prev.filter((item) => item !== oppId)
      );
    }
  };

  const handleStatusChange = async (oppId: string, status: ApplicationStatus | "none") => {
    if (!user) {
      router.push("/login");
      return;
    }

    setApplications((prev) => {
      const filtered = prev.filter((app) => app.opportunityId !== oppId);
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
      console.error("Failed to update tracker status:", err);
      fetchApplications();
    }
  };

  // Share URL Clipboard Copy
  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Memoize dynamic match score calculations
  const matchResult = useMemo(() => {
    if (!opportunity) return { score: 30, reasons: [] };
    return calculateMatchScore(profile, opportunity);
  }, [profile, opportunity]);

  const similarWithScores = useMemo(() => {
    return similarOpportunities.map((opp) => {
      const { score, reasons } = calculateMatchScore(profile, opp);
      return { ...opp, matchScore: score, matchReasons: reasons };
    });
  }, [similarOpportunities, profile]);

  // Safe Description text renderer
  const renderDescription = (text: string) => {
    if (!text) return null;
    const lines = text.split("\n");

    const parseBoldText = (str: string) => {
      const parts = str.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-bold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });
    };

    return (
      <div className="space-y-4 text-zinc-300 text-sm leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-2" />;

          if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
            const content = trimmed.replace(/^[•\-\*]\s*/, "");
            return (
              <ul key={idx} className="list-disc pl-5 space-y-1">
                <li>{parseBoldText(content)}</li>
              </ul>
            );
          }

          if (trimmed.startsWith("#")) {
            const depth = (trimmed.match(/^#+/) || ["#"])[0].length;
            const content = trimmed.replace(/^#+\s*/, "");
            const headingClass =
              depth === 1
                ? "text-xl font-bold text-white mt-6 mb-2"
                : depth === 2
                  ? "text-lg font-semibold text-white mt-5 mb-2"
                  : "text-base font-semibold text-white mt-4 mb-2";
            return (
              <div key={idx} className={headingClass}>
                {content}
              </div>
            );
          }

          return <p key={idx}>{parseBoldText(line)}</p>;
        })}
      </div>
    );
  };

  // Render Premium Spinner Skeleton during load
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-sm text-zinc-500">Loading opportunity details…</p>
      </div>
    );
  }

  // Render 404 screen if not found
  if (!opportunity) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-20 px-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Opportunity Not Found</h1>
        <p className="text-zinc-500 text-sm leading-relaxed">
          The opportunity with the requested ID does not exist or may have been removed from the database.
        </p>
        <button
          type="button"
          onClick={() => router.push("/opportunities")}
          className="inline-flex rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 cursor-pointer"
        >
          Back To Opportunities
        </button>
      </div>
    );
  }

  const styles = categoryStyles[opportunity.category] || { badge: "", dot: "" };
  const daysLeft = daysUntilDeadline(opportunity.deadline);
  const isExpired = opportunity.isActive === false || daysLeft < 0;
  const isOpportunitySaved = savedIds.includes(opportunity.id);
  const currentApp = applications.find((a) => a.opportunityId === opportunity.id);
  const currentTrackerStatus = currentApp ? currentApp.status : "none";

  return (
    <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="relative">
        {/* Navigation Breadcrumb */}
        <button
          type="button"
          onClick={() => router.push("/opportunities")}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer mb-8"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Opportunities
        </button>

        {/* Two-Column Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT: Main Content Section */}
          <div className="lg:col-span-2 space-y-8">
            <header className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${styles.badge}`}>
                  {opportunity.category}
                </span>
                {opportunity.source && (
                  <span className="inline-flex shrink-0 items-center rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-xs font-semibold text-zinc-300 uppercase">
                    {opportunity.source}
                  </span>
                )}
                <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                  isExpired 
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                }`}>
                  {isExpired ? "Expired" : "Active"}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
                {opportunity.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-400">
                <p className="font-semibold text-zinc-200">{opportunity.organizer}</p>
                <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />
                <p>
                  Deadline:{" "}
                  <span className="font-medium text-zinc-300">
                    {formatDeadline(opportunity.deadline)}
                    {opportunity.isDeadlineEstimated && (
                      <span className="ml-1 text-[11px] text-zinc-500 italic" title="Deadline calculated dynamically from posting date">(Estimated)</span>
                    )}
                  </span>
                </p>
                {viewsCount !== undefined && (
                  <>
                    <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />
                    <p className="flex items-center gap-1">
                      <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {viewsCount} views
                    </p>
                  </>
                )}
              </div>

              {opportunity.tags && opportunity.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {[...new Set(opportunity.tags)].map((tag) => (
                    <span key={tag} className="inline-flex items-center rounded bg-white/5 border border-white/5 px-2.5 py-1 text-xs text-zinc-400">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {/* Description card */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 sm:p-8 backdrop-blur-md">
              <h2 className="text-lg font-semibold text-white mb-4">Opportunity Description</h2>
              {renderDescription(opportunity.description)}
            </div>

            {/* AI Recommendation Section */}
            {user ? (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 sm:p-8 backdrop-blur-md space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">⚡ AI Fit Recommendation</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Custom computed based on your profile inputs</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                      matchResult.score >= 90
                        ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                        : matchResult.score >= 75
                          ? "bg-indigo-500/10 text-indigo-400 ring-indigo-500/20"
                          : matchResult.score >= 50
                            ? "bg-amber-500/10 text-amber-400 ring-amber-500/20"
                            : "bg-zinc-500/10 text-zinc-400 ring-zinc-500/20"
                    }`}>
                      {matchResult.score >= 90 ? "Excellent Match" : matchResult.score >= 75 ? "Strong Match" : matchResult.score >= 50 ? "Moderate Match" : "Weak Match"}
                    </span>
                    <span className="text-xl font-bold text-white">{matchResult.score}% Match</span>
                  </div>
                </div>

                {/* Score Breakdown Progress Bars */}
                {matchResult.breakdown && (
                  <div className="bg-white/[0.01] border border-white/5 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Match Score Breakdown</h3>
                    <div className="space-y-3">
                      {/* Skills (40) */}
                      <div>
                        <div className="flex justify-between text-xs text-zinc-400 mb-1">
                          <span>Skills Relevance</span>
                          <span>{matchResult.breakdown.skillsScore} / 40 pts</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(matchResult.breakdown.skillsScore / 40) * 100}%` }} />
                        </div>
                      </div>

                      {/* Interests (25) */}
                      <div>
                        <div className="flex justify-between text-xs text-zinc-400 mb-1">
                          <span>Interest Alignment</span>
                          <span>{matchResult.breakdown.interestScore} / 25 pts</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(matchResult.breakdown.interestScore / 25) * 100}%` }} />
                        </div>
                      </div>

                      {/* Category (15) */}
                      <div>
                        <div className="flex justify-between text-xs text-zinc-400 mb-1">
                          <span>Category Suitability</span>
                          <span>{matchResult.breakdown.categoryScore} / 15 pts</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(matchResult.breakdown.categoryScore / 15) * 100}%` }} />
                        </div>
                      </div>

                      {/* Goal (10) */}
                      <div>
                        <div className="flex justify-between text-xs text-zinc-400 mb-1">
                          <span>Career Goal & Domains</span>
                          <span>{matchResult.breakdown.goalScore} / 10 pts</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(matchResult.breakdown.goalScore / 10) * 100}%` }} />
                        </div>
                      </div>

                      {/* Completeness (10) */}
                      <div>
                        <div className="flex justify-between text-xs text-zinc-400 mb-1">
                          <span>Profile Completeness Bonus</span>
                          <span>{matchResult.breakdown.completenessScore} / 10 pts</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(matchResult.breakdown.completenessScore / 10) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Score Reasons Bullet List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Key Match Signals</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {matchResult.reasons.map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-sm text-zinc-300">
                        <span className="text-emerald-400 font-semibold mt-0.5">✓</span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Prompt to login */
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                <p className="text-sm text-zinc-400">
                  <a href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold underline">Login</a> or <a href="/signup" className="text-indigo-400 hover:text-indigo-300 font-semibold underline">create an account</a> to view AI Match Score breakdowns and custom recommendations.
                </p>
              </div>
            )}

            {/* Date Audit */}
            <div className="flex items-center justify-between text-xs text-zinc-600 px-2">
              <p>Posted: {formatDateTime(opportunity.createdAt)}</p>
              <p>Last Sync: {formatDateTime(opportunity.updatedAt)}</p>
            </div>
          </div>

          {/* RIGHT: Sticky Action Sidebar */}
          <aside className="lg:col-span-1 lg:sticky lg:top-28 space-y-6">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 backdrop-blur-md space-y-6 shadow-xl">
              
              {/* Circular Match Score Header (if logged in) */}
              {user && (
                <div className="flex flex-col items-center justify-center text-center pb-4 border-b border-white/5">
                  <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-white font-bold text-2xl">
                    {matchResult.score}%
                  </div>
                  <h3 className="mt-2.5 text-sm font-semibold text-zinc-200">Personal Match Score</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {matchResult.score >= 90 ? "Excellent Match" : matchResult.score >= 75 ? "Strong Fit" : matchResult.score >= 50 ? "Moderate Fit" : "Weak Fit"}
                  </p>
                </div>
              )}

              {/* Deadline Display */}
              <div className="space-y-1">
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Time Remaining</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${
                    isExpired
                      ? "text-rose-400"
                      : daysLeft <= 14
                        ? "text-rose-400"
                        : daysLeft <= 30
                          ? "text-amber-400"
                          : "text-emerald-400"
                  }`}>
                    {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? "Due today" : "Closed"}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Ends: {formatDeadline(opportunity.deadline)}
                  {opportunity.isDeadlineEstimated && (
                    <span className="ml-1 text-[10px] text-zinc-500 italic" title="Deadline calculated dynamically from posting date">(Est.)</span>
                  )}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <a
                  href={opportunity.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all text-center"
                >
                  Apply Now
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>

                {/* Bookmark Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleSave(opportunity.id)}
                  className={`w-full flex items-center justify-center gap-2 rounded-full border py-3 text-sm font-semibold transition-all cursor-pointer ${
                    isOpportunitySaved
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25"
                      : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill={isOpportunitySaved ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-4 w-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                  </svg>
                  {isOpportunitySaved ? "Opportunity Saved" : "Save Opportunity"}
                </button>

                {/* Tracker Status Selector */}
                {user && (
                  <div className="space-y-1.5 mt-2">
                    <label htmlFor="tracker-status-select" className="text-xs text-zinc-500 font-semibold uppercase tracking-wider block">
                      Application Tracker Status
                    </label>
                    <select
                      id="tracker-status-select"
                      value={currentTrackerStatus}
                      onChange={(e) => handleStatusChange(opportunity.id, e.target.value as ApplicationStatus | "none")}
                      className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 outline-none hover:border-white/20 focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="none">Not Applied</option>
                      <option value="applied">Applied</option>
                      <option value="interview">Interview</option>
                      <option value="offer">Offer</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                )}

                {/* Share Button with tooltip */}
                <div className="relative pt-2">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="w-full flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 py-3 text-sm font-semibold text-zinc-300 hover:border-white/20 hover:text-white cursor-pointer transition-all"
                  >
                    <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 10.742l4.636-2.318m0 0a3 3 0 102.222-3.138 3 3 0 00-2.222 3.138zm0 0L8.684 13.258m0 0a3 3 0 102.222 3.138 3 3 0 00-2.222-3.138z" />
                    </svg>
                    {copied ? "Link Copied!" : "Share Opportunity"}
                  </button>
                  {copied && (
                    <div className="absolute left-1/2 -top-8 -translate-x-1/2 rounded bg-indigo-600 px-2 py-1 text-2xs text-white shadow font-semibold animate-bounce">
                      Copied Clipboard URL!
                    </div>
                  )}
                </div>
              </div>

              {/* Opportunity metadata info card */}
              <div className="border-t border-white/5 pt-4 space-y-3">
                <h4 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Metadata</h4>
                <div className="text-xs space-y-2 text-zinc-400">
                  <div className="flex justify-between">
                    <span>Source</span>
                    <span className="text-zinc-200 capitalize">{opportunity.source || "Manual"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Category</span>
                    <span className="text-zinc-200">{opportunity.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Organizer</span>
                    <span className="text-zinc-200 text-right max-w-[150px] truncate">{opportunity.organizer}</span>
                  </div>
                </div>
              </div>

            </div>
          </aside>

        </div>

        {/* BOTTOM: Similar Opportunities */}
        <section className="mt-16 border-t border-white/5 pt-12 space-y-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Similar Opportunities</h2>
            <p className="text-zinc-500 text-sm mt-1">Recommended listings based on Category, Organizer, and Tags overlap</p>
          </div>

          {similarWithScores.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similarWithScores.map((opp) => (
                <OpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  isSaved={savedIds.includes(opp.id)}
                  onToggleSave={() => handleToggleSave(opp.id)}
                  matchScore={user ? opp.matchScore : undefined}
                  matchReasons={user ? opp.matchReasons : undefined}
                  trackerStatus={applications.find((a) => a.opportunityId === opp.id)?.status || "none"}
                  onChangeTrackerStatus={user ? (newStatus) => handleStatusChange(opp.id, newStatus) : undefined}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No similar opportunities found.</p>
          )}
        </section>
      </div>
    </div>
  );
}
