"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const opportunityTypes = [
  { label: "Internships", color: "from-violet-500/20 to-violet-500/5 border-violet-500/20" },
  { label: "Hackathons", color: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/20" },
  { label: "Scholarships", color: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20" },
  { label: "Fellowships", color: "from-amber-500/20 to-amber-500/5 border-amber-500/20" },
  { label: "Competitions", color: "from-rose-500/20 to-rose-500/5 border-rose-500/20" },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1] as const, // premium easeOutExpo
    },
  },
};

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
      <div className="pointer-events-none absolute inset-0 grid-overlay" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div
            variants={itemVariants}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-zinc-300 backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Now in early access — built for students
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.1]"
          >
            Discover opportunities that{" "}
            <span className="text-gradient">move your career forward</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl"
          >
            Career Radar AI scans the landscape so you don&apos;t have to — surfacing
            internships, hackathons, scholarships, fellowships, and competitions
            tailored to your goals.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/opportunities"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:shadow-indigo-500/50 sm:w-auto"
            >
              Start exploring free
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <a
              href="#features"
              className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 sm:w-auto"
            >
              See how it works
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mt-16 flex flex-wrap items-center justify-center gap-3"
        >
          {opportunityTypes.map((type) => (
            <motion.span
              variants={itemVariants}
              key={type.label}
              className={`inline-flex items-center rounded-full border bg-gradient-to-b px-4 py-2 text-sm font-medium text-zinc-200 ${type.color}`}
            >
              {type.label}
            </motion.span>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          className="relative mx-auto mt-16 max-w-4xl"
        >
          <div className="glow-ring overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 p-1 backdrop-blur-sm">
            <div className="rounded-xl bg-zinc-950/80 p-6 sm:p-8">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs text-zinc-500">career-radar.ai/dashboard</span>
              </div>

              <div className="space-y-3">
                {[
                  { title: "Google SWE Internship 2026", tag: "Internship", match: "98%" },
                  { title: "ETHGlobal Hackathon — Paris", tag: "Hackathon", match: "94%" },
                  { title: "Gates Scholarship Program", tag: "Scholarship", match: "91%" },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3 transition-colors hover:border-white/10"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-zinc-500">{item.tag}</p>
                    </div>
                    <span className="ml-4 shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                      {item.match} match
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
