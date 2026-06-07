"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { createOpportunity } from "@/lib/firestore";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import Link from "next/link";
import type { OpportunityCategory } from "@/types/opportunity";
import { mockOpportunities } from "@/lib/mock-opportunities";

const ADMIN_EMAILS = [
  "aadiiii18op@gmail.com",
];

const CATEGORIES: OpportunityCategory[] = [
  "Internship",
  "Hackathon",
  "Scholarship",
  "Fellowship",
  "Competition",
];

export default function AdminPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [category, setCategory] = useState<OpportunityCategory>("Internship");
  const [deadline, setDeadline] = useState("");
  const [applyUrl, setApplyUrl] = useState("");
  const [description, setDescription] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isAdmin = user?.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false;

  const handleSeed = async () => {
    if (!isAdmin) return;
    setSeeding(true);
    setError(null);
    setSuccess(false);

    try {
      let count = 0;
      for (const opp of mockOpportunities) {
        await createOpportunity({
          title: opp.title,
          organizer: opp.organizer,
          category: opp.category,
          deadline: opp.deadline,
          applyUrl: opp.applyUrl,
          description: opp.description,
        });
        count++;
      }
      setSuccess(true);
      alert(`${count} mock opportunities successfully seeded into Firestore!`);
    } catch (err) {
      console.error("Error seeding opportunities:", err);
      const message = err instanceof Error ? err.message : "Failed to seed database.";
      setError(message);
    } finally {
      setSeeding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setError("Unauthorized operation.");
      return;
    }

    if (!title || !organizer || !deadline || !applyUrl || !description) {
      setError("Please fill out all fields.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await createOpportunity({
        title,
        organizer,
        category,
        deadline,
        applyUrl,
        description,
      });

      setSuccess(true);
      // Clear form
      setTitle("");
      setOrganizer("");
      setCategory("Internship");
      setDeadline("");
      setApplyUrl("");
      setDescription("");
    } catch (err) {
      console.error("Error creating opportunity:", err);
      const message = err instanceof Error ? err.message : "Failed to create opportunity. Please check Firestore security rules.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="mesh-bg flex min-h-full flex-col">
        <Header />
        <main className="flex-1 pt-24 pb-20 sm:pt-28">
          <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div
              className="pointer-events-none absolute inset-x-0 -top-8 h-48 grid-overlay opacity-50"
              aria-hidden
            />

            <div className="relative mb-8">
              <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">
                Admin Panel
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Upload New <span className="text-gradient">Opportunity</span>
              </h1>
              <p className="mt-2 text-zinc-400">
                Post internships, hackathons, and other student resources to the dynamic database.
              </p>
            </div>

            {!isAdmin ? (
              <div className="relative rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-center shadow-xl backdrop-blur-xl">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Access Denied</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Logged in as <span className="text-zinc-200">{user?.email || "unknown"}</span>.
                </p>
                <p className="mt-1 text-sm text-rose-400/90">
                  This account is not authorized to access the Admin Panel.
                </p>
                
                <div className="mt-6 rounded-lg bg-zinc-950/40 p-4 text-left border border-white/5">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Authorized Temporary Admin Allowlist:
                  </p>
                  <ul className="grid grid-cols-1 gap-1 text-xs text-zinc-500 sm:grid-cols-2">
                    {ADMIN_EMAILS.map((email) => (
                      <li key={email} className="font-mono">{email}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 flex justify-center gap-4">
                  <Link
                    href="/dashboard"
                    className="rounded-full bg-white/5 border border-white/10 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl border border-white/5 bg-white/[0.02] p-8 shadow-xl backdrop-blur-md">
                {/* Seed Database Option */}
                <div className="mb-6 flex flex-col justify-between gap-4 rounded-xl border border-indigo-500/10 bg-indigo-500/[0.02] p-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-semibold text-white">Need test data?</h3>
                    <p className="text-xs text-zinc-400">
                      Populate your Firestore collection with all 15 default mock opportunities instantly.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSeed}
                    disabled={seeding || submitting}
                    className="shrink-0 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-semibold text-indigo-400 transition-colors hover:bg-indigo-500/20 disabled:opacity-50"
                  >
                    {seeding ? "Seeding..." : "Seed Database"}
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-400">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-400">
                      Opportunity successfully added to Firestore collection!
                    </div>
                  )}

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-zinc-300">
                        Opportunity Title
                      </label>
                      <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Google Software Engineering Intern"
                        className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="organizer" className="block text-sm font-medium text-zinc-300">
                        Organizer / Company
                      </label>
                      <input
                        id="organizer"
                        type="text"
                        value={organizer}
                        onChange={(e) => setOrganizer(e.target.value)}
                        placeholder="e.g. Google"
                        className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-zinc-300">
                        Category
                      </label>
                      <select
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as OpportunityCategory)}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="deadline" className="block text-sm font-medium text-zinc-300">
                        Application Deadline
                      </label>
                      <input
                        id="deadline"
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="applyUrl" className="block text-sm font-medium text-zinc-300">
                      Application / Link URL
                    </label>
                    <input
                      id="applyUrl"
                      type="url"
                      value={applyUrl}
                      onChange={(e) => setApplyUrl(e.target.value)}
                      placeholder="https://example.com/apply"
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-zinc-300">
                      Detailed Description
                    </label>
                    <textarea
                      id="description"
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Explain requirements, role expectations, and target candidates..."
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 resize-y"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-4 pt-4">
                    <Link
                      href="/dashboard"
                      className="rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Uploading…
                        </>
                      ) : (
                        "Upload Opportunity"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
