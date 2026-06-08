import { categoryStyles } from "@/lib/categories";
import { daysUntilDeadline, formatDeadline } from "@/lib/format-date";
import type { Opportunity } from "@/types/opportunity";

interface OpportunityCardProps {
  opportunity: Opportunity;
  isSaved?: boolean;
  onToggleSave?: () => void;
  matchScore?: number;
  matchReasons?: string[];
  trackerStatus?: "applied" | "interview" | "offer" | "rejected" | "none";
  onChangeTrackerStatus?: (status: "applied" | "interview" | "offer" | "rejected" | "none") => void;
}

export function OpportunityCard({
  opportunity,
  isSaved,
  onToggleSave,
  matchScore,
  matchReasons,
  trackerStatus,
  onChangeTrackerStatus,
}: OpportunityCardProps) {
  const styles = categoryStyles[opportunity.category];
  const daysLeft = daysUntilDeadline(opportunity.deadline);
  const urgency =
    daysLeft <= 14
      ? "text-rose-400"
      : daysLeft <= 30
        ? "text-amber-400"
        : "text-zinc-500";

  return (
    <article className="group flex flex-col rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:border-white/10 hover:bg-white/[0.04]">
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
            <span className="inline-flex shrink-0 items-center rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
              ⚡ {matchScore}% Match
            </span>
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
        {opportunity.title}
      </h2>

      <p className="mt-2 text-sm text-zinc-500">{opportunity.organizer}</p>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400 line-clamp-3">
        {opportunity.description}
      </p>

      {matchReasons && matchReasons.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {matchReasons.map((reason, idx) => (
            <span
              key={idx}
              className="inline-flex items-center rounded bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-400 border border-white/5"
            >
              • {reason}
            </span>
          ))}
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
    </article>
  );
}
