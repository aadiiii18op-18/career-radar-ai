"use client";

import { categoryStyles } from "@/lib/categories";
import { daysUntilDeadline, formatDeadline } from "@/lib/format-date";
import type { Opportunity } from "@/types/opportunity";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { AnimatedMatchScore } from "./MotionComponents";

interface OpportunityCardProps {
  opportunity: Opportunity;
  isSaved?: boolean;
  onToggleSave?: () => void;
  matchScore?: number;
  matchReasons?: string[];
  trackerStatus?: "applied" | "interview" | "offer" | "rejected" | "none";
  onChangeTrackerStatus?: (status: "applied" | "interview" | "offer" | "rejected" | "none") => void;
  maskAiFields?: boolean;
}

export function OpportunityCard({
  opportunity,
  isSaved,
  onToggleSave,
  matchScore,
  matchReasons,
  trackerStatus,
  onChangeTrackerStatus,
  maskAiFields,
}: OpportunityCardProps) {
  const styles = categoryStyles[opportunity.category];
  const daysLeft = daysUntilDeadline(opportunity.deadline);
  const urgency =
    daysLeft <= 14
      ? "text-rose-400"
      : daysLeft <= 30
        ? "text-amber-400"
        : "text-zinc-500";
  const shouldReduceMotion = useReducedMotion();

  const hoverAnimation = shouldReduceMotion
    ? {}
    : {
        y: -4,
        scale: 1.015,
      };

  return (
    <motion.article
      whileHover={hoverAnimation}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
      className="group flex flex-col h-full rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all duration-300 hover:bg-white/[0.035] hover:border-indigo-500/20 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.08)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles.badge}`}
          >
            {opportunity.category}
          </span>
          {opportunity.source && (
            <span className="inline-flex shrink-0 items-center rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
              {opportunity.source.toUpperCase()}
            </span>
          )}
          {matchScore !== undefined && (
            maskAiFields ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400 ring-1 ring-indigo-500/20">
                <svg className="h-3 w-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="blur-[3px] select-none font-mono">92%</span> Match
              </span>
            ) : (
              <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                matchScore >= 90
                  ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                  : matchScore >= 75
                    ? "bg-indigo-500/10 text-indigo-400 ring-indigo-500/20"
                    : matchScore >= 50
                      ? "bg-amber-500/10 text-amber-400 ring-amber-500/20"
                      : "bg-zinc-500/10 text-zinc-400 ring-zinc-500/20"
              }`}>
                ⚡ <AnimatedMatchScore value={matchScore} />% Match
              </span>
            )
          )}
          {trackerStatus && trackerStatus !== "none" && (
            <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
              trackerStatus === "applied"
                ? "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20"
                : trackerStatus === "interview"
                  ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
                  : trackerStatus === "offer"
                    ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20"
            }`}>
              {trackerStatus.charAt(0).toUpperCase() + trackerStatus.slice(1)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <time
            dateTime={opportunity.deadline}
            className={`shrink-0 text-xs font-medium ${urgency}`}
          >
            {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "Due today" : "Closed"}
          </time>
          {onToggleSave && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onToggleSave();
              }}
              className={`rounded-full p-1.5 transition-all cursor-pointer ${
                isSaved
                  ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
              aria-label={isSaved ? "Unsave opportunity" : "Save opportunity"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={isSaved ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <h2 className="mt-4 text-lg font-semibold leading-snug text-white group-hover:text-indigo-100">
        <Link href={`/opportunities/${opportunity.id}`} className="hover:underline">
          {opportunity.title}
        </Link>
      </h2>

      <p className="mt-2 text-sm text-zinc-500">{opportunity.organizer}</p>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400 line-clamp-3">
        {opportunity.description}
      </p>

      {/* AI Recommendation callout box */}
      {matchScore !== undefined && matchReasons && matchReasons.length > 0 && (
        <div className="mt-4 rounded-xl bg-white/[0.01] border border-white/5 p-3.5 relative overflow-hidden">
          {maskAiFields && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/60 backdrop-blur-[2.5px]">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-indigo-300 flex items-center gap-1.5 bg-zinc-900/90 px-2.5 py-1.5 rounded-full border border-white/5">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Sign In to Unlock
              </span>
            </div>
          )}
          <div className={`text-[10px] font-bold tracking-wider uppercase text-zinc-500 mb-2 flex items-center justify-between ${maskAiFields ? 'blur-[1.5px] select-none' : ''}`}>
            <span>⚡ AI RECOMMENDATION</span>
            <span className={`text-[10px] font-bold ${
              matchScore >= 90
                ? "text-emerald-400"
                : matchScore >= 75
                  ? "text-indigo-400"
                  : matchScore >= 50
                    ? "text-amber-400"
                    : "text-zinc-500"
            }`}>
              {matchScore >= 90 ? "Excellent Match" : matchScore >= 75 ? "Strong Match" : matchScore >= 50 ? "Moderate Match" : "Weak Match"}
            </span>
          </div>
          <div className={`flex flex-col gap-1.5 ${maskAiFields ? 'blur-[2px] select-none' : ''}`}>
            {matchReasons.slice(0, 2).map((reason, idx) => (
              <span key={idx} className="text-xs text-zinc-300 flex items-start gap-1.5 leading-normal">
                <span className="text-indigo-400 font-semibold shrink-0">•</span>
                <span>{reason}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {onChangeTrackerStatus && (
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/5 pt-4">
          <label htmlFor={`tracker-status-${opportunity.id}`} className="text-xs text-zinc-400 font-medium">
            Application Status:
          </label>
          <select
            id={`tracker-status-${opportunity.id}`}
            value={trackerStatus || "none"}
            onChange={(e) => onChangeTrackerStatus(e.target.value as "applied" | "interview" | "offer" | "rejected" | "none")}
            className="rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 outline-none transition-colors focus:border-indigo-500 cursor-pointer"
          >
            <option value="none">Not Applied</option>
            <option value="applied">Applied</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/5 pt-5">
        <p className="text-xs text-zinc-500">
          Deadline:{" "}
          <span className="font-medium text-zinc-400">
            {formatDeadline(opportunity.deadline)}
            {opportunity.isDeadlineEstimated && (
              <span className="ml-1 text-[10px] font-normal text-zinc-500 italic" title="Deadline calculated dynamically from posting date">(Est.)</span>
            )}
          </span>
        </p>
        <a
          href={opportunity.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40"
        >
          Apply
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 6H5.25A2.25 2.25 0 003 8.25v8.25A2.25 2.25 0 005.25 18.75h13.5A2.25 2.25 0 0021 16.5V8.25m-13.5 0L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </a>
      </div>
    </motion.article>
  );
}
