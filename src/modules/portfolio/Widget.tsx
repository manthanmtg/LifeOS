"use client";

import { useState, useEffect } from "react";
import { Briefcase, User } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

interface Profile {
  payload: {
    full_name?: string;
    hero_title: string;
    sub_headline?: string;
    bio?: string;
    skills: string[];
    social_links?: { platform?: string; url?: string }[];
    available_for_hire: boolean;
  };
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function toProfilePayload(value: unknown): Profile["payload"] | null {
  if (!value || typeof value !== "object") return null;

  const payload = value as Partial<Profile["payload"]>;
  if (!payload.hero_title || !Array.isArray(payload.skills)) return null;

  return {
    full_name: payload.full_name,
    hero_title: payload.hero_title,
    sub_headline: payload.sub_headline,
    bio: payload.bio,
    skills: payload.skills,
    social_links: Array.isArray(payload.social_links)
      ? payload.social_links
      : [],
    available_for_hire: Boolean(payload.available_for_hire),
  };
}

function getReadiness(profile: Profile["payload"]) {
  const validSocialLinks =
    profile.social_links?.filter((link) => {
      const platform = link.platform?.trim() ?? "";
      const url = link.url?.trim() ?? "";
      return platform.length > 0 && url.length > 0 && isValidUrl(url);
    }).length ?? 0;

  const checks = [
    (profile.full_name?.trim().length ?? 0) > 0,
    profile.hero_title.trim().length >= 3,
    (profile.sub_headline?.trim().length ?? 0) >= 8,
    (profile.bio?.trim().length ?? 0) >= 30 &&
      (profile.bio?.length ?? 0) <= 1000,
    profile.skills.length >= 4,
    validSocialLinks >= 2,
  ];

  return {
    pct: Math.round((checks.filter(Boolean).length / checks.length) * 100),
    validSocialLinks,
  };
}

export default function PortfolioWidget() {
  const [profile, setProfile] = useState<Profile["payload"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/widgets/summary?module_type=portfolio_profile")
      .then((r) => r.json())
      .then((d) => setProfile(toProfilePayload(d.data)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const p = profile;
  const readiness = p ? getReadiness(p) : null;

  return (
    <WidgetCard
      title="Portfolio"
      icon={User}
      loading={loading}
      href="/admin/portfolio"
      footer={
        p && (
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider">
            <span className="min-w-0 truncate text-zinc-500">
              {readiness?.validSocialLinks ?? 0} verified links
            </span>
            {p.available_for_hire ? (
              <span className="flex shrink-0 items-center gap-1 text-success">
                <Briefcase className="w-3 h-3" /> Open
              </span>
            ) : (
              <span className="shrink-0 text-zinc-500">Selective</span>
            )}
          </div>
        )
      }
    >
      {p ? (
        <div className="space-y-3">
          <WidgetStat value={`${readiness?.pct ?? 0}%`} label="profile ready" />
          <WidgetHighlight
            icon={Briefcase}
            text={p.hero_title}
            subtext={p.sub_headline}
            variant={p.available_for_hire ? "success" : "default"}
          />
        </div>
      ) : (
        !loading && (
          <div className="space-y-3">
            <WidgetStat value={0} label="skills" />
            <WidgetHighlight
              icon={User}
              text="No profile yet"
              subtext="Set up your first portfolio profile"
              variant="default"
            />
          </div>
        )
      )}
    </WidgetCard>
  );
}
