const features = [
  {
    title: "AI-Powered Matching",
    description:
      "Our engine learns your interests, skills, and timeline — then surfaces opportunities you’re most likely to win.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
      />
    ),
  },
  {
    title: "One Unified Feed",
    description:
      "Stop juggling ten tabs. Browse internships, hackathons, scholarships, fellowships, and competitions in a single dashboard.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    ),
  },
  {
    title: "Smart Deadline Alerts",
    description:
      "Never miss an application window. Get notified before deadlines close on opportunities you’ve saved.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
      />
    ),
  },
  {
    title: "Advanced Filters",
    description:
      "Filter by remote vs. on-site, eligibility, field of study, compensation, and more — find exactly what fits.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
      />
    ),
  },
  {
    title: "Profile-Based Recommendations",
    description:
      "Build a student profile once. Career Radar keeps learning and refining suggestions as new listings appear.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    ),
  },
  {
    title: "Save & Track",
    description:
      "Bookmark opportunities, track application status, and organize your pipeline from discovery to submission.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
      />
    ),
  },
];

const categories = [
  {
    name: "Internships",
    description: "Paid and unpaid roles at top companies and startups worldwide.",
    accent: "text-violet-400",
    dot: "bg-violet-400",
  },
  {
    name: "Hackathons",
    description: "Build, compete, and network at events from local to global scale.",
    accent: "text-cyan-400",
    dot: "bg-cyan-400",
  },
  {
    name: "Scholarships",
    description: "Fund your education with merit and need-based awards.",
    accent: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  {
    name: "Fellowships",
    description: "Research, leadership, and professional development programs.",
    accent: "text-amber-400",
    dot: "bg-amber-400",
  },
  {
    name: "Competitions",
    description: "Case competitions, olympiads, and challenges that build your résumé.",
    accent: "text-rose-400",
    dot: "bg-rose-400",
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">
            Features
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything you need to find the right opportunity
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            From discovery to deadline — Career Radar AI is your command center for
            student career growth.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:border-white/10 hover:bg-white/[0.04]"
            >
              <div className="mb-4 inline-flex rounded-xl bg-indigo-500/10 p-3 text-indigo-400 ring-1 ring-indigo-500/20 transition-colors group-hover:bg-indigo-500/15">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
                  {feature.icon}
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-20">
          <h3 className="text-center text-xl font-semibold text-white sm:text-2xl">
            Five opportunity types. One platform.
          </h3>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {categories.map((cat) => (
              <div
                key={cat.name}
                className="glass rounded-xl p-5 text-center transition-transform hover:-translate-y-0.5"
              >
                <div className={`mx-auto mb-3 h-2 w-2 rounded-full ${cat.dot}`} />
                <p className={`text-sm font-semibold ${cat.accent}`}>{cat.name}</p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  {cat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
