"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { 
  createOpportunity, 
  isDuplicateHash, 
  upsertOpportunity, 
  getOpportunities,
  getOpportunityStats,
  getDataQualityMetrics,
  getDuplicateReport,
  archiveExpiredOpportunities,
  type OpportunityStats,
  type DataQualityMetrics,
  type DuplicateReport
} from "@/lib/firestore";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import Link from "next/link";
import type { Opportunity, OpportunityCategory } from "@/types/opportunity";
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
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<{
    inserted: number;
    updated: number;
    skipped: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [activeTab, setActiveTab] = useState<"upload" | "quality">("upload");
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [stats, setStats] = useState<OpportunityStats | null>(null);
  const [quality, setQuality] = useState<DataQualityMetrics | null>(null);
  const [dupReport, setDupReport] = useState<DuplicateReport | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const loadMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const opps = await getOpportunities();
      setOpportunities(opps);
      
      const st = await getOpportunityStats();
      setStats(st);
      
      const q = await getDataQualityMetrics();
      setQuality(q);
      
      const d = await getDuplicateReport();
      setDupReport(d);
    } catch (err) {
      console.error("Error loading quality metrics:", err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    if (activeTab === "quality") {
      Promise.resolve().then(() => {
        loadMetrics();
      });
    }
  }, [activeTab]);

  const handleArchiveExpired = async () => {
    setArchiving(true);
    setError(null);
    setSuccess(false);
    try {
      const archivedCount = await archiveExpiredOpportunities();
      alert(`Successfully soft-archived ${archivedCount} expired opportunities!`);
      loadMetrics();
    } catch (err) {
      console.error("Error archiving expired opportunities:", err);
      setError("Failed to archive expired opportunities.");
    } finally {
      setArchiving(false);
    }
  };

  interface SourceQualityItem {
    source: string;
    total: number;
    active: number;
    expired: number;
    avgDescLen: number;
    missingPercentage: number;
    latestSync: Date | null;
  }

  const computeSourceQuality = (): SourceQualityItem[] => {
    const todayStr = new Date().toISOString().split("T")[0];
    const sources = ["devfolio", "unstop", "manual"];
    
    return sources.map((srcName) => {
      const filtered = opportunities.filter((opp) => {
        const source = opp.source || "manual";
        return source === srcName;
      });
      
      if (filtered.length === 0) {
        return {
          source: srcName,
          total: 0,
          active: 0,
          expired: 0,
          avgDescLen: 0,
          missingPercentage: 0,
          latestSync: null,
        };
      }
      
      let active = 0;
      let expired = 0;
      let totalDescLen = 0;
      let totalMissingFields = 0;
      let maxSyncTime = 0;
      
      filtered.forEach((opp) => {
        const isExpired = opp.deadline < todayStr || opp.isActive === false;
        if (isExpired) {
          expired++;
        } else {
          active++;
        }
        
        totalDescLen += opp.description?.length || 0;
        
        const hasTitle = opp.title && opp.title.trim() !== "" && opp.title !== "N/A";
        const hasDesc = opp.description && opp.description.trim() !== "";
        const hasDeadline = opp.deadline && opp.deadline.trim() !== "";
        const hasOrganizer = opp.organizer && opp.organizer.trim() !== "" && opp.organizer !== "Devfolio Event" && opp.organizer !== "Unstop Event";
        const hasUrl = opp.applyUrl && opp.applyUrl.trim() !== "";
        
        let missing = 0;
        if (!hasTitle) missing++;
        if (!hasDesc) missing++;
        if (!hasDeadline) missing++;
        if (!hasOrganizer) missing++;
        if (!hasUrl) missing++;
        totalMissingFields += missing;
        
        const ts = opp.updatedAt;
        if (ts) {
          let t = 0;
          const tsObj = ts as unknown as { toDate?: () => Date; seconds?: number };
          if (typeof tsObj.toDate === "function") {
            t = tsObj.toDate().getTime();
          } else if (typeof tsObj.seconds === "number") {
            t = tsObj.seconds * 1000;
          } else {
            t = new Date(ts as unknown as string | number).getTime();
          }
          if (t > maxSyncTime) maxSyncTime = t;
        }
      });
      
      const totalFields = filtered.length * 5;
      
      return {
        source: srcName,
        total: filtered.length,
        active,
        expired,
        avgDescLen: Math.round(totalDescLen / filtered.length),
        missingPercentage: Math.round((totalMissingFields / totalFields) * 100),
        latestSync: maxSyncTime > 0 ? new Date(maxSyncTime) : null,
      };
    });
  };

  const isAdmin = user?.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false;

  const generateFingerprintHash = async (title: string, organizer: string): Promise<string> => {
    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normalizedOrganizer = organizer.toLowerCase().replace(/[^a-z0-9]/g, "");
    const msg = `${normalizedTitle}_${normalizedOrganizer}`;

    const msgBuffer = new TextEncoder().encode(msg);
    const cryptoObj = typeof window !== "undefined" ? window.crypto : (globalThis as unknown as { crypto?: Crypto }).crypto;
    
    if (!cryptoObj || !cryptoObj.subtle) {
      let hash = 0;
      for (let i = 0; i < msg.length; i++) {
        const char = msg.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16);
    }

    const hashBuffer = await cryptoObj.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const sanitizeDescription = (markdownDesc: string): string => {
    if (!markdownDesc) return "";
    return markdownDesc
      .replace(/[#*`_\-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  interface DevfolioHackathon {
    uuid?: string;
    id?: string;
    name?: string;
    desc?: string;
    tagline?: string;
    slug?: string;
    starts_at?: string;
    ends_at?: string;
    themes?: Array<{ name?: string }>;
    hackathon_setting?: {
      subdomain?: string;
      contact_email?: string;
      site_url?: string;
      reg_ends_at?: string;
    };
  }

  const normalizeDevfolioOpportunity = async (rawItem: DevfolioHackathon): Promise<Opportunity> => {
    const externalId = rawItem.uuid || rawItem.id || "";
    const title = rawItem.name || "N/A";
    
    const subdomain = rawItem.hackathon_setting?.subdomain || rawItem.slug || "";
    const organizer = rawItem.hackathon_setting?.contact_email
      ? rawItem.hackathon_setting.contact_email.split("@")[0].toUpperCase()
      : subdomain
        ? subdomain.charAt(0).toUpperCase() + subdomain.slice(1)
        : "Devfolio Event";

    const slug = rawItem.slug;
    const url = slug ? `https://${slug}.devfolio.co/` : rawItem.hackathon_setting?.site_url || "https://devfolio.co/hackathons";
    
    const deadlineRaw = rawItem.hackathon_setting?.reg_ends_at || rawItem.ends_at || rawItem.starts_at || "";
    const deadline = deadlineRaw ? deadlineRaw.split("T")[0] : new Date().toISOString().split("T")[0];

    const description = sanitizeDescription(rawItem.desc || rawItem.tagline || "");
    const themes = Array.isArray(rawItem.themes)
      ? (rawItem.themes.map((t: { name?: string }) => t.name).filter(Boolean) as string[])
      : [];

    const hash = await generateFingerprintHash(title, organizer);
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const isActive = deadlineDate >= now;

    return {
      id: `devfolio_${externalId}`,
      source: "devfolio",
      externalId,
      title,
      organizer,
      category: "Hackathon",
      description,
      deadline,
      applyUrl: url,
      url,
      isActive,
      tags: themes,
      hash,
    };
  };

  const handleSyncDevfolio = async () => {
    if (!isAdmin) return;
    setSyncing(true);
    setError(null);
    setSuccess(false);
    setSyncResults(null);

    try {
      const response = await fetch("/api/proxy-devfolio");
      if (!response.ok) {
        throw new Error(`Devfolio API Proxy returned status ${response.status}`);
      }
      const data = await response.json();
      const rawItems = (data.result || []) as DevfolioHackathon[];

      let inserted = 0;
      let updated = 0;
      let skipped = 0;

      for (const rawItem of rawItems) {
        const normalized = await normalizeDevfolioOpportunity(rawItem);
        const isDup = normalized.hash ? await isDuplicateHash(normalized.hash) : false;

        if (isDup) {
          skipped++;
          continue;
        }

        const res = await upsertOpportunity(normalized);
        if (res === "inserted") {
          inserted++;
        } else {
          updated++;
        }
      }

      setSyncResults({ inserted, updated, skipped });
      setSuccess(true);
      window.dispatchEvent(new Event("bookmark-updated"));
    } catch (err) {
      console.error("Sync failed:", err);
      const message = err instanceof Error ? err.message : "Failed to sync Devfolio opportunities.";
      setError(message);
    } finally {
      setSyncing(false);
    }
  };

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
                {/* Tabs selector */}
                <div className="mb-8 flex border-b border-white/10 pb-px">
                  <button
                    type="button"
                    onClick={() => setActiveTab("upload")}
                    className={`pb-4 text-sm font-semibold border-b-2 px-4 transition-colors cursor-pointer ${
                      activeTab === "upload"
                        ? "border-indigo-500 text-indigo-400 font-bold"
                        : "border-transparent text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Ingestion & Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("quality")}
                    className={`pb-4 text-sm font-semibold border-b-2 px-4 transition-colors cursor-pointer ${
                      activeTab === "quality"
                        ? "border-indigo-500 text-indigo-400 font-bold"
                        : "border-transparent text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Data Quality Dashboard
                  </button>
                </div>

                {activeTab === "upload" && (
                  <div>
                    {/* Sync Devfolio Option */}
                    <div className="mb-6 flex flex-col justify-between gap-4 rounded-xl border border-indigo-500/10 bg-indigo-500/[0.02] p-4 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="font-semibold text-white">Sync Devfolio Hackathons</h3>
                        <p className="text-xs text-zinc-400">
                          Fetch and ingest live, upcoming opportunities from the Devfolio API.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleSyncDevfolio}
                        disabled={syncing || seeding || submitting}
                        className="shrink-0 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 disabled:opacity-50 cursor-pointer"
                      >
                        {syncing ? "Syncing..." : "Sync Devfolio"}
                      </button>
                    </div>

                    {syncResults && (
                      <div className="mb-6 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02] p-4 text-xs text-emerald-400">
                        <p className="font-semibold text-white mb-2">Sync completed successfully!</p>
                        <ul className="grid grid-cols-3 gap-2 text-center text-xs">
                          <li className="rounded bg-white/5 p-2 border border-white/5">
                            <span className="block text-white font-bold text-lg">{syncResults.inserted}</span>
                            New
                          </li>
                          <li className="rounded bg-white/5 p-2 border border-white/5">
                            <span className="block text-white font-bold text-lg">{syncResults.updated}</span>
                            Updated
                          </li>
                          <li className="rounded bg-white/5 p-2 border border-white/5">
                            <span className="block text-white font-bold text-lg">{syncResults.skipped}</span>
                            Skipped
                          </li>
                        </ul>
                      </div>
                    )}

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

                {activeTab === "quality" && (
                  <div className="space-y-8">
                    {error && (
                      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-400">
                        {error}
                      </div>
                    )}
                    {loadingMetrics ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                        <p className="mt-4 text-sm text-zinc-400 animate-pulse">Loading data quality metrics...</p>
                      </div>
                    ) : (
                      <>
                        {/* A. Overview Stats Grid */}
                        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 shadow-sm">
                            <span className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total</span>
                            <span className="mt-2 block text-3xl font-extrabold text-white">{stats?.total || 0}</span>
                          </div>
                          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 shadow-sm">
                            <span className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider text-emerald-400/90">Active</span>
                            <span className="mt-2 block text-3xl font-extrabold text-emerald-400">{stats?.active || 0}</span>
                          </div>
                          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 shadow-sm">
                            <span className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider text-rose-400/90">Expired</span>
                            <span className="mt-2 block text-3xl font-extrabold text-rose-400">{stats?.expired || 0}</span>
                          </div>
                          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 shadow-sm">
                            <span className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider text-indigo-400/90">Completeness</span>
                            <span className="mt-2 block text-3xl font-extrabold text-indigo-400">{quality?.completenessPercentage || 0}%</span>
                          </div>
                        </div>

                        {/* E & Recent Sync. Source Quality & Sync Report */}
                        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 shadow-sm overflow-hidden">
                          <h3 className="text-lg font-bold text-white mb-4">Source Quality & Sync Report</h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-white/10 text-zinc-500 uppercase tracking-wider font-semibold">
                                  <th className="pb-3 text-left">Source</th>
                                  <th className="pb-3 text-center">Total</th>
                                  <th className="pb-3 text-center text-emerald-500/80">Active</th>
                                  <th className="pb-3 text-center text-rose-500/80">Expired</th>
                                  <th className="pb-3 text-center">Avg Desc Length</th>
                                  <th className="pb-3 text-center">Missing Data %</th>
                                  <th className="pb-3 text-right">Recent Sync Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5 text-zinc-300 font-medium">
                                {computeSourceQuality().map((row) => (
                                  <tr key={row.source} className="hover:bg-white/[0.01] transition-colors">
                                    <td className="py-3 text-left text-white capitalize">{row.source}</td>
                                    <td className="py-3 text-center">{row.total}</td>
                                    <td className="py-3 text-center text-emerald-400">{row.active}</td>
                                    <td className="py-3 text-center text-rose-400">{row.expired}</td>
                                    <td className="py-3 text-center">{row.avgDescLen} chars</td>
                                    <td className={`py-3 text-center ${row.missingPercentage > 0 ? "text-amber-400 font-semibold" : "text-zinc-500"}`}>
                                      {row.missingPercentage}%
                                    </td>
                                    <td className="py-3 text-right text-zinc-400 font-mono text-[11px]">
                                      {row.latestSync 
                                        ? row.latestSync.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) 
                                        : "Never / Manual"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Category Breakdown */}
                        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 shadow-sm">
                          <h3 className="text-lg font-bold text-white mb-4">Category Breakdown</h3>
                          <div className="grid gap-4 grid-cols-2 sm:grid-cols-5">
                            {["Internship", "Hackathon", "Scholarship", "Fellowship", "Competition"].map((cat) => {
                              const count = stats?.byCategory[cat] || 0;
                              return (
                                <div key={cat} className="rounded-lg bg-zinc-950/40 border border-white/5 p-4 text-center">
                                  <span className="block text-xs text-zinc-500 mb-1">{cat}</span>
                                  <span className="text-xl font-extrabold text-white">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* B. Data Health & Missing Fields Progress Checklist */}
                        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 shadow-sm">
                          <h3 className="text-lg font-bold text-white mb-4">Data Health (Missing Fields Audit)</h3>
                          <div className="space-y-4">
                            <div>
                              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                                <span>Missing Titles</span>
                                <span className={quality?.missingTitle ? "text-rose-400 font-semibold" : "text-zinc-500"}>
                                  {quality?.missingTitle || 0} records
                                </span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                                <div 
                                  className="h-full bg-indigo-500 transition-all duration-500" 
                                  style={{ width: `${Math.max(0, 100 - ((quality?.missingTitle || 0) / (stats?.total || 1)) * 100)}%` }} 
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                                <span>Missing Descriptions</span>
                                <span className={quality?.missingDescription ? "text-rose-400 font-semibold" : "text-zinc-500"}>
                                  {quality?.missingDescription || 0} records
                                </span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                                <div 
                                  className="h-full bg-indigo-500 transition-all duration-500" 
                                  style={{ width: `${Math.max(0, 100 - ((quality?.missingDescription || 0) / (stats?.total || 1)) * 100)}%` }} 
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                                <span>Missing Deadlines</span>
                                <span className={quality?.missingDeadline ? "text-rose-400 font-semibold" : "text-zinc-500"}>
                                  {quality?.missingDeadline || 0} records
                                </span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                                <div 
                                  className="h-full bg-indigo-500 transition-all duration-500" 
                                  style={{ width: `${Math.max(0, 100 - ((quality?.missingDeadline || 0) / (stats?.total || 1)) * 100)}%` }} 
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                                <span>Missing Organizers</span>
                                <span className={quality?.missingOrganizer ? "text-rose-400 font-semibold" : "text-zinc-500"}>
                                  {quality?.missingOrganizer || 0} records
                                </span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                                <div 
                                  className="h-full bg-indigo-500 transition-all duration-500" 
                                  style={{ width: `${Math.max(0, 100 - ((quality?.missingOrganizer || 0) / (stats?.total || 1)) * 100)}%` }} 
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                                <span>Missing Application URLs</span>
                                <span className={quality?.missingUrl ? "text-rose-400 font-semibold" : "text-zinc-500"}>
                                  {quality?.missingUrl || 0} records
                                </span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                                <div 
                                  className="h-full bg-indigo-500 transition-all duration-500" 
                                  style={{ width: `${Math.max(0, 100 - ((quality?.missingUrl || 0) / (stats?.total || 1)) * 100)}%` }} 
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* C. Duplicate Detection Dashboard */}
                        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 shadow-sm">
                          <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                            <div>
                              <h3 className="text-lg font-bold text-white">Duplicate Detection Report</h3>
                              <p className="text-xs text-zinc-400">Audit listings sharing identical title + organizer fingerprints.</p>
                            </div>
                            <div className="flex gap-4 text-xs font-medium">
                              <div className="rounded bg-white/5 border border-white/5 px-3 py-1.5 text-center">
                                <span className="block text-zinc-500 text-[10px] uppercase">Unique Hashes</span>
                                <span className="font-extrabold text-white text-sm">{dupReport?.totalUniqueHashes || 0}</span>
                              </div>
                              <div className="rounded bg-white/5 border border-white/5 px-3 py-1.5 text-center">
                                <span className="block text-zinc-500 text-[10px] uppercase">Duplicate Hashes</span>
                                <span className={`font-extrabold text-sm ${dupReport?.duplicateHashesCount ? "text-rose-400" : "text-white"}`}>
                                  {dupReport?.duplicateHashesCount || 0}
                                </span>
                              </div>
                              <div className="rounded bg-white/5 border border-white/5 px-3 py-1.5 text-center">
                                <span className="block text-zinc-500 text-[10px] uppercase">Duplicate Records</span>
                                <span className={`font-extrabold text-sm ${dupReport?.duplicateRecordsCount ? "text-rose-400" : "text-white"}`}>
                                  {dupReport?.duplicateRecordsCount || 0}
                                </span>
                              </div>
                            </div>
                          </div>

                          {dupReport?.duplicateGroups && dupReport.duplicateGroups.length > 0 ? (
                            <div className="space-y-4">
                              {dupReport.duplicateGroups.map((group, idx) => (
                                <div key={idx} className="rounded-lg border border-rose-500/20 bg-rose-500/[0.01] p-4">
                                  <div className="mb-2 flex items-center justify-between text-xs text-rose-400 font-bold border-b border-rose-500/10 pb-2">
                                    <span className="font-mono">Hash: {group.hash.slice(0, 16)}...</span>
                                    <span>{group.opportunities.length} duplicate records found</span>
                                  </div>
                                  <ul className="divide-y divide-white/5 text-xs text-zinc-300">
                                    {group.opportunities.map((opp) => (
                                      <li key={opp.id} className="py-2.5 flex items-center justify-between">
                                        <div>
                                          <span className="font-bold text-white">{opp.title}</span>
                                          <span className="ml-2 text-zinc-500 text-[11px]">by {opp.organizer}</span>
                                        </div>
                                        <div className="flex gap-4 text-[10px] font-mono">
                                          <span className="uppercase bg-white/5 px-1.5 py-0.5 rounded text-zinc-400">ID: {opp.id}</span>
                                          <span className="uppercase bg-white/5 px-1.5 py-0.5 rounded text-zinc-400">Source: {opp.source || "manual"}</span>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-lg border border-white/5 bg-zinc-950/20 py-8 text-center text-xs text-zinc-500">
                              No duplicate opportunities detected.
                            </div>
                          )}
                        </div>

                        {/* D. Expired Opportunity Audit & Action Button */}
                        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 shadow-sm">
                          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                            <div>
                              <h3 className="text-lg font-bold text-white">Expired Opportunity Audit</h3>
                              <p className="text-xs text-zinc-400">
                                Active opportunities whose deadline has passed.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleArchiveExpired}
                              disabled={archiving || loadingMetrics}
                              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 disabled:opacity-50 cursor-pointer"
                            >
                              {archiving ? "Archiving..." : "Archive Expired Opportunities"}
                            </button>
                          </div>

                          {opportunities.filter((o) => {
                            const todayStr = new Date().toISOString().split("T")[0];
                            return o.deadline < todayStr && o.isActive !== false;
                          }).length > 0 ? (
                            <div className="overflow-x-auto max-h-60 overflow-y-auto border border-white/5 rounded-lg">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-white/10 bg-zinc-950/40 text-zinc-500 uppercase tracking-wider sticky top-0 font-semibold">
                                    <th className="p-3 text-left">Title</th>
                                    <th className="p-3 text-center">Source</th>
                                    <th className="p-3 text-right">Deadline</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-zinc-300 font-medium">
                                  {opportunities
                                    .filter((o) => {
                                      const todayStr = new Date().toISOString().split("T")[0];
                                      return o.deadline < todayStr && o.isActive !== false;
                                    })
                                    .map((opp) => (
                                      <tr key={opp.id} className="hover:bg-white/[0.01] transition-colors">
                                        <td className="p-3 text-left text-white">{opp.title}</td>
                                        <td className="p-3 text-center capitalize">{opp.source || "manual"}</td>
                                        <td className="p-3 text-right text-rose-400 font-semibold font-mono">{opp.deadline}</td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="rounded-lg border border-white/5 bg-zinc-950/20 py-8 text-center text-xs text-zinc-500">
                              All expired opportunities are fully soft-archived.
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
