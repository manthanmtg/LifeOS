// Entry point for the public-facing portfolio page
import PublicHeader from "@/components/shell/PublicHeader";
import PublicFooter from "@/components/shell/PublicFooter";
import PortfolioView from "@/modules/portfolio/View";
import { getPublicSiteData } from "@/lib/public-data";

export default async function Home() {
  const site = await getPublicSiteData();

  return (
    <div className="min-h-dvh flex flex-col" suppressHydrationWarning>
      <PublicHeader
        initialUserName={site.userName}
        publicModules={site.publicModules}
      />
      <PortfolioView
        profile={site.profile}
        resumeAvailable={site.resumeAvailable}
      />
      <PublicFooter socialLinks={site.socialLinks} />
    </div>
  );
}
