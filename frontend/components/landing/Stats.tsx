const stats = [
  { value: "10K+", label: "Opportunities indexed", sub: "Across 50+ countries" },
  { value: "5", label: "Opportunity types", sub: "One unified platform" },
  { value: "98%", label: "Match accuracy", sub: "AI-powered recommendations" },
  { value: "24/7", label: "Fresh listings", sub: "Updated continuously" },
];

export function Stats() {
  return (
    <section id="stats" className="relative py-24 sm:py-28">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/20 to-transparent" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-sm">
          <div className="grid divide-y divide-white/5 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="px-8 py-10 text-center sm:py-12">
                <p className="text-4xl font-bold tracking-tight text-gradient sm:text-5xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{stat.label}</p>
                <p className="mt-1 text-xs text-zinc-500">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-zinc-500">
          Trusted by students at universities worldwide — from first-years to PhD candidates.
        </p>
      </div>
    </section>
  );
}
