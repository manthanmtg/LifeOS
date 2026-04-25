import PublicHeader from "@/components/shell/PublicHeader";
import PublicFooter from "@/components/shell/PublicFooter";
import { PortfolioSkeleton } from "@/components/ui/Skeletons";

export default function RootLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader initialUserName="Loading..." />
      <PortfolioSkeleton />
      <PublicFooter />
    </div>
  );
}
