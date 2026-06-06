import Link from "next/link";

const navLinks = [
  { href: "/opportunities", label: "Opportunities" },
  { href: "/#features", label: "Features" },
  { href: "/#stats", label: "Impact" },
  { href: "/#cta", label: "Get Started" },
];

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-lg shadow-indigo-500/25">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
              />
            </svg>
          </span>
          <span className="text-sm font-semibold tracking-tight text-white sm:text-base">
            Career Radar{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              AI
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-zinc-400 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#cta"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white sm:inline-flex"
          >
            Sign in
          </a>
          <a
            href="#cta"
            className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition-all hover:bg-zinc-100 hover:shadow-lg hover:shadow-white/10"
          >
            Get early access
          </a>
        </div>
      </div>
    </header>
  );
}
