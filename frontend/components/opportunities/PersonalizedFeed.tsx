"use client";

import { useAuth } from "@/contexts/AuthProvider";
import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  getOpportunities, 
  getProfile, 
  getSavedOpportunities, 
  getApplications, 
  saveOpportunity, 
  unsaveOpportunity,
  setApplicationStatus,
  removeApplication,
  type Application
} from "@/lib/firestore";
import { calculateMatchScore } from "@/lib/match-score";
import { OpportunityCard } from "./OpportunityCard";
import type { Opportunity } from "@/types/opportunity";
import type { UserProfile } from "@/types/profile";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatedCounter, ScrollReveal } from "./MotionComponents";

// Interface for opportunities with pre-calculated match scores
interface ScoredOpportunity extends Opportunity {
  matchScore?: number;
  matchReasons?: string[];
}

// Safe timestamp parsing helper
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

// Logged-out default profile to calculate realistic recommendation previews
const guestProfile: UserProfile = {
  fullName: "Guest Student",
  college: "Any University",
  branch: "Computer Science",
  year: "3rd Year",
  skills: ["React", "TypeScript", "Node.js", "Python", "Web Development", "AI", "Machine Learning"],
  interests: ["Web Development", "Software Development", "AI / ML", "Hackathons"],
  careerGoal: "Software Engineer",
  preferredDomains: ["Web Development", "AI / ML"]
};

export function PersonalizedFeed() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Primary data states
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [todayStr] = useState(() => new Date().toISOString().split("T")[0]);
  const [mountTime] = useState(() => Date.now());

  // Load all required firestore collections
  const loadFeedData = useCallback(() => {
    if (user?.uid) {
      Promise.all([
        getOpportunities(),
        getProfile(user.uid),
        getSavedOpportunities(user.uid),
        getApplications(user.uid)
      ])
        .then(([allOpps, userProfile, bookmarks, apps]) => {
          setOpportunities(allOpps);
          setProfile(userProfile);
          setSavedIds(bookmarks);
          setApplications(apps);
        })
        .catch((err) => console.error("Error loading feed data:", err))
        .finally(() => setLoadingData(false));
    } else {
      getOpportunities()
        .then((allOpps) => {
          setOpportunities(allOpps);
          setProfile(null);
          setSavedIds([]);
          setApplications([]);
        })
        .catch((err) => console.error("Error loading guest feed data:", err))
        .finally(() => setLoadingData(false));
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      loadFeedData();
    }
  }, [user, authLoading, loadFeedData]);

  // Sync bookmarks/tracker updates instantly across sections
  useEffect(() => {
    window.addEventListener("bookmark-updated", loadFeedData);
    window.addEventListener("tracker-updated", loadFeedData);
    return () => {
      window.removeEventListener("bookmark-updated", loadFeedData);
      window.removeEventListener("tracker-updated", loadFeedData);
    };
  }, [loadFeedData]);

  // Bookmark / status toggling actions
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
      loadFeedData();
    }
  };

  const handleStatusChange = async (oppId: string, status: "applied" | "interview" | "offer" | "rejected" | "none") => {
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
      loadFeedData();
    }
  };

  // Performance Protection: Scored Opportunities generated ONCE
  const scoredOpportunities: ScoredOpportunity[] = useMemo(() => {
    const activeProfile = profile || guestProfile;
    return opportunities.map((opp) => {
      const { score, reasons } = calculateMatchScore(activeProfile, opp);
      return {
        ...opp,
        matchScore: score,
        matchReasons: reasons,
      };
    });
  }, [opportunities, profile]);

  // Performance Protection: Sorting operations generated ONCE
  const sortedByScore: ScoredOpportunity[] = useMemo(() => {
    return [...scoredOpportunities].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }, [scoredOpportunities]);

  const sortedByDate: ScoredOpportunity[] = useMemo(() => {
    return [...scoredOpportunities].sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
  }, [scoredOpportunities]);

  // Active opportunities helper (derived from sortedByDate for generic listings)
  const activeOpportunities: ScoredOpportunity[] = useMemo(() => {
    return sortedByDate.filter((opp) => opp.isActive !== false && opp.deadline >= todayStr);
  }, [sortedByDate, todayStr]);

  // Active opportunities sorted by score helper
  const activeOpportunitiesByScore: ScoredOpportunity[] = useMemo(() => {
    return sortedByScore.filter((opp) => opp.isActive !== false && opp.deadline >= todayStr);
  }, [sortedByScore, todayStr]);

  // DERIVED SECTIONS (Hard capped at 6 items for initial load/render speed)

  // 1. Continue Your Applications
  const continueApplications: ScoredOpportunity[] = useMemo(() => {
    if (!user) return [];
    const appOppIds = new Set(applications.map((a) => a.opportunityId));
    return activeOpportunitiesByScore
      .filter((opp) => appOppIds.has(opp.id))
      .slice(0, 6);
  }, [activeOpportunitiesByScore, applications, user]);

  // 2. Saved For Later
  const savedForLater: ScoredOpportunity[] = useMemo(() => {
    if (!user) return [];
    const appOppIds = new Set(applications.map((a) => a.opportunityId));
    return activeOpportunitiesByScore
      .filter((opp) => savedIds.includes(opp.id) && !appOppIds.has(opp.id))
      .slice(0, 6);
  }, [activeOpportunitiesByScore, savedIds, applications, user]);

  // 3. Recommended For You (Score >= 75)
  const recommendedForYou: ScoredOpportunity[] = useMemo(() => {
    return activeOpportunitiesByScore
      .filter((opp) => (opp.matchScore || 0) >= 75)
      .slice(0, 6);
  }, [activeOpportunitiesByScore]);

  // 4. Best Match Opportunities (Score >= 90 with desc score fallback)
  const bestMatchOpportunities: ScoredOpportunity[] = useMemo(() => {
    const mainList = activeOpportunitiesByScore.filter((opp) => (opp.matchScore || 0) >= 90);
    if (mainList.length >= 6) {
      return mainList.slice(0, 6);
    }
    // Fallback: fill remaining slots from the highest scoring opportunities
    const addedIds = new Set(mainList.map((o) => o.id));
    const fallbacks = activeOpportunitiesByScore.filter((opp) => !addedIds.has(opp.id));
    return [...mainList, ...fallbacks].slice(0, 6);
  }, [activeOpportunitiesByScore]);

  // 5. Internships For You
  const internshipsForYou: ScoredOpportunity[] = useMemo(() => {
    const sourceArray = user ? activeOpportunitiesByScore : activeOpportunities;
    return sourceArray
      .filter((opp) => opp.category === "Internship")
      .slice(0, 6);
  }, [activeOpportunitiesByScore, activeOpportunities, user]);

  // 6. Hackathons & Competitions
  const hackathonsAndCompetitions: ScoredOpportunity[] = useMemo(() => {
    const sourceArray = user ? activeOpportunitiesByScore : activeOpportunities;
    return sourceArray
      .filter((opp) => opp.category === "Hackathon" || opp.category === "Competition")
      .slice(0, 6);
  }, [activeOpportunitiesByScore, activeOpportunities, user]);

  // 7. New This Week (Within 7 days fallback to Recently Added)
  const newThisWeek: ScoredOpportunity[] = useMemo(() => {
    const sourceArray = user ? activeOpportunitiesByScore : activeOpportunities;
    const sevenDaysAgo = mountTime - 7 * 24 * 60 * 60 * 1000;
    const list = sourceArray.filter((opp) => getTimestampMs(opp.createdAt) >= sevenDaysAgo);
    
    if (list.length > 0) {
      return list.slice(0, 6);
    }
    // Fallback: Show Recently Added
    return activeOpportunities.slice(0, 6);
  }, [activeOpportunitiesByScore, activeOpportunities, mountTime, user]);

  // 8. Recently Added
  const recentlyAdded: ScoredOpportunity[] = useMemo(() => {
    return activeOpportunities.slice(0, 6);
  }, [activeOpportunities]);

  // Profile completeness & missing fields checker
  const missingFields = useMemo(() => {
    if (!profile) return [];
    const list: string[] = [];
    if (!profile.skills || profile.skills.length === 0) list.push("Skills");
    if (!profile.interests || profile.interests.length === 0) list.push("Interests");
    if (!profile.careerGoal || profile.careerGoal.trim() === "") list.push("Career Goal");
    if (!profile.preferredDomains || profile.preferredDomains.length === 0) list.push("Preferred Domains");
    return list;
  }, [profile]);

  // First name greeting extraction
  const greetingName = useMemo(() => {
    if (!profile?.fullName) return user?.email?.split("@")[0] || "Student";
    return profile.fullName.trim().split(" ")[0];
  }, [profile, user]);

  // Dashboard calculations for Quick Stats
  const highMatchCount = useMemo(() => {
    if (!user) return 0;
    return activeOpportunitiesByScore.filter((o) => (o.matchScore || 0) >= 75).length;
  }, [activeOpportunitiesByScore, user]);

  const internshipsCount = useMemo(() => {
    return activeOpportunities.filter((o) => o.category === "Internship").length;
  }, [activeOpportunities]);

  // loading skeleton views
  if (authLoading || loadingData) {
    return (
      <div className="space-y-12 py-10">
        {/* Welcome message skeleton */}
        {user && (
          <div className="space-y-3 max-w-xl animate-pulse">
            <div className="h-4 w-24 rounded bg-white/5" />
            <div className="h-8 w-64 rounded bg-white/5" />
            <div className="h-5 w-80 rounded bg-white/5" />
          </div>
        )}

        {/* Stats card skeleton */}
        {user && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02] p-5" />
            ))}
          </div>
        )}

        {/* Section rows skeletons */}
        {[1, 2, 3].map((s) => (
          <div key={s} className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-6 w-48 rounded bg-white/5 animate-pulse" />
                <div className="h-4 w-72 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
            <div className="flex gap-6 overflow-hidden">
              {[1, 2, 3].map((c) => (
                <div key={c} className="h-64 w-80 shrink-0 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Horizontal Scroll Row Renderer
  const renderRow = (
    title: string,
    description: string,
    items: ScoredOpportunity[],
    seeAllHref: string,
    isLockedSection: boolean = false
  ) => {
    if (items.length === 0 && !isLockedSection) return null;

    return (
      <ScrollReveal>
        <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-white/5 pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl flex items-center gap-2">
              {title}
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-zinc-400 max-w-xl">
              {description}
            </p>
          </div>
          <Link
            href={seeAllHref}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 shrink-0 ml-4 hover:underline"
          >
            See All
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {isLockedSection && !user ? (
          // LOCKED PREVIEW DESIGN FOR LOGGED OUT GUESTS
          <div className="relative">
            {/* Real titles but blurred elements */}
            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-none snap-x select-none pointer-events-none opacity-45 blur-[1.5px]">
              {/* Take first 3 active opportunities to fill blurred preview */}
              {activeOpportunities.slice(0, 3).map((opp) => (
                <div key={opp.id} className="w-[310px] shrink-0 sm:w-[340px] snap-start">
                  <OpportunityCard
                    opportunity={opp}
                    matchScore={92}
                    matchReasons={["Matches your profile skills", "Suitable for your college year"]}
                    maskAiFields={true}
                  />
                </div>
              ))}
            </div>
            
            {/* Premium Lock Overlay Banner */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-zinc-950/20 backdrop-blur-[2.5px] rounded-2xl border border-white/5">
              <div className="inline-flex rounded-full bg-indigo-500/10 p-3.5 text-indigo-400 ring-1 ring-indigo-500/20 mb-4 shadow-lg shadow-indigo-500/10">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white">Unlock personalized AI matches</h3>
              <p className="mt-1 text-xs text-zinc-400 max-w-xs leading-relaxed">
                Create your student profile to automatically compute custom match scores based on your branch, year, skills, and goals.
              </p>
              <div className="mt-4 flex gap-3">
                <Link
                  href="/login"
                  className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        ) : (
          // NORMAL SCROLLABLE LIST OF CARDS
          <div className="-mx-4 px-4 overflow-x-auto flex gap-6 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 scrollbar-none snap-x">
            {items.map((opp) => {
              const app = applications.find((a) => a.opportunityId === opp.id);
              const trackerStatus = app ? app.status : "none";

              return (
                <div key={opp.id} className="w-[310px] shrink-0 sm:w-[340px] snap-start">
                  <OpportunityCard
                    opportunity={opp}
                    isSaved={savedIds.includes(opp.id)}
                    onToggleSave={() => handleToggleSave(opp.id)}
                    matchScore={user ? opp.matchScore : undefined}
                    matchReasons={user ? opp.matchReasons : undefined}
                    trackerStatus={trackerStatus}
                    onChangeTrackerStatus={user ? (newStatus) => handleStatusChange(opp.id, newStatus) : undefined}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>
      </ScrollReveal>
    );
  };

  // LOGGED-OUT HOME FEED PORTION (Category Carousels)
  if (!user) {
    return (
      <div className="space-y-16">
        {renderRow(
          "Recommended For You",
          "Custom matching opportunities based on your skills, interests, and academic level.",
          [],
          "/login",
          true // locked preview
        )}

        {renderRow(
          "Best Match Opportunities",
          "Top scoring opportunities tailored exactly for your student profile fields.",
          [],
          "/login",
          true // locked preview
        )}

        {renderRow(
          "Internships For You",
          "Explore the latest web development, software engineering, and AI/ML internships.",
          internshipsForYou,
          "/opportunities?categories=Internship"
        )}

        {renderRow(
          "Hackathons & Competitions",
          "Team events, competitive programming contests, and hackathons open for submissions.",
          hackathonsAndCompetitions,
          "/opportunities?categories=Hackathon,Competition"
        )}

        {renderRow(
          "New This Week",
          "Recently announced roles and event deadlines added in the past 7 days.",
          newThisWeek,
          "/opportunities?sort=Latest+Added"
        )}

        {renderRow(
          "Recently Added",
          "Chronological directory of all incoming opportunities and applications.",
          recentlyAdded,
          "/opportunities?sort=Latest+Added"
        )}
      </div>
    );
  }

  // LOGGED-IN HOME DASHBOARD FEED LAYOUT
  return (
    <div className="space-y-12">
      {/* 1. Welcome Back Banner */}
      <ScrollReveal>
        <div className="relative rounded-2xl border border-white/5 bg-white/[0.01] p-6 sm:p-8 backdrop-blur-md overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 -top-8 h-48 grid-overlay opacity-25" aria-hidden />
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
              Feed Overview
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Welcome back, <span className="text-gradient">{greetingName}</span>
            </h1>
            <p className="mt-2 text-sm text-zinc-400 max-w-xl leading-relaxed">
              There are <span className="font-semibold text-white">{activeOpportunities.length}</span> opportunities open today. 
              We found <span className="font-semibold text-indigo-300">{highMatchCount}</span> roles matching your skills and goals.
            </p>
          </div>
        </div>
      </ScrollReveal>

      {/* 2. Profile Completion Checklist Banner */}
      {missingFields.length > 0 && (
        <ScrollReveal>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0 mt-0.5" role="img" aria-label="alert">⚡</span>
                <div>
                  <h3 className="font-semibold text-white text-sm sm:text-base">Complete your profile to refine matches</h3>
                  <p className="text-zinc-400 text-xs sm:text-sm mt-0.5 leading-normal">
                    Your recommendations will be much more accurate once you configure your missing fields:{" "}
                    <span className="text-amber-300 font-medium">{missingFields.join(", ")}</span>.
                  </p>
                </div>
              </div>
              <Link 
                href="/profile" 
                className="shrink-0 rounded-full bg-amber-500/15 border border-amber-500/30 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 transition-all text-center self-start sm:self-auto"
              >
                Update Profile
              </Link>
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* 3. Quick Stats Cards */}
      <ScrollReveal>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Opportunities", value: activeOpportunities.length, iconColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", icon: "M2.25 13.5h3.86a2.25 2.25 0 012.008 1.24l.885 1.77a2.25 2.25 0 002.007 1.24h1.98a2.25 2.25 0 002.007-1.24l.885-1.77a2.25 2.25 0 012.007-1.24h3.86m-18 0h18" },
            { label: "Internships Available", value: internshipsCount, iconColor: "text-violet-400 bg-violet-500/10 border-violet-500/20", icon: "M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A47.79 47.79 0 0112 15.75c-2.248 0-4.447-.137-6.587-.404a2.245 2.245 0 01-.673-.38m0 0A2.18 2.18 0 014 12.49V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0014.25 3h-4.5A2.25 2.25 0 007.5 5.25v.054m9 0c-.815-.027-1.637-.041-2.462-.041-1.127 0-2.231.026-3.288.077m0 0a48.11 48.11 0 013.288-.077" },
            { label: "Saved Opportunities", value: savedIds.length, iconColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: "M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" },
            { label: "High Match Roles", value: highMatchCount, iconColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 backdrop-blur-md">
              <div className={`mb-3 inline-flex rounded-xl p-2.5 ring-1 ring-inset border ${stat.iconColor}`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                </svg>
              </div>
              <p className="text-2xl font-bold tracking-tight text-white">
                <AnimatedCounter value={stat.value} />
              </p>
              <p className="mt-1 text-xs text-zinc-400 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </ScrollReveal>

      {/* 4. Continue Your Applications */}
      {continueApplications.length > 0 && renderRow(
        "Continue Your Applications",
        "Tracked opportunities in your pipeline. Click status to update in real-time.",
        continueApplications,
        "/dashboard"
      )}

      {/* 5. Saved For Later */}
      {savedForLater.length > 0 && renderRow(
        "Saved For Later",
        "Your bookmarked listings. Apply before the deadlines close.",
        savedForLater,
        "/dashboard"
      )}

      {/* 6. Recommended For You */}
      {renderRow(
        "Recommended For You",
        "Top role matches showing strong or excellent matching score against your profile.",
        recommendedForYou,
        "/opportunities?sort=Highest+Match+Score"
      )}

      {/* 7. Best Match Opportunities */}
      {renderRow(
        "Best Match Opportunities",
        "High percentage fits matching your skills, interests, and academic level.",
        bestMatchOpportunities,
        "/opportunities?sort=Highest+Match+Score"
      )}

      {/* 8. Internships For You */}
      {renderRow(
        "Internships For You",
        "Technical student internships sorted in order of matching strengths.",
        internshipsForYou,
        "/opportunities?categories=Internship"
      )}

      {/* 9. Hackathons & Competitions */}
      {renderRow(
        "Hackathons & Competitions",
        "Collaborative hackathons and student events sorted in order of matching strengths.",
        hackathonsAndCompetitions,
        "/opportunities?categories=Hackathon,Competition"
      )}

      {/* 10. New This Week */}
      {renderRow(
        "New This Week",
        "Fresh announcements and roles open for submission in the last 7 days.",
        newThisWeek,
        "/opportunities?sort=Latest+Added"
      )}

      {/* 11. Recently Added */}
      {renderRow(
        "Recently Added",
        "Chronological directory of all incoming opportunities and applications.",
        recentlyAdded,
        "/opportunities?sort=Latest+Added"
      )}
    </div>
  );
}
