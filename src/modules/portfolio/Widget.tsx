"use client";

import { useState, useEffect } from "react";
import { User, Briefcase, Sparkles } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";

interface Profile {
  payload: {
    full_name?: string;
    hero_title: string;
    sub_headline?: string;
    skills: string[];
    available_for_hire: boolean;
  };
}

export default function PortfolioWidget() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content?module_type=portfolio_profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.length > 0) setProfile(d.data[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetCard
      title="Portfolio"
      icon={User}
      loading={loading}
      href="/admin/portfolio"
      footer={
        profile && (
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
            <span className="text-zinc-500 inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> {profile.payload.skills.length}{" "}
              skills
            </span>
            {profile.payload.available_for_hire ? (
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
      {profile ? (
        <div>
          <p className="text-xs text-zinc-500 font-medium mb-1">
            {profile.payload.full_name || "Identity"}
          </p>
          <p className="text-xl font-bold text-zinc-50 line-clamp-2 tracking-tight leading-tight">
            {profile.payload.hero_title}
          </p>
          {profile.payload.sub_headline && (
            <p className="text-[11px] text-zinc-400 mt-2 line-clamp-1 leading-relaxed">
              {profile.payload.sub_headline}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No profile yet. Set one up!</p>
      )}
    </WidgetCard>
  );
}
