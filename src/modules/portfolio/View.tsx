"use client";

import { useState, useEffect } from "react";
import { Briefcase } from "lucide-react";
import PortfolioShowcase, {
  PortfolioProfile,
} from "@/modules/portfolio/PortfolioShowcase";
import { PortfolioSkeleton } from "@/components/ui/Skeletons";

export default function PortfolioView() {
  const [profile, setProfile] = useState<PortfolioProfile | null>(null);
  const [resume, setResume] = useState<{
    filename: string;
    content: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/content?module_type=portfolio_profile").then((r) => r.json()),
      fetch("/api/content?module_type=portfolio_resume").then((r) => r.json()),
    ])
      .then(([profileData, resumeData]) => {
        if (profileData.data?.length > 0) {
          setProfile(profileData.data[0].payload as PortfolioProfile);
        }
        const activeResume = (resumeData.data || []).find(
          (r: { payload: { is_active: boolean } }) => r.payload.is_active,
        );
        if (activeResume) {
          setResume({
            filename: activeResume.payload.filename,
            content: activeResume.payload.content,
          });
        }
      })
      .catch(() => {
        console.error("fetchData failed");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PortfolioSkeleton />;

  if (!profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
          <Briefcase className="w-7 h-7 text-zinc-500" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-50 mb-2">
          Portfolio Not Set Up
        </h2>
        <p className="text-zinc-500 text-sm max-w-md">
          Head to the admin panel to set up your portfolio profile.
        </p>
      </div>
    );
  }

  return <PortfolioShowcase profile={profile} resume={resume} />;
}
