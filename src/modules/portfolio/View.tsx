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
        <h1 className="text-2xl font-semibold text-zinc-50">
          Portfolio coming soon
        </h1>
      </div>
    );
  }

  return (
    <PortfolioShowcase profile={profile} resumeAvailable={resumeAvailable} />
  );
}
