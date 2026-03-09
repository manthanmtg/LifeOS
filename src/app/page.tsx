// Entry point for the public-facing portfolio page
import PublicHeader from "@/components/shell/PublicHeader";
import PublicFooter from "@/components/shell/PublicFooter";
import PortfolioView from "@/modules/portfolio/View";
import { getDb } from "@/lib/mongodb";

export default async function Home() {
  let userName = "Life OS";
  try {
    const db = await getDb();
    const portfolio = await db.collection("content").findOne({ module_type: "portfolio_profile" });
    if (portfolio?.payload?.full_name) {
      userName = portfolio.payload.full_name;
    }
  } catch (e) {
    console.error("Failed to fetch branding for home", e);
  }

  return (
    <div className="min-h-screen flex flex-col" suppressHydrationWarning>
      <PublicHeader initialUserName={userName} />
      <PortfolioView />
      <PublicFooter />
    </div>
  );
}
