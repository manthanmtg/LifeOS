"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  ClipboardCheck,
  ExternalLink,
  Globe2,
  Link2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  UserRound,
  } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminModuleSkeleton } from "@/components/ui/Skeletons";
import { ResumeManager } from "./ResumeManager";

interface PortfolioData {
  full_name: string;
  hero_title: string;
  sub_headline: string;
  bio: string;
  skills: string[];
  social_links: { platform: string; url: string }[];
  available_for_hire: boolean;
}


const EMPTY_PROFILE: PortfolioData = {
  full_name: "",
  hero_title: "",
  sub_headline: "",
  bio: "",
  skills: [],
  social_links: [],
  available_for_hire: false,
};

const SUGGESTED_SKILLS = [
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "System Design",
  "UX Engineering",
  "Product Strategy",
  "GraphQL",
  "Python",
  "DevOps",
  "Open Source",
  "Technical Writing",
];

const SUGGESTED_PLATFORMS = [
  "GitHub",
  "LinkedIn",
  "X",
  "YouTube",
  "Dev.to",
  "Website",
  "Behance",
  "Dribbble",
];

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return Boolean(url.protocol === "http:" || url.protocol === "https:");
  } catch {
    return false;
  }
}

function initials(value: string) {
  const parts = value.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "LO";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}


// ---------------------------------------------------------------------------
// Main admin view
// ---------------------------------------------------------------------------

export default function PortfolioAdminView() {
  const [profile, setProfile] = useState<PortfolioData>(EMPTY_PROFILE);
  const [savedSnapshot, setSavedSnapshot] =
    useState<PortfolioData>(EMPTY_PROFILE);
  const [docId, setDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [status, setStatus] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const r = await fetch("/api/content?module_type=portfolio_profile");
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load profile");
        const docs = d.data || [];
        if (docs.length > 0) {
          const payload = docs[0].payload as PortfolioData;
          setProfile(payload);
          setSavedSnapshot(payload);
          setDocId(docs[0]._id as string);
        }
      } catch (err: unknown) {
        console.error("fetchProfile failed:", err);
        setStatus({ kind: "error", text: "Failed to load profile." });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const isDirty = useMemo(
    () => JSON.stringify(profile) !== JSON.stringify(savedSnapshot),
    [profile, savedSnapshot],
  );

  const validSocialLinks = useMemo(
    () =>
      profile.social_links.filter(
        (link) =>
          link.platform.trim() &&
          link.url.trim() &&
          isValidUrl(link.url.trim()),
      ).length,
    [profile.social_links],
  );

  const readiness = useMemo(() => {
    const checks = [
      profile.full_name.trim().length > 0,
      profile.hero_title.trim().length >= 3,
      profile.sub_headline.trim().length >= 8,
      profile.bio.trim().length >= 30 && profile.bio.length <= 1000,
      profile.skills.length >= 4,
      validSocialLinks >= 2,
    ];
    const done = checks.filter(Boolean).length;
    return {
      done,
      total: checks.length,
      pct: Math.round((done / checks.length) * 100),
    };
  }, [profile, validSocialLinks]);

  const displayName =
    profile.full_name.trim() || profile.hero_title.trim() || "Life OS";

  const setField = <K extends keyof PortfolioData>(
    key: K,
    value: PortfolioData[K],
  ) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const addSkill = (raw?: string) => {
    const value = (raw ?? skillInput).trim();
    if (!value) return;
    if (profile.skills.includes(value)) {
      setSkillInput("");
      return;
    }
    setField("skills", [...profile.skills, value]);
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setField(
      "skills",
      profile.skills.filter((s) => s !== skill),
    );
  };

  const addSocialLink = () => {
    setField("social_links", [
      ...profile.social_links,
      { platform: "", url: "" },
    ]);
  };

  const updateSocialLink = (
    index: number,
    field: "platform" | "url",
    value: string,
  ) => {
    const updated = [...profile.social_links];
    updated[index] = { ...updated[index], [field]: value };
    setField("social_links", updated);
  };

  const removeSocialLink = (index: number) => {
    setField(
      "social_links",
      profile.social_links.filter((_, i) => i !== index),
    );
  };

  const handleReset = () => {
    setProfile(savedSnapshot);
    setSkillInput("");
    setStatus(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);

    if (profile.hero_title.trim().length < 3) {
      setSaving(false);
      setStatus({
        kind: "error",
        text: "Hero title should be at least 3 characters.",
      });
      return;
    }
    if (profile.bio.length > 1000) {
      setSaving(false);
      setStatus({
        kind: "error",
        text: "Bio should be 1000 characters or less.",
      });
      return;
    }

    try {
      const res = docId
        ? await fetch(`/api/content/${docId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payload: profile }),
          })
        : await fetch("/api/content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              module_type: "portfolio_profile",
              is_public: true,
              payload: profile,
            }),
          });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile");

      const newId = data.data?._id || data.data?.insertedId;
      if (newId) setDocId(String(newId));

      setSavedSnapshot(profile);
      setStatus({ kind: "success", text: "Profile saved." });
      setTimeout(() => setStatus(null), 2200);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save profile";
      setStatus({ kind: "error", text: message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminModuleSkeleton />;

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="absolute -top-10 right-0 h-32 w-32 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
              Portfolio Editor
            </h1>
            <p className="text-zinc-400 mt-1">
              Craft your public story with richer structure and instant
              feedback.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border",
                isDirty
                  ? "bg-warning/10 text-warning border-warning/20"
                  : "bg-success/10 text-success border-success/20",
              )}
            >
              {isDirty ? "Unsaved changes" : "All changes saved"}
            </span>
            <button
              onClick={handleReset}
              disabled={!isDirty || saving}
              aria-label="Reset profile changes"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 transition-colors text-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              aria-label="Save profile changes"
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-zinc-50 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
        {status && (
          <div
            role={status.kind === "error" ? "alert" : "status"}
            aria-live={status.kind === "error" ? "assertive" : "polite"}
            aria-atomic="true"
            className={cn(
              "relative mt-4 text-sm rounded-xl px-4 py-3 border",
              status.kind === "success"
                ? "bg-success/10 border-success/20 text-success"
                : "bg-danger/10 border-danger/20 text-danger",
            )}
          >
            {status.text}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 space-y-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <UserRound className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold text-zinc-300">
                Identity & Hero
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="profile-full-name"
                  className="block text-xs text-zinc-500 mb-1.5"
                >
                  Full Name
                </label>
                <input
                  id="profile-full-name"
                  type="text"
                  value={profile.full_name}
                  onChange={(e) => setField("full_name", e.target.value)}
                  placeholder="e.g. Manthan"
                  disabled={saving}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div>
                <label
                  htmlFor="profile-hero-title"
                  className="block text-xs text-zinc-500 mb-1.5"
                >
                  Hero Title
                </label>
                <input
                  id="profile-hero-title"
                  type="text"
                  value={profile.hero_title}
                  onChange={(e) => setField("hero_title", e.target.value)}
                  placeholder="Designing product-grade experiences"
                  disabled={saving}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="profile-sub-headline"
                className="block text-xs text-zinc-500 mb-1.5"
              >
                Sub-headline
              </label>
              <input
                id="profile-sub-headline"
                type="text"
                value={profile.sub_headline}
                onChange={(e) => setField("sub_headline", e.target.value)}
                placeholder="Frontend engineer focused on delightful systems"
                disabled={saving}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-300">
                Narrative & Availability
              </h3>
              <span
                className={cn(
                  "text-xs",
                  profile.bio.length > 1000 ? "text-danger" : "text-zinc-500",
                )}
              >
                {profile.bio.length}/1000
              </span>
            </div>
            <label htmlFor="profile-bio" className="sr-only">
              Bio
            </label>
            <textarea
              id="profile-bio"
              value={profile.bio}
              onChange={(e) => setField("bio", e.target.value)}
              rows={6}
              placeholder="Share your philosophy, wins, and what you care about building."
              disabled={saving}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
            />
            <label className="inline-flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                id="profile-hireable"
                type="checkbox"
                checked={profile.available_for_hire}
                onChange={(e) =>
                  setField("available_for_hire", e.target.checked)
                }
                disabled={saving}
                className="w-4 h-4 rounded border-zinc-700 accent-accent"
              />
              <Briefcase className="w-4 h-4 text-zinc-400" />
              Open for new opportunities
            </label>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-sm font-semibold text-zinc-300">Skills</h3>
              <span className="text-xs text-zinc-500">
                {profile.skills.length} skills
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="profile-skill-input"
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addSkill())
                }
                placeholder="Add a skill..."
                disabled={saving}
                aria-label="Add new skill"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <button
                onClick={() => addSkill()}
                disabled={saving || !skillInput.trim()}
                className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg transition-colors disabled:opacity-50"
                aria-label="Add skill"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_SKILLS.filter((s) => !profile.skills.includes(s))
                .slice(0, 8)
                .map((s) => (
                  <button
                    key={s}
                    onClick={() => addSkill(s)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:border-accent/40 hover:text-zinc-50 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" /> {s}
                  </button>
                ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 border border-accent/20 text-accent text-xs font-medium rounded-full"
                >
                  {skill}
                  <button
                    onClick={() => removeSkill(skill)}
                    className="hover:text-danger transition-colors"
                    aria-label={`Remove ${skill}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold text-zinc-300">
                  Social Links
                </h3>
              </div>
              <button
                onClick={addSocialLink}
                disabled={saving}
                className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" /> Add link
              </button>
            </div>

            {profile.social_links.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No links yet. Add your key destinations.
              </p>
            ) : (
              <div className="space-y-3">
                {profile.social_links.map((link, i) => {
                  const urlOk = !link.url || isValidUrl(link.url);
                  return (
                    <div
                      key={i}
                      className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-2 items-center"
                    >
                      <label
                        htmlFor={`social-platform-${i}`}
                        className="sr-only"
                      >
                        Platform
                      </label>
                      <input
                        id={`social-platform-${i}`}
                        type="text"
                        list="platform-suggestions"
                        value={link.platform}
                        onChange={(e) =>
                          updateSocialLink(i, "platform", e.target.value)
                        }
                        placeholder="Platform"
                        disabled={saving}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                      />
                      <label htmlFor={`social-url-${i}`} className="sr-only">
                        URL
                      </label>
                      <input
                        id={`social-url-${i}`}
                        type="url"
                        value={link.url}
                        onChange={(e) =>
                          updateSocialLink(i, "url", e.target.value)
                        }
                        placeholder="https://..."
                        disabled={saving}
                        className={cn(
                          "w-full bg-zinc-800 border rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40",
                          urlOk ? "border-zinc-700" : "border-danger/50",
                        )}
                      />
                      <button
                        onClick={() => removeSocialLink(i)}
                        disabled={saving}
                        className="p-2 text-zinc-500 hover:text-danger transition-colors disabled:opacity-50"
                        aria-label="Remove social link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <datalist id="platform-suggestions">
              {SUGGESTED_PLATFORMS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          <ResumeManager setStatus={setStatus} />
        </div>

        <div className="xl:col-span-5 space-y-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardCheck className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold text-zinc-300">
                Publish Readiness
              </h3>
            </div>
            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                role="progressbar"
                aria-label="Portfolio publish readiness"
                aria-valuemin={0}
                aria-valuemax={readiness.total}
                aria-valuenow={readiness.done}
                aria-valuetext={`${readiness.done} of ${readiness.total} quality checks complete`}
                className="h-full bg-accent transition-all"
                style={{ width: `${readiness.pct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-zinc-500">
                {readiness.done}/{readiness.total} quality checks
              </span>
              <span className="text-zinc-300 font-medium">
                {readiness.pct}%
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div className="bg-zinc-800/70 rounded-lg p-2.5 border border-zinc-700">
                <p className="text-zinc-500">Skills</p>
                <p className="text-zinc-300 font-semibold mt-1">
                  {profile.skills.length}
                </p>
              </div>
              <div className="bg-zinc-800/70 rounded-lg p-2.5 border border-zinc-700">
                <p className="text-zinc-500">Links</p>
                <p className="text-zinc-300 font-semibold mt-1">
                  {validSocialLinks}
                </p>
              </div>
              <div className="bg-zinc-800/70 rounded-lg p-2.5 border border-zinc-700">
                <p className="text-zinc-500">Hire</p>
                <p className="text-zinc-300 font-semibold mt-1">
                  {profile.available_for_hire ? "Open" : "Closed"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 sticky top-6">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Live Preview
            </h3>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  {profile.available_for_hire && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 mb-2 text-[10px] font-medium bg-success/15 text-success border border-success/20 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      Available
                    </span>
                  )}
                  <h2 className="text-2xl font-bold text-zinc-50 leading-tight">
                    {profile.hero_title || "Your hero title"}
                  </h2>
                  <p className="text-zinc-400 mt-1 text-sm">
                    {profile.sub_headline || "Sub-headline appears here"}
                  </p>
                </div>
                <div className="w-10 h-10 shrink-0 rounded-xl bg-accent/15 border border-accent/25 text-accent font-semibold flex items-center justify-center text-xs">
                  {initials(displayName)}
                </div>
              </div>

              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap min-h-12">
                {profile.bio || "Your narrative and context will show up here."}
              </p>

              {profile.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.slice(0, 10).map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-md"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {profile.social_links.filter(
                (l) => l.platform.trim() && l.url.trim(),
              ).length > 0 && (
                <div className="pt-1 flex flex-wrap gap-2">
                  {profile.social_links
                    .filter((l) => l.platform.trim() && l.url.trim())
                    .slice(0, 6)
                    .map((l, i) => (
                      <a
                        key={`${l.platform}-${i}`}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" /> {l.platform}
                      </a>
                    ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-500 flex items-start gap-2">
              <Globe2 className="w-3.5 h-3.5 mt-0.5 text-zinc-400" />
              Public page quality improves with clear hero copy, 4+ skills, and
              at least 2 valid social links.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
