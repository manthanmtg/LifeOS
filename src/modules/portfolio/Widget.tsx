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
    skills: string[];
    available_for_hire: boolean;
  };
}

function toProfilePayload(value: unknown): Profile["payload"] | null {
  if (!value || typeof value !== "object") return null;

  const payload = value as Partial<Profile["payload"]>;
  if (!payload.hero_title || !Array.isArray(payload.skills)) return null;

  return {
    full_name: payload.full_name,
    hero_title: payload.hero_title,
    sub_headline: payload.sub_headline,
    skills: payload.skills,
    available_for_hire: Boolean(payload.available_for_hire),
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

  return (
    <WidgetCard
      title="Portfolio"
      icon={User}
      loading={loading}
      href="/admin/portfolio"
      footer={
        p && (
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
            <span className="text-zinc-500">{p.full_name || "Portfolio"}</span>
            {p.available_for_hire ? (
              <span className="flex items-center gap-1 text-success">
                <Briefcase className="w-3 h-3" /> Open
              </span>
            ) : (
              <span className="text-zinc-500">Selective</span>
            )}
          </div>
        )
      }
    >
      {p ? (
        <div className="space-y-3">
          <WidgetStat value={p.skills.length} label="skills" />
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
