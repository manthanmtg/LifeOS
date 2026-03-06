import { getDb } from "./mongodb";
import { SystemConfig } from "./types";
import { moduleRegistry as appModules } from "../registry";

export async function ensureSystemConfig() {
    try {
        const db = await getDb();
        const systemColl = db.collection<SystemConfig>("system");

        const exists = await systemColl.findOne({ _id: "global" });

        if (!exists) {
            const defaultModuleRegistry: Record<string, { enabled: boolean; isPublic: boolean }> = {};

            if (appModules) {
                Object.entries(appModules).forEach(([key, mod]) => {
                    defaultModuleRegistry[key] = { enabled: true, isPublic: (mod as { defaultPublic: boolean }).defaultPublic };
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
        } else if (appModules) {
            // Backfill: add any new modules not yet in the DB
            const existingRegistry = exists.moduleRegistry || {};
            const updates: Record<string, { enabled: boolean; isPublic: boolean }> = {};
            Object.entries(appModules).forEach(([key, mod]) => {
                if (!existingRegistry[key]) {
                    updates[key] = { enabled: true, isPublic: (mod as { defaultPublic: boolean }).defaultPublic };
                }
            });
            if (Object.keys(updates).length > 0) {
                const merged = { ...existingRegistry, ...updates };
                await systemColl.updateOne({ _id: "global" }, { $set: { moduleRegistry: merged } });
                console.log(`[Seed] Backfilled ${Object.keys(updates).length} new module(s).`);
            }
        }

        // Ensure indexes for query performance
        const contentColl = db.collection("content");
        await contentColl.createIndex({ module_type: 1 });
        await contentColl.createIndex({ created_at: -1 });
        await contentColl.createIndex({ module_type: 1, is_public: 1 });

        const metricsColl = db.collection("metrics");
        await metricsColl.createIndex({ timestamp: -1 });
        await metricsColl.createIndex({ path: 1, timestamp: -1 });
    } catch (error) {
        console.error("[Seed] Could not initialize system config:", error);
    }
}
