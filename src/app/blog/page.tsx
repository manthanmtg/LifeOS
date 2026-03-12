import PublicHeader from "@/components/shell/PublicHeader";
import PublicFooter from "@/components/shell/PublicFooter";
import BlogView from "@/modules/blog/View";
import { getDb } from "@/lib/mongodb";

export default async function BlogPage() {
    let userName = "Life OS";
    try {
        const db = await getDb();
        const portfolio = await db.collection("content").findOne({ module_type: "portfolio_profile" });
        if (portfolio?.payload?.full_name) userName = portfolio.payload.full_name;
    } catch { }

    return (
        <div className="min-h-screen flex flex-col">
            <PublicHeader initialUserName={userName} />
            <BlogView />
            <PublicFooter />
        </div>
    );
}
