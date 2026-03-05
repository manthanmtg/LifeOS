import { getDb } from "./mongodb";
import { SystemConfig } from "./types";
import { moduleRegistry as appModules } from "../registry"; // We will create this registry file shortly

export async function ensureSystemConfig() {
    try {
        const db = await getDb();
        const systemColl = db.collection<SystemConfig>("system");

        const exists = await systemColl.findOne({ _id: "global" });

        if (!exists) {
            // Default to enabling and making public the core modules initially
            const defaultModuleRegistry: Record<string, { enabled: boolean; isPublic: boolean }> = {};

            // We will initialize this by reading from the code's application registry if defined,
            // but as a fallback/initial state:
            if (appModules) {
                Object.keys(appModules).forEach(key => {
                    defaultModuleRegistry[key] = { enabled: true, isPublic: false };
                });
            }

            await systemColl.insertOne({
                _id: "global",
                site_title: "Life OS",
                active_theme: "one-dark",
                bio: "Welcome to my Life OS instance.",
                moduleRegistry: defaultModuleRegistry,
            });
            console.log("[Seed] Initialized global system configuration.");
        }
    } catch (error) {
        console.error("[Seed] Could not initialize system config:", error);
    }
}
