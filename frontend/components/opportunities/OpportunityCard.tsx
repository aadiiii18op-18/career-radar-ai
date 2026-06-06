import { categoryStyles } from "@/lib/categories";
import { daysUntilDeadline, formatDeadline } from "@/lib/format-date";
import type { Opportunity } from "@/types/opportunity";

interface OpportunityCardProps {
  opportunity: Opportunity;
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
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
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles.badge}`}
        >
          {opportunity.category}
        </span>
        <time
          dateTime={opportunity.deadline}
          className={`shrink-0 text-xs font-medium ${urgency}`}
        >
          {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "Due today" : "Closed"}
        </time>
      </div>

      <h2 className="mt-4 text-lg font-semibold leading-snug text-white group-hover:text-indigo-100">
        {opportunity.title}
      </h2>

      <p className="mt-2 text-sm text-zinc-500">{opportunity.organizer}</p>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400 line-clamp-3">
        {opportunity.description}
      </p>

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
