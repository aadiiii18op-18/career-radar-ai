"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/config";
import { getProfile, saveProfile } from "@/lib/firestore";
import {
  type UserProfile,
  YEAR_OPTIONS,
  SUGGESTED_SKILLS,
  SUGGESTED_INTERESTS,
} from "@/types/profile";

// ─── Tag chip ──────────────────────────────────────────────────────────────

function TagChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 border ${
        selected
          ? "bg-violet-600 border-violet-500 text-white shadow-[0_0_10px_rgba(139,92,246,0.4)]"
          : "bg-white/5 border-white/10 text-gray-400 hover:border-violet-500/50 hover:text-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Tag input with suggestion chips ──────────────────────────────────────

function TagInput({
  label,
  tags,
  suggestions,
  onChange,
  placeholder,
}: {
  label: string;
  tags: string[];
  suggestions: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [inputVal, setInputVal] = useState("");

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed]);
    setInputVal("");
  };

  const removeTag = (tag: string) =>
    onChange(tags.filter((t) => t !== tag));

  const toggleSuggestion = (s: string) =>
    tags.includes(s) ? removeTag(s) : addTag(s);

  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold text-gray-500 tracking-[0.18em] uppercase">
        {label}
      </label>

      {/* Selected tags */}
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {tags.map((t) => (
          <span
            key={t}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-600/20 border border-violet-500/40 text-violet-300 text-sm"
          >
            {t}
            <button
              type="button"
              onClick={() => removeTag(t)}
              className="text-violet-400 hover:text-white transition-colors"
              aria-label={`Remove ${t}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Free-text input */}
      <input
        type="text"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(inputVal);
          }
        }}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition"
      />

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <TagChip
            key={s}
            label={s}
            selected={tags.includes(s)}
            onToggle={() => toggleSuggestion(s)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Text field ────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  placeholder,
  colSpan2 = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  colSpan2?: boolean;
}) {
  return (
    <div className={colSpan2 ? "sm:col-span-2" : ""}>
      <label className="block text-xs font-bold text-gray-500 tracking-[0.18em] uppercase mb-2">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition"
      />
    </div>
  );
}

// ─── Profile page ──────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState<Omit<UserProfile, "updatedAt">>({
    fullName:  "",
    college:   "",
    branch:    "",
    year:      "",
    skills:    [],
    interests: [],
  });

  const setField = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  // ── Auth guard — uses getFirebaseAuth() matching project pattern ──────────
  useEffect(() => {
    // getFirebaseAuth() is client-only; safe here because this is "use client"
    const unsub = onAuthStateChanged(getFirebaseAuth(), (u) => {
      if (!u) {
        router.push("/login");
      } else {
        setUser(u);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, [router]);

  // ── Load profile once user is known ───────────────────────────────────────
  const loadProfile = useCallback(async (uid: string) => {
    setProfileLoading(true);
    try {
      const data = await getProfile(uid);
      if (data) {
        setForm({
          fullName:  data.fullName,
          college:   data.college,
          branch:    data.branch,
          year:      data.year,
          skills:    data.skills,
          interests: data.interests,
        });
      }
    } catch (e) {
      console.error("Failed to load profile:", e);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.uid) loadProfile(user.uid);
  }, [user, loadProfile]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await saveProfile(user.uid, form);
      setSuccessMsg("Profile saved successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e) {
      console.error("Save failed:", e);
      setErrorMsg("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Auth loading spinner ──────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-violet-900/20 blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[10%] w-[400px] h-[400px] rounded-full bg-indigo-900/15 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-violet-500" />
            <p className="text-xs font-bold text-violet-400 tracking-[0.2em] uppercase">
              Career Radar
            </p>
          </div>
          <h1 className="text-3xl font-bold text-white mt-1">Your Profile</h1>
          <p className="text-gray-500 text-sm mt-1">
            {user?.email} — keep your profile complete to get better opportunity matches.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm overflow-hidden">

          {profileLoading ? (
            /* Skeleton */
            <div className="p-8 space-y-6 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-24 bg-white/10 rounded" />
                  <div className="h-10 w-full bg-white/5 rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 space-y-8">

              {/* ── Basic info ── */}
              <section>
                <p className="text-xs font-bold text-gray-500 tracking-[0.18em] uppercase mb-5">
                  Basic Information
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field
                    label="Full Name"
                    value={form.fullName}
                    onChange={(v) => setField("fullName", v)}
                    placeholder="e.g. Arjun Sharma"
                    colSpan2
                  />
                  <Field
                    label="College / University"
                    value={form.college}
                    onChange={(v) => setField("college", v)}
                    placeholder="e.g. IIT Bombay"
                    colSpan2
                  />
                  <Field
                    label="Branch / Major"
                    value={form.branch}
                    onChange={(v) => setField("branch", v)}
                    placeholder="e.g. Computer Science"
                  />

                  {/* Year dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 tracking-[0.18em] uppercase mb-2">
                      Year
                    </label>
                    <select
                      value={form.year}
                      onChange={(e) => setField("year", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-[#0a0a0f] border border-white/10 text-gray-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition appearance-none cursor-pointer"
                    >
                      <option value="" disabled className="text-gray-600">
                        Select year
                      </option>
                      {YEAR_OPTIONS.map((y) => (
                        <option key={y} value={y} className="bg-[#0a0a0f]">
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <div className="border-t border-white/6" />

              {/* ── Skills ── */}
              <section>
                <TagInput
                  label="Skills"
                  tags={form.skills}
                  suggestions={SUGGESTED_SKILLS}
                  onChange={(tags) => setField("skills", tags)}
                  placeholder="Type a skill and press Enter…"
                />
              </section>

              <div className="border-t border-white/6" />

              {/* ── Interests ── */}
              <section>
                <TagInput
                  label="Interests"
                  tags={form.interests}
                  suggestions={SUGGESTED_INTERESTS}
                  onChange={(tags) => setField("interests", tags)}
                  placeholder="Type an interest and press Enter…"
                />
              </section>

              <div className="border-t border-white/6" />

              {/* ── Save row ── */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

                <div className="min-h-[24px]">
                  {successMsg && (
                    <p className="flex items-center gap-2 text-sm text-emerald-400">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-xs font-bold">
                        ✓
                      </span>
                      {successMsg}
                    </p>
                  )}
                  {errorMsg && (
                    <p className="flex items-center gap-2 text-sm text-red-400">
                      <span className="text-xs">⚠</span> {errorMsg}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all duration-200 shadow-[0_0_20px_rgba(139,92,246,0.35)] hover:shadow-[0_0_28px_rgba(139,92,246,0.5)]"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Save Profile
                    </>
                  )}
                </button>
              </div>

            </div>
          )}
        </div>

        <p className="text-center text-gray-700 text-xs mt-8">
          Your profile is private and used only to personalise your opportunity matches.
        </p>

      </div>
    </div>
  );
}
