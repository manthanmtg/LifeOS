import { Briefcase } from "lucide-react";
import PortfolioShowcase, {
  PortfolioProfile,
} from "@/modules/portfolio/PortfolioShowcase";

export default function PortfolioView({
  profile,
  resumeAvailable = false,
}: {
  profile: PortfolioProfile | null;
  resumeAvailable?: boolean;
}) {
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

  return (
    <PortfolioShowcase profile={profile} resumeAvailable={resumeAvailable} />
  );
}
