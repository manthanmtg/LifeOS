"use client";

import type { PortfolioProfile } from "./PortfolioShowcase";
import PortfolioView from "./View";

function normalizeProfile(
  raw: Partial<PortfolioProfile> | null | undefined,
): PortfolioProfile | null {
  if (!raw) return null;
  const heroTitle = raw.hero_title?.trim();
  if (!heroTitle) return null;

  return {
    full_name: raw.full_name || "",
    hero_title: heroTitle,
    sub_headline: raw.sub_headline || "",
    bio: raw.bio || "",
    skills: Array.isArray(raw.skills) ? raw.skills.filter(Boolean) : [],
    social_links: Array.isArray(raw.social_links)
      ? raw.social_links
          .filter(
            (l) =>
              l && typeof l.platform === "string" && typeof l.url === "string",
          )
          .map((l) => ({ platform: l.platform, url: l.url }))
      : [],
    available_for_hire: Boolean(raw.available_for_hire),
  };
}

export default function PortfolioPublicView({
  items,
  resumeAvailable = false,
}: {
  items: Record<string, unknown>[];
  resumeAvailable?: boolean;
}) {
  const first = items[0] as { payload?: Partial<PortfolioProfile> } | undefined;
  const profile = normalizeProfile(first?.payload);

  return <PortfolioView profile={profile} resumeAvailable={resumeAvailable} />;
}
