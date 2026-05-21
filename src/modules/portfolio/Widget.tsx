"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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

  const completed = checks.filter(Boolean).length;

  return {
    pct: Math.round((completed / checks.length) * 100),
    completed,
    total: checks.length,
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
  const heroAvailability = p?.available_for_hire
    ? "open to opportunities"
    : "selective availability";
  const readinessTone =
    !p
      ? "default"
      : readiness?.pct && readiness.pct >= 85
        ? "success"
        : readiness?.pct && readiness.pct >= 55
          ? "warning"
          : "danger";

  return (
    <WidgetCard
      title="Portfolio"
      icon={User}
      loading={loading}
      href="/admin/portfolio"
      footer={
        p && (
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <span>
              {readiness?.completed ?? 0}/{readiness?.total ?? 0} checks complete
            </span>
          </div>
        )
      }
    >
      {p ? (
        <motion.div
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="space-y-3"
        >
          <WidgetStat
            value={`${readiness?.pct ?? 0}%`}
            label="profile readiness"
          />
          <WidgetHighlight
            icon={Briefcase}
            text={p.hero_title}
            subtext={`${p.sub_headline ?? "Set your portfolio subtitle"} • ${heroAvailability}`}
            variant={readinessTone}
          />
        </motion.div>
      ) : (
        !loading && (
          <motion.div
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-3"
          >
            <WidgetStat value={0} label="profile readiness" />
            <WidgetHighlight
              icon={User}
              text="No profile yet"
              subtext="Set up a portfolio profile to unlock your dashboard summary."
              variant="default"
            />
          </motion.div>
        )
      )}
    </WidgetCard>
  );
}
