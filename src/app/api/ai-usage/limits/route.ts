import { getDb } from "@/lib/mongodb";
import { ApiSuccess, ApiError } from "@/lib/api-response";

export interface LimitWindow {
    label: string;
    limit: number;
    remaining: number;
    reset_at?: string; // ISO string or relative like "1m30s"
}

export interface ProviderLimitResult {
    provider_id: string;
    provider_name: string;
    provider_type: string;
    windows: LimitWindow[];
    fetched_at: string;
    error?: string;
}

function parseAnthropicLimits(headers: Headers): LimitWindow[] {
    const windows: LimitWindow[] = [];

    const pairs: Array<{ label: string; limitH: string; remainingH: string; resetH: string }> = [
        {
            label: "Requests / min",
            limitH: "anthropic-ratelimit-requests-limit",
            remainingH: "anthropic-ratelimit-requests-remaining",
            resetH: "anthropic-ratelimit-requests-reset",
        },
        {
            label: "Tokens / min",
            limitH: "anthropic-ratelimit-tokens-limit",
            remainingH: "anthropic-ratelimit-tokens-remaining",
            resetH: "anthropic-ratelimit-tokens-reset",
        },
        {
            label: "Input tokens / min",
            limitH: "anthropic-ratelimit-input-tokens-limit",
            remainingH: "anthropic-ratelimit-input-tokens-remaining",
            resetH: "anthropic-ratelimit-input-tokens-reset",
        },
        {
            label: "Output tokens / min",
            limitH: "anthropic-ratelimit-output-tokens-limit",
            remainingH: "anthropic-ratelimit-output-tokens-remaining",
            resetH: "anthropic-ratelimit-output-tokens-reset",
        },
    ];

    for (const p of pairs) {
        const limitStr = headers.get(p.limitH);
        if (!limitStr) continue;
        const limit = parseInt(limitStr, 10);
        const remaining = parseInt(headers.get(p.remainingH) || "0", 10);
        const reset_at = headers.get(p.resetH) || undefined;
        if (!isNaN(limit) && limit > 0) {
            windows.push({ label: p.label, limit, remaining, reset_at });
        }
    }

    return windows;
}

function parseOpenAILimits(headers: Headers): LimitWindow[] {
    const windows: LimitWindow[] = [];

    const reqLimit = headers.get("x-ratelimit-limit-requests");
    const reqRemaining = headers.get("x-ratelimit-remaining-requests");
    const reqReset = headers.get("x-ratelimit-reset-requests");
    if (reqLimit) {
        const limit = parseInt(reqLimit, 10);
        if (!isNaN(limit) && limit > 0) {
            windows.push({
                label: "Requests / min",
                limit,
                remaining: parseInt(reqRemaining || "0", 10),
                reset_at: reqReset || undefined,
            });
        }
    }

    const tokLimit = headers.get("x-ratelimit-limit-tokens");
    const tokRemaining = headers.get("x-ratelimit-remaining-tokens");
    const tokReset = headers.get("x-ratelimit-reset-tokens");
    if (tokLimit) {
        const limit = parseInt(tokLimit, 10);
        if (!isNaN(limit) && limit > 0) {
            windows.push({
                label: "Tokens / min",
                limit,
                remaining: parseInt(tokRemaining || "0", 10),
                reset_at: tokReset || undefined,
            });
        }
    }

    return windows;
}

export async function GET() {
    try {
        const db = await getDb();
        const providers = await db.collection("ai_providers").find({ is_active: true }).toArray();

        const results: ProviderLimitResult[] = await Promise.all(
            providers.map(async (config) => {
                const base: ProviderLimitResult = {
                    provider_id: config._id.toString(),
                    provider_name: config.name,
                    provider_type: config.provider,
                    windows: [],
                    fetched_at: new Date().toISOString(),
                };

                try {
                    if (config.provider === "anthropic") {
                        // A lightweight GET to /v1/models returns rate limit headers
                        const res = await fetch("https://api.anthropic.com/v1/models", {
                            headers: {
                                "x-api-key": config.admin_api_key,
                                "anthropic-version": "2023-06-01",
                            },
                        });
                        base.windows = parseAnthropicLimits(res.headers);
                        if (!res.ok && base.windows.length === 0) {
                            const txt = await res.text().catch(() => "");
                            base.error = `API ${res.status}: ${txt.slice(0, 120)}`;
                        }
                    } else if (config.provider === "openai") {
                        // Admin keys work for /v1/models list
                        const res = await fetch("https://api.openai.com/v1/models", {
                            headers: { Authorization: `Bearer ${config.admin_api_key}` },
                        });
                        base.windows = parseOpenAILimits(res.headers);
                        if (!res.ok && base.windows.length === 0) {
                            const txt = await res.text().catch(() => "");
                            base.error = `API ${res.status}: ${txt.slice(0, 120)}`;
                        }
                    }
                } catch (e) {
                    base.error = e instanceof Error ? e.message : "Failed to fetch limits";
                }

                return base;
            })
        );

        return ApiSuccess({ results });
    } catch (error) {
        return ApiError(error instanceof Error ? error.message : "Failed to fetch limits", 500);
    }
}
