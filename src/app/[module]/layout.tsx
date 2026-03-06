import { Metadata } from "next";
import { moduleRegistry } from "@/registry";
import { getDb } from "@/lib/mongodb";
import { SystemConfig } from "@/lib/types";

const moduleDescriptions: Record<string, string> = {
    bookshelf: "Books I'm reading, have read, and want to read.",
    snippets: "Reusable code snippets and references.",
    ideas: "A collection of ideas and explorations.",
    reading: "Articles, papers, videos, and podcasts in my queue.",
    habits: "Tracking consistency and building streaks.",
    expenses: "Expense tracking and spending insights.",
    "recurring-expenses": "Recurring expenses and monthly burn.",
    blog: "Thoughts, guides, and stories.",
    portfolio: "About me, skills, and social links.",
    analytics: "Site analytics and visitor insights.",
    compass: "Project navigation and active focus board.",
};

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
    const description = moduleDescriptions[slug] || "A module in Life OS.";

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
