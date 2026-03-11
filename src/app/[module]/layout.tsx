import { Metadata } from "next";
import { moduleRegistry } from "@/registry";
import { getDb } from "@/lib/mongodb";
import { SystemConfig } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }): Promise<Metadata> {
    const slug = (await params).module;
    const modConfig = moduleRegistry[slug];

    let siteTitle = "Life OS";
    try {
        const db = await getDb();
        const portfolio = await db.collection("content").findOne({ module_type: "portfolio_profile" });
        const config = await db.collection<SystemConfig>("system").findOne({ _id: "global" });

        if (portfolio?.payload?.full_name) {
            siteTitle = portfolio.payload.full_name;
        } else if (config?.site_title) {
            siteTitle = config.site_title;
        }
    } catch {
        // Fallback silently
    }

    const title = modConfig ? `${modConfig.name} | ${siteTitle}` : `Not Found | ${siteTitle}`;
    const description = modConfig?.description || "A module in Life OS.";

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: "website",
        },
    };
}

export default function ModuleLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
