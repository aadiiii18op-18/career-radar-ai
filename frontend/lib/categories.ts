import type { OpportunityCategory } from "@/types/opportunity";

export const ALL_CATEGORIES = "All" as const;

export type CategoryFilter = OpportunityCategory | typeof ALL_CATEGORIES;

export const categoryFilters: CategoryFilter[] = [
  ALL_CATEGORIES,
  "Internship",
  "Hackathon",
  "Scholarship",
  "Fellowship",
  "Competition",
];

export const categoryStyles: Record<
  OpportunityCategory,
  { badge: string; dot: string }
> = {
  Internship: {
    badge: "bg-violet-500/10 text-violet-400 ring-violet-500/20",
    dot: "bg-violet-400",
  },
  Hackathon: {
    badge: "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20",
    dot: "bg-cyan-400",
  },
  Scholarship: {
    badge: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    dot: "bg-emerald-400",
  },
  Fellowship: {
    badge: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
    dot: "bg-amber-400",
  },
  Competition: {
    badge: "bg-rose-500/10 text-rose-400 ring-rose-500/20",
    dot: "bg-rose-400",
  },
};
