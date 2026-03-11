import { MetadataRoute } from "next";
import { getDb } from "@/lib/mongodb";
import { SystemConfig } from "@/lib/types";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
    let name = "Life OS";
    let icon = "/favicon.ico";

    try {
        const db = await getDb();
        const config = await db.collection<SystemConfig>("system").findOne({ _id: "global" });

        if (config?.site_title) {
            name = config.site_title;
        }

        if (config?.site_icon) {
            icon = config.site_icon;
        }
    } catch (error) {
        console.error("Failed to fetch manifest config:", error);
    }

    return {
        name: name,
        short_name: name,
        description: "Personal portfolio and life management system.",
        start_url: "/",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#000000",
        icons: [
            {
                src: icon,
                sizes: "any",
                type: "image/x-icon",
            },
            {
                src: icon,
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: icon,
                sizes: "512x512",
                type: "image/png",
            },
        ],
    };
}
