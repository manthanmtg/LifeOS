import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { ApiSuccess, ApiError } from "@/lib/api-response";
import { ContentDocument } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProviderConfig {
    _id: ObjectId;
    name: string;
    provider: "openai" | "anthropic";
    admin_api_key: string;
    is_active: boolean;
    last_synced_at?: string;
}

interface UsageBucket {
    provider: string;
    provider_config_id: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_write_tokens: number;
    num_requests: number;
    cost: number;
    currency: string;
    date: string;
    bucket_width: "1d";
    synced: boolean;
}

interface SyncResult {
    provider_id: string;
    provider_name: string;
    provider_type: string;
    status: "success" | "error";
    entries_synced: number;
    error?: string;
}

/** Safely extract a YYYY-MM-DD string from various timestamp formats */
function extractDayKey(value: unknown): string | null {
    if (!value) return null;
    // Unix seconds (number)
    if (typeof value === "number") {
        const d = new Date(value > 1e12 ? value : value * 1000);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().slice(0, 10);
    }
    // ISO string
    if (typeof value === "string" && value.length >= 10) {
        const d = new Date(value);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().slice(0, 10);
    }
    return null;
}

function safeDateISO(day: string): string {
    const d = new Date(day + "T00:00:00Z");
    if (isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
}

// ─── OpenAI Fetcher ──────────────────────────────────────────────────────────

async function fetchOpenAIUsage(config: ProviderConfig, startTime: number, endTime: number): Promise<UsageBucket[]> {
    const buckets: UsageBucket[] = [];
    const usageByDayModel: Record<string, { input: number; output: number; cached: number; requests: number }> = {};

    // Fetch usage (tokens)
    let usagePage: string | null = null;
    do {
        const url = new URL("https://api.openai.com/v1/organization/usage/completions");
        url.searchParams.set("start_time", startTime.toString());
        url.searchParams.set("end_time", endTime.toString());
        url.searchParams.set("bucket_width", "1d");
        url.searchParams.append("group_by[]", "model");
        if (usagePage) url.searchParams.set("page", usagePage);

        const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${config.admin_api_key}`, "Content-Type": "application/json" },
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`OpenAI Usage API ${res.status}: ${errText.slice(0, 200)}`);
        }

        const data = await res.json();
        for (const bucket of data.data || []) {
            const dayKey = extractDayKey(bucket.start_time);
            if (!dayKey) continue;
            for (const result of bucket.results || []) {
                const model = result.model || "unknown";
                const key = `${dayKey}::${model}`;
                if (!usageByDayModel[key]) usageByDayModel[key] = { input: 0, output: 0, cached: 0, requests: 0 };
                usageByDayModel[key].input += result.input_tokens || 0;
                usageByDayModel[key].output += result.output_tokens || 0;
                usageByDayModel[key].cached += result.input_cached_tokens || 0;
                usageByDayModel[key].requests += result.num_model_requests || 0;
            }
        }
        usagePage = data.next_page || null;
    } while (usagePage);

    // Fetch costs
    let costPage: string | null = null;
    const costByDayModel: Record<string, number> = {};
    do {
        const url = new URL("https://api.openai.com/v1/organization/costs");
        url.searchParams.set("start_time", startTime.toString());
        url.searchParams.set("bucket_width", "1d");
        url.searchParams.append("group_by[]", "line_item");
        if (costPage) url.searchParams.set("page", costPage);

        const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${config.admin_api_key}`, "Content-Type": "application/json" },
        });

        if (!res.ok) {
            console.warn(`OpenAI Cost API returned ${res.status}, proceeding without cost data`);
            break;
        }

        const data = await res.json();
        for (const bucket of data.data || []) {
            const dayKey = extractDayKey(bucket.start_time);
            if (!dayKey) continue;
            for (const result of bucket.results || []) {
                const model = result.line_item || "unknown";
                const key = `${dayKey}::${model}`;
                costByDayModel[key] = (costByDayModel[key] || 0) + (result.amount?.value || 0);
            }
        }
        costPage = data.next_page || null;
    } while (costPage);

    // Merge usage + cost
    for (const [key, usage] of Object.entries(usageByDayModel)) {
        const [day, model] = key.split("::");
        buckets.push({
            provider: "openai",
            provider_config_id: config._id.toString(),
            model,
            input_tokens: usage.input,
            output_tokens: usage.output,
            cache_read_tokens: usage.cached,
            cache_write_tokens: 0,
            num_requests: usage.requests,
            cost: costByDayModel[key] || 0,
            currency: "USD",
            date: safeDateISO(day),
            bucket_width: "1d",
            synced: true,
        });
    }

    return buckets;
}

// ─── Anthropic Fetcher ───────────────────────────────────────────────────────

async function fetchAnthropicUsage(config: ProviderConfig, startDate: Date, endDate: Date): Promise<UsageBucket[]> {
    const buckets: UsageBucket[] = [];
    const headers: Record<string, string> = {
        "x-api-key": config.admin_api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    };

    // Format as ISO without milliseconds: 2025-01-08T00:00:00Z
    const fmtDate = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

    // Fetch usage
    let page: string | null = null;
    const usageByDayModel: Record<string, {
        input: number; output: number; cache_read: number; cache_write: number; requests: number;
    }> = {};

    do {
        const url = new URL("https://api.anthropic.com/v1/organizations/usage_report/messages");
        url.searchParams.set("starting_at", fmtDate(startDate));
        url.searchParams.set("ending_at", fmtDate(endDate));
        url.searchParams.set("bucket_width", "1d");
        url.searchParams.append("group_by[]", "model");
        if (page) url.searchParams.set("page", page);

        const res = await fetch(url.toString(), { headers });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Anthropic Usage API ${res.status}: ${errText.slice(0, 200)}`);
        }

        const data = await res.json();
        // Anthropic returns buckets: { data: [{ starting_at, ending_at, results: [...] }] }
        const buckets = Array.isArray(data.data) ? data.data : [];
        for (const bucket of buckets) {
            // Try multiple field name patterns for bucket timestamp
            const dayKey = extractDayKey(bucket.starting_at)
                || extractDayKey(bucket.bucket_start_time)
                || extractDayKey(bucket.start_time)
                || extractDayKey(bucket.timestamp)
                || extractDayKey(bucket.date);
            if (!dayKey) continue;

            // Iterate per-model results within each bucket
            const results = Array.isArray(bucket.results) ? bucket.results : [];
            for (const item of results) {
                const model = item.model || "unknown";
                const key = `${dayKey}::${model}`;
                if (!usageByDayModel[key]) usageByDayModel[key] = { input: 0, output: 0, cache_read: 0, cache_write: 0, requests: 0 };
                usageByDayModel[key].input += item.input_tokens || 0;
                usageByDayModel[key].output += item.output_tokens || 0;
                usageByDayModel[key].cache_read += item.cache_read_input_tokens || 0;
                usageByDayModel[key].cache_write += item.cache_creation_input_tokens || 0;
                usageByDayModel[key].requests += item.num_requests || 0;
            }
        }
        page = data.has_more ? (data.next_page || null) : null;
    } while (page);

    // Fetch costs
    const costByDay: Record<string, number> = {};
    let costPage: string | null = null;
    do {
        const url = new URL("https://api.anthropic.com/v1/organizations/cost_report");
        url.searchParams.set("starting_at", fmtDate(startDate));
        url.searchParams.set("ending_at", fmtDate(endDate));
        url.searchParams.set("bucket_width", "1d");
        if (costPage) url.searchParams.set("page", costPage);

        const res = await fetch(url.toString(), { headers });

        if (!res.ok) {
            console.warn(`Anthropic Cost API returned ${res.status}, proceeding without cost data`);
            break;
        }

        const data = await res.json();
        for (const bucket of data.data || []) {
            const dayKey = extractDayKey(bucket.starting_at)
                || extractDayKey(bucket.bucket_start_time)
                || extractDayKey(bucket.start_time)
                || extractDayKey(bucket.timestamp);
            if (!dayKey) continue;
            // Cost may be at bucket level or within results[]
            const costResults = Array.isArray(bucket.results) ? bucket.results : [];
            if (costResults.length > 0) {
                for (const r of costResults) {
                    const raw = r.cost ?? r.amount ?? 0;
                    const costValue = typeof raw === "string" ? parseFloat(raw) : raw;
                    costByDay[dayKey] = (costByDay[dayKey] || 0) + (isNaN(costValue) ? 0 : costValue / 100);
                }
            } else {
                // Fallback: cost at bucket level (older API format)
                const raw = bucket.cost ?? bucket.amount ?? 0;
                const costValue = typeof raw === "string" ? parseFloat(raw) : raw;
                costByDay[dayKey] = (costByDay[dayKey] || 0) + (isNaN(costValue) ? 0 : costValue / 100);
            }
        }
        costPage = data.has_more ? (data.next_page || null) : null;
    } while (costPage);

    // Build buckets
    for (const [key, usage] of Object.entries(usageByDayModel)) {
        const [day, model] = key.split("::");
        const dayTokensTotal = Object.entries(usageByDayModel)
            .filter(([k]) => k.startsWith(day + "::"))
            .reduce((s, [, u]) => s + u.input + u.output, 0);
        const modelTokens = usage.input + usage.output;
        const proportionalCost = dayTokensTotal > 0 && costByDay[day]
            ? (costByDay[day] * modelTokens) / dayTokensTotal
            : 0;

        buckets.push({
            provider: "anthropic",
            provider_config_id: config._id.toString(),
            model,
            input_tokens: usage.input,
            output_tokens: usage.output,
            cache_read_tokens: usage.cache_read,
            cache_write_tokens: usage.cache_write,
            num_requests: usage.requests,
            cost: proportionalCost,
            currency: "USD",
            date: safeDateISO(day),
            bucket_width: "1d",
            synced: true,
        });
    }

    return buckets;
}

// ─── Sync Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const targetId = body.provider_id;
        const syncDays = Math.min(body.days || 30, 90);

        const db = await getDb();
        const providersColl = db.collection("ai_providers");
        const contentColl = db.collection<ContentDocument>("content");

        const query: Record<string, unknown> = { is_active: true };
        if (targetId && ObjectId.isValid(targetId)) {
            query._id = new ObjectId(targetId);
        }
        const providers = (await providersColl.find(query).toArray()) as unknown as ProviderConfig[];

        if (providers.length === 0) {
            return ApiError("No active providers found", 404);
        }

        const now = new Date();
        const startDate = new Date(now.getTime() - syncDays * 86400000);
        // Round to start of day
        startDate.setUTCHours(0, 0, 0, 0);
        const results: SyncResult[] = [];

        for (const config of providers) {
            const result: SyncResult = {
                provider_id: config._id.toString(),
                provider_name: config.name,
                provider_type: config.provider,
                status: "success",
                entries_synced: 0,
            };

            try {
                let buckets: UsageBucket[] = [];

                if (config.provider === "openai") {
                    buckets = await fetchOpenAIUsage(
                        config,
                        Math.floor(startDate.getTime() / 1000),
                        Math.floor(now.getTime() / 1000)
                    );
                } else if (config.provider === "anthropic") {
                    buckets = await fetchAnthropicUsage(config, startDate, now);
                }

                // Delete old synced entries for this provider in the date range
                await contentColl.deleteMany({
                    module_type: "ai_usage",
                    "payload.provider_config_id": config._id.toString(),
                    "payload.synced": true,
                    "payload.date": { $gte: startDate.toISOString(), $lte: now.toISOString() },
                });

                if (buckets.length > 0) {
                    const docs = buckets.map((b) => ({
                        module_type: "ai_usage",
                        is_public: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        payload: b,
                    }));
                    await contentColl.insertMany(docs as ContentDocument[]);
                }

                result.entries_synced = buckets.length;

                await providersColl.updateOne(
                    { _id: config._id },
                    { $set: { last_synced_at: now.toISOString(), updated_at: now.toISOString() } }
                );
            } catch (error) {
                result.status = "error";
                result.error = error instanceof Error ? error.message : "Unknown error";
                console.error(`Sync failed for ${config.name}:`, error);
            }

            results.push(result);
        }

        return ApiSuccess({ results, synced_at: now.toISOString() });
    } catch (error) {
        console.error("POST /api/ai-usage/sync failed:", error);
        return ApiError("Sync failed", 500);
    }
}
