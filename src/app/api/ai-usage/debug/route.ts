import { getDb } from "@/lib/mongodb";
import { ApiSuccess, ApiError } from "@/lib/api-response";

/** Debug endpoint - inspects what's in DB and tests a raw provider API call */
export async function GET() {
    try {
        const db = await getDb();

        // 1. List all stored providers (masked keys)
        const rawProviders = await db.collection("ai_providers").find().toArray();
        const providers = rawProviders.map((p) => ({
            _id: p._id.toString(),
            name: p.name,
            provider: p.provider,
            plan: p.plan,
            is_active: p.is_active,
            last_synced_at: p.last_synced_at,
            key_prefix: typeof p.admin_api_key === "string" ? p.admin_api_key.slice(0, 14) + "..." : "missing",
            key_length: typeof p.admin_api_key === "string" ? p.admin_api_key.length : 0,
        }));

        // 2. Count usage entries in content collection
        const usageCount = await db.collection("content").countDocuments({ module_type: "ai_usage" });
        const sampleEntries = await db.collection("content")
            .find({ module_type: "ai_usage" })
            .sort({ created_at: -1 })
            .limit(3)
            .toArray();

        return ApiSuccess({ providers, usageCount, sampleEntries });
    } catch (error) {
        return ApiError(error instanceof Error ? error.message : "Debug failed", 500);
    }
}

/** Test a single provider API call - returns raw response */
export async function POST(request: Request) {
    try {
        const { provider_id } = await request.json();
        const db = await getDb();
        const { ObjectId } = await import("mongodb");

        if (!provider_id || !ObjectId.isValid(provider_id)) {
            return ApiError("provider_id required", 400);
        }

        const config = await db.collection("ai_providers").findOne({ _id: new ObjectId(provider_id) });
        if (!config) return ApiError("Provider not found", 404);

        const now = new Date();
        const start = new Date(now.getTime() - 7 * 86400000);
        start.setUTCHours(0, 0, 0, 0);
        const fmtDate = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

        let usageRaw: unknown = null;
        let costRaw: unknown = null;
        let usageStatus = 0;
        let costStatus = 0;
        let usageError: string | null = null;
        let costError: string | null = null;
        const usageUrl: string[] = [];
        const costUrl: string[] = [];

        if (config.provider === "openai") {
            const startUnix = Math.floor(start.getTime() / 1000);
            const endUnix = Math.floor(now.getTime() / 1000);

            const uUrl = `https://api.openai.com/v1/organization/usage/completions?start_time=${startUnix}&end_time=${endUnix}&bucket_width=1d&group_by[]=model&limit=3`;
            usageUrl.push(uUrl);
            try {
                const r = await fetch(uUrl, {
                    headers: { Authorization: `Bearer ${config.admin_api_key}` },
                });
                usageStatus = r.status;
                usageRaw = await r.json();
            } catch (e) {
                usageError = e instanceof Error ? e.message : String(e);
            }

            const cUrl = `https://api.openai.com/v1/organization/costs?start_time=${startUnix}&bucket_width=1d&limit=3`;
            costUrl.push(cUrl);
            try {
                const r = await fetch(cUrl, {
                    headers: { Authorization: `Bearer ${config.admin_api_key}` },
                });
                costStatus = r.status;
                costRaw = await r.json();
            } catch (e) {
                costError = e instanceof Error ? e.message : String(e);
            }

        } else if (config.provider === "anthropic") {
            const uUrl = `https://api.anthropic.com/v1/organizations/usage_report/messages?starting_at=${fmtDate(start)}&ending_at=${fmtDate(now)}&bucket_width=1d&group_by[]=model`;
            usageUrl.push(uUrl);
            try {
                const r = await fetch(uUrl, {
                    headers: {
                        "x-api-key": config.admin_api_key,
                        "anthropic-version": "2023-06-01",
                    },
                });
                usageStatus = r.status;
                usageRaw = await r.json();
            } catch (e) {
                usageError = e instanceof Error ? e.message : String(e);
            }

            const cUrl = `https://api.anthropic.com/v1/organizations/cost_report?starting_at=${fmtDate(start)}&ending_at=${fmtDate(now)}&bucket_width=1d`;
            costUrl.push(cUrl);
            try {
                const r = await fetch(cUrl, {
                    headers: {
                        "x-api-key": config.admin_api_key,
                        "anthropic-version": "2023-06-01",
                    },
                });
                costStatus = r.status;
                costRaw = await r.json();
            } catch (e) {
                costError = e instanceof Error ? e.message : String(e);
            }
        }

        return ApiSuccess({
            provider: config.provider,
            name: config.name,
            usageUrl,
            costUrl,
            usage: { status: usageStatus, error: usageError, raw: usageRaw },
            cost: { status: costStatus, error: costError, raw: costRaw },
        });
    } catch (error) {
        return ApiError(error instanceof Error ? error.message : "Test failed", 500);
    }
}
