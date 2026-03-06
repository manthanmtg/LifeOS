import PublicModuleClient from "./PublicModuleClient";
import { getDb } from "@/lib/mongodb";

export default async function PublicModulePage({ params }: { params: Promise<{ module: string }> }) {
    const slug = (await params).module;
    let userName = "Life OS";

    try {
        const db = await getDb();
        const portfolio = await db.collection("content").findOne({ module_type: "portfolio_profile" });
        if (portfolio?.payload?.full_name) userName = portfolio.payload.full_name;
    } catch { }

    return <PublicModuleClient slug={slug} userName={userName} />;
}
