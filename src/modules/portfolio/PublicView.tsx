"use client";

import { Briefcase } from "lucide-react";
import PortfolioShowcase, { PortfolioProfile } from "@/modules/portfolio/PortfolioShowcase";

function normalizeProfile(raw: Partial<PortfolioProfile> | null | undefined): PortfolioProfile | null {
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
                .filter((l) => l && typeof l.platform === "string" && typeof l.url === "string")
                .map((l) => ({ platform: l.platform, url: l.url }))
            : [],
        available_for_hire: Boolean(raw.available_for_hire),
    };
}

export default function PortfolioPublicView({ items }: { items: Record<string, unknown>[] }) {
    const first = items[0] as { payload?: Partial<PortfolioProfile> } | undefined;
    const profile = normalizeProfile(first?.payload);

    if (!profile) {
        return (
            <div className="text-center text-zinc-500 py-20">
                <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Portfolio profile is not available yet.</p>
            </div>
        );
    }

    return <PortfolioShowcase profile={profile} />;
}
