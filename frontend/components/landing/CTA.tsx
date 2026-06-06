"use client";

export function CTA() {
  return (
    <section id="cta" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-950/80 via-zinc-900 to-cyan-950/50 px-6 py-16 text-center sm:px-12 sm:py-20">
          <div
            className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 right-0 h-48 w-48 rounded-full bg-cyan-500/15 blur-3xl"
            aria-hidden
          />

          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Ready to radar your next opportunity?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
              Join thousands of students who use Career Radar AI to discover
              internships, hackathons, scholarships, fellowships, and competitions
              — before anyone else.
            </p>

            <form
              className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row"
              onSubmit={(e) => e.preventDefault()}
            >
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@university.edu"
                className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3.5 text-sm text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="submit"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-zinc-950 transition-all hover:bg-zinc-100 hover:shadow-lg hover:shadow-white/10"
              >
                Get early access
              </button>
            </form>

            <p className="mt-4 text-xs text-zinc-500">
              Free during early access. No credit card required.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
