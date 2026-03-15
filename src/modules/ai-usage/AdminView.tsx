"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Plus, Trash2, Edit3, Bot, Search, CalendarDays,
    DollarSign, Zap, BookOpen, ChevronDown, ChevronRight,
    ExternalLink, Copy, Check, Info, ArrowUpDown,
    BarChart3, Filter, Clock, Coins, Hash,
    RefreshCw, Shield, ShieldCheck, ShieldAlert,
    Power, PowerOff, Eye, EyeOff, AlertCircle,
    Gauge, TrendingUp, Activity, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AiUsageEntry {
    _id: string;
    payload: {
        provider: string;
        provider_config_id?: string;
        model: string;
        input_tokens: number;
        output_tokens: number;
        cache_read_tokens: number;
        cache_write_tokens: number;
        num_requests: number;
        cost: number;
        currency: string;
        date: string;
        synced?: boolean;
        session_label?: string;
        api_key_label?: string;
        notes?: string;
    };
    created_at: string;
}

interface ProviderConfig {
    _id: string;
    name: string;
    provider: "openai" | "anthropic";
    admin_api_key: string;
    plan?: string;
    monthly_budget?: number;
    organization_name?: string;
    is_active: boolean;
    last_synced_at?: string;
    created_at: string;
}

interface SyncResult {
    provider_id: string;
    provider_name: string;
    provider_type: string;
    status: "success" | "error";
    entries_synced: number;
    error?: string;
}

interface LimitWindow {
    label: string;
    limit: number;
    remaining: number;
    reset_at?: string;
}

interface ProviderLimitResult {
    provider_id: string;
    windows: LimitWindow[];
    fetched_at: string;
    error?: string;
}

type TabView = "dashboard" | "log" | "providers" | "guides";
type SupportedProvider = "openai" | "anthropic";

// ─── Provider Meta ───────────────────────────────────────────────────────────

interface PlanInfo {
    name: string;
    rateLimit: string;
    monthlyLimit?: string;
}

const PROVIDER_META: Record<SupportedProvider, {
    name: string;
    color: string;
    colorHex: string;
    bg: string;
    border: string;
    gradient: string;
    keyPrefix: string;
    keyLabel: string;
    docsUrl: string;
    apiKeyUrl: string;
    usageDashboardUrl: string;
    description: string;
    plans: PlanInfo[];
    setupSteps: string[];
    envVar: string;
}> = {
    openai: {
        name: "OpenAI",
        color: "text-success",
        colorHex: "#34d399",
        bg: "bg-success/10",
        border: "border-success/20",
        gradient: "from-success/20 via-success/5 to-transparent",
        keyPrefix: "sk-admin-",
        keyLabel: "Admin API Key",
        docsUrl: "https://platform.openai.com/docs/api-reference/usage",
        apiKeyUrl: "https://platform.openai.com/settings/organization/admin-keys",
        usageDashboardUrl: "https://platform.openai.com/usage",
        description: "GPT & o-series models",
        plans: [
            { name: "Free", rateLimit: "3 RPM / 200 RPD", monthlyLimit: "—" },
            { name: "Tier 1", rateLimit: "500 RPM", monthlyLimit: "$100/mo" },
            { name: "Tier 2", rateLimit: "5,000 RPM", monthlyLimit: "$500/mo" },
            { name: "Tier 3", rateLimit: "5,000 RPM", monthlyLimit: "$1,000/mo" },
            { name: "Tier 4", rateLimit: "10,000 RPM", monthlyLimit: "$5,000/mo" },
            { name: "Tier 5", rateLimit: "10,000+ RPM", monthlyLimit: "$10,000+/mo" },
        ],
        setupSteps: [
            "Go to platform.openai.com and log in as an Organization Owner",
            "Navigate to Settings → Organization → Admin API Keys",
            "Click 'Create admin key' and name it (e.g. 'LifeOS Tracker')",
            "Copy the key (starts with sk-admin-...) — it won't be shown again",
            "Paste it here. LifeOS will auto-fetch usage & cost data",
            "Usage data appears within minutes. Cost data updates daily.",
        ],
        envVar: "OPENAI_ADMIN_KEY",
    },
    anthropic: {
        name: "Anthropic",
        color: "text-orange-400",
        colorHex: "#fb923c",
        bg: "bg-orange-500/10",
        border: "border-orange-500/20",
        gradient: "from-orange-500/20 via-orange-500/5 to-transparent",
        keyPrefix: "sk-ant-admin",
        keyLabel: "Admin API Key",
        docsUrl: "https://docs.anthropic.com/en/api/usage-cost-api",
        apiKeyUrl: "https://console.anthropic.com/settings/admin-keys",
        usageDashboardUrl: "https://console.anthropic.com/settings/usage",
        description: "Claude models",
        plans: [
            { name: "Free", rateLimit: "5 RPM", monthlyLimit: "—" },
            { name: "Build Tier 1", rateLimit: "50 RPM", monthlyLimit: "$100/mo" },
            { name: "Build Tier 2", rateLimit: "1,000 RPM", monthlyLimit: "$500/mo" },
            { name: "Build Tier 3", rateLimit: "2,000 RPM", monthlyLimit: "$1,000/mo" },
            { name: "Build Tier 4", rateLimit: "4,000 RPM", monthlyLimit: "$5,000/mo" },
            { name: "Scale", rateLimit: "Custom", monthlyLimit: "Custom" },
        ],
        setupSteps: [
            "Go to console.anthropic.com and log in as an Organization Admin",
            "Navigate to Settings → Admin API Keys",
            "Click 'Create Admin Key' and name it",
            "Copy the key (starts with sk-ant-admin...) — store securely",
            "Paste it here. LifeOS will auto-fetch usage & cost reports",
            "Data appears within ~5 minutes of API requests.",
        ],
        envVar: "ANTHROPIC_ADMIN_KEY",
    },
};

const UNSUPPORTED_PROVIDERS: Record<string, { name: string; color: string; bg: string; border: string; dashboardUrl: string; reason: string }> = {
    google: { name: "Google AI", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", dashboardUrl: "https://aistudio.google.com", reason: "No programmatic usage API yet." },
    mistral: { name: "Mistral AI", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20", dashboardUrl: "https://console.mistral.ai", reason: "No public usage API." },
    groq: { name: "Groq", color: "text-danger", bg: "bg-danger/10", border: "border-danger/20", dashboardUrl: "https://console.groq.com", reason: "No public usage API." },
    perplexity: { name: "Perplexity", color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20", dashboardUrl: "https://www.perplexity.ai/settings/api", reason: "No usage tracking API." },
    deepseek: { name: "DeepSeek", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20", dashboardUrl: "https://platform.deepseek.com", reason: "No usage tracking API." },
    xai: { name: "xAI (Grok)", color: "text-zinc-300", bg: "bg-zinc-500/10", border: "border-zinc-500/20", dashboardUrl: "https://console.x.ai", reason: "No usage tracking API." },
    together: { name: "Together AI", color: "text-warning", bg: "bg-warning/10", border: "border-warning/20", dashboardUrl: "https://api.together.xyz", reason: "No usage tracking API." },
    cohere: { name: "Cohere", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", dashboardUrl: "https://dashboard.cohere.com", reason: "No usage tracking API." },
};

const CURR_SYM: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", INR: "₹" };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTokens(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return n.toString();
}

function fmtCost(cost: number, currency = "USD"): string {
    const sym = CURR_SYM[currency] || "$";
    if (cost >= 1) return sym + cost.toFixed(2);
    if (cost >= 0.01) return sym + cost.toFixed(3);
    return sym + cost.toFixed(4);
}

function relTime(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(diff / 86400000);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AiUsageAdminView() {
    const [entries, setEntries] = useState<AiUsageEntry[]>([]);
    const [providers, setProviders] = useState<ProviderConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [limitsMap, setLimitsMap] = useState<Record<string, ProviderLimitResult>>({});
    const [limitsLoading, setLimitsLoading] = useState(false);
    const [tab, setTab] = useState<TabView>("dashboard");

    // Provider form
    const [showAddProvider, setShowAddProvider] = useState(false);
    const [editingProvider, setEditingProvider] = useState<string | null>(null);
    const [providerForm, setProviderForm] = useState({
        name: "", provider: "openai" as SupportedProvider, admin_api_key: "",
        plan: "", monthly_budget: 0, organization_name: "",
    });
    const [savingProvider, setSavingProvider] = useState(false);
    const [showKey, setShowKey] = useState(false);

    // Sync
    const [syncing, setSyncing] = useState(false);
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null);
    const [syncDays, setSyncDays] = useState(30);

    // Log filters
    const [searchQuery, setSearchQuery] = useState("");
    const [filterProvider, setFilterProvider] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"date" | "cost" | "tokens">("date");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

    // Guides
    const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
    const [copiedText, setCopiedText] = useState<string | null>(null);

    // ─── Data Fetching ───────────────────────────────────────────────────────

    const fetchEntries = useCallback(async () => {
        try {
            const r = await fetch("/api/content?module_type=ai_usage");
            const d = await r.json();
            setEntries(d.data || []);
        } catch { /* */ }
    }, []);

    const fetchProviders = useCallback(async () => {
        try {
            const r = await fetch("/api/ai-usage/providers");
            const d = await r.json();
            setProviders(d.data || []);
        } catch { /* */ }
    }, []);

    const fetchLimits = useCallback(async () => {
        setLimitsLoading(true);
        try {
            const r = await fetch("/api/ai-usage/limits");
            const d = await r.json();
            const map: Record<string, ProviderLimitResult> = {};
            for (const item of (d.data?.results || [])) {
                map[item.provider_id] = item;
            }
            setLimitsMap(map);
        } catch { /* */ }
        finally { setLimitsLoading(false); }
    }, []);

    useEffect(() => {
        Promise.all([fetchEntries(), fetchProviders(), fetchLimits()]).finally(() => setLoading(false));
    }, [fetchEntries, fetchProviders, fetchLimits]);

    // ─── Sync ────────────────────────────────────────────────────────────────

    const handleSync = async (providerId?: string) => {
        setSyncing(true);
        if (providerId) setSyncingId(providerId);
        setSyncResults(null);
        try {
            const r = await fetch("/api/ai-usage/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider_id: providerId, days: syncDays }),
            });
            const d = await r.json();
            if (d.success) {
                setSyncResults(d.data.results);
                await Promise.all([fetchEntries(), fetchProviders(), fetchLimits()]);
            } else {
                alert(d.error || "Sync failed");
            }
        } catch { alert("Sync request failed"); }
        finally { setSyncing(false); setSyncingId(null); }
    };

    // ─── Provider CRUD ───────────────────────────────────────────────────────

    const resetProviderForm = () => {
        setProviderForm({ name: "", provider: "openai", admin_api_key: "", plan: "", monthly_budget: 0, organization_name: "" });
        setShowAddProvider(false);
        setEditingProvider(null);
        setShowKey(false);
    };

    const handleSaveProvider = async () => {
        if (!providerForm.name.trim() || (!editingProvider && !providerForm.admin_api_key.trim())) {
            return alert("Name and API key are required");
        }
        setSavingProvider(true);
        try {
            const payload: Record<string, unknown> = {
                name: providerForm.name,
                provider: providerForm.provider,
                plan: providerForm.plan || undefined,
                monthly_budget: providerForm.monthly_budget || undefined,
                organization_name: providerForm.organization_name || undefined,
            };
            if (providerForm.admin_api_key.trim()) payload.admin_api_key = providerForm.admin_api_key;

            if (editingProvider) {
                await fetch(`/api/ai-usage/providers/${editingProvider}`, {
                    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
                });
            } else {
                payload.admin_api_key = providerForm.admin_api_key;
                await fetch("/api/ai-usage/providers", {
                    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
                });
            }
            resetProviderForm();
            await fetchProviders();
        } catch { alert("Failed to save provider"); }
        finally { setSavingProvider(false); }
    };

    const handleDeleteProvider = async (id: string) => {
        if (!confirm("Delete this provider and all its synced usage data?")) return;
        try {
            await fetch(`/api/ai-usage/providers/${id}`, { method: "DELETE" });
            await Promise.all([fetchProviders(), fetchEntries()]);
        } catch { alert("Failed to delete"); }
    };

    const handleToggleProvider = async (id: string, active: boolean) => {
        try {
            await fetch(`/api/ai-usage/providers/${id}`, {
                method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !active }),
            });
            await fetchProviders();
        } catch { alert("Failed to update"); }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(text);
        setTimeout(() => setCopiedText(null), 2000);
    };

    // ─── Derived Data ────────────────────────────────────────────────────────

    const dateFilteredEntries = useMemo(() => {
        if (dateRange === "all") return entries;
        const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
        const cutoff = new Date(Date.now() - days * 86400000);
        return entries.filter((e) => new Date(e.payload.date) >= cutoff);
    }, [entries, dateRange]);

    const filteredEntries = useMemo(() => {
        let result = [...dateFilteredEntries];
        if (filterProvider !== "all") result = result.filter((e) => e.payload.provider === filterProvider);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter((e) =>
                e.payload.model.toLowerCase().includes(q) || e.payload.provider.toLowerCase().includes(q) ||
                (e.payload.session_label || "").toLowerCase().includes(q) || (e.payload.notes || "").toLowerCase().includes(q)
            );
        }
        result.sort((a, b) => {
            let cmp = 0;
            if (sortBy === "date") cmp = new Date(a.payload.date).getTime() - new Date(b.payload.date).getTime();
            else if (sortBy === "cost") cmp = a.payload.cost - b.payload.cost;
            else cmp = (a.payload.input_tokens + a.payload.output_tokens) - (b.payload.input_tokens + b.payload.output_tokens);
            return sortDir === "desc" ? -cmp : cmp;
        });
        return result;
    }, [dateFilteredEntries, filterProvider, searchQuery, sortBy, sortDir]);

    const stats = useMemo(() => {
        const totalCost = dateFilteredEntries.reduce((s, e) => s + e.payload.cost, 0);
        const totalIn = dateFilteredEntries.reduce((s, e) => s + e.payload.input_tokens, 0);
        const totalOut = dateFilteredEntries.reduce((s, e) => s + e.payload.output_tokens, 0);
        const totalCacheR = dateFilteredEntries.reduce((s, e) => s + (e.payload.cache_read_tokens || 0), 0);
        const totalCacheW = dateFilteredEntries.reduce((s, e) => s + (e.payload.cache_write_tokens || 0), 0);
        const totalReq = dateFilteredEntries.reduce((s, e) => s + (e.payload.num_requests || 0), 0);

        const byProvider: Record<string, { cost: number; calls: number; tokens: number }> = {};
        const byModel: Record<string, { cost: number; calls: number; tokens: number; provider: string }> = {};
        const dailyCosts: Record<string, number> = {};

        for (const e of dateFilteredEntries) {
            const p = e.payload.provider, m = e.payload.model;
            const tok = e.payload.input_tokens + e.payload.output_tokens;
            const day = new Date(e.payload.date).toISOString().slice(0, 10);

            if (!byProvider[p]) byProvider[p] = { cost: 0, calls: 0, tokens: 0 };
            byProvider[p].cost += e.payload.cost;
            byProvider[p].calls += e.payload.num_requests || 1;
            byProvider[p].tokens += tok;

            if (!byModel[m]) byModel[m] = { cost: 0, calls: 0, tokens: 0, provider: p };
            byModel[m].cost += e.payload.cost;
            byModel[m].calls += e.payload.num_requests || 1;
            byModel[m].tokens += tok;

            dailyCosts[day] = (dailyCosts[day] || 0) + e.payload.cost;
        }

        return { totalCost, totalIn, totalOut, totalCacheR, totalCacheW, totalReq, byProvider, byModel, dailyCosts };
    }, [dateFilteredEntries]);

    // Per-provider stats for cards
    const providerStats = useMemo(() => {
        const map: Record<string, { cost: number; tokens: number; requests: number }> = {};
        for (const e of dateFilteredEntries) {
            const cid = e.payload.provider_config_id || e.payload.provider;
            if (!map[cid]) map[cid] = { cost: 0, tokens: 0, requests: 0 };
            map[cid].cost += e.payload.cost;
            map[cid].tokens += e.payload.input_tokens + e.payload.output_tokens;
            map[cid].requests += e.payload.num_requests || 1;
        }
        return map;
    }, [dateFilteredEntries]);

    // ─── Loading ─────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-10 bg-zinc-800/50 rounded-lg w-1/3" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[0, 1].map((i) => <div key={i} className="h-40 bg-zinc-900/50 rounded-2xl border border-zinc-800/50" />)}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 bg-zinc-900/50 rounded-2xl border border-zinc-800/50" />)}
                </div>
            </div>
        );
    }

    const activeProviders = providers.filter((p) => p.is_active);
    const hasProviders = providers.length > 0;

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-50 mb-1 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/30 to-accent/5 border border-accent/20 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-accent" />
                        </div>
                        AI Usage Tracker
                    </h1>
                    <p className="text-zinc-500 text-sm">
                        {hasProviders
                            ? `${activeProviders.length} provider${activeProviders.length !== 1 ? "s" : ""} connected · Auto-synced usage tracking`
                            : "Connect your AI providers to start tracking usage automatically"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select value={dateRange} onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
                        className="h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm focus:outline-none">
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                        <option value="all">All time</option>
                    </select>
                    {hasProviders && (
                        <button onClick={() => handleSync()} disabled={syncing || activeProviders.length === 0}
                            className={cn("h-9 px-4 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all",
                                syncing ? "bg-zinc-800 text-zinc-500" : "bg-accent text-zinc-950 hover:opacity-90")}>
                            <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                            {syncing ? "Syncing..." : "Sync All"}
                        </button>
                    )}
                </div>
            </header>

            {/* Sync Results */}
            <AnimatePresence>
                {syncResults && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/80 space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-accent" /> Sync Complete
                            </p>
                            <button onClick={() => setSyncResults(null)} className="text-zinc-600 hover:text-zinc-400 text-xs">dismiss</button>
                        </div>
                        {syncResults.map((r) => (
                            <div key={r.provider_id} className="flex items-center gap-2 text-xs">
                                {r.status === "success"
                                    ? <ShieldCheck className="w-3.5 h-3.5 text-success" />
                                    : <ShieldAlert className="w-3.5 h-3.5 text-danger" />}
                                <span className="text-zinc-300 font-medium">{r.provider_name}</span>
                                <span className="text-zinc-700">—</span>
                                {r.status === "success"
                                    ? r.entries_synced > 0
                                        ? <span className="text-success/80">{r.entries_synced} entries synced</span>
                                        : <span className="text-warning/80">0 entries — this tracks <strong>API key usage only</strong> (not Claude.ai / ChatGPT web sessions). Use your Admin key from <a href={r.provider_type === "anthropic" ? "https://console.anthropic.com" : "https://platform.openai.com"} target="_blank" rel="noopener noreferrer" className="underline">console</a> and make sure API calls have been made with keys in that same org.</span>
                                    : <span className="text-danger/80 truncate max-w-xs">{r.error}</span>}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-zinc-900/50 rounded-xl border border-zinc-800/50 w-fit">
                {([
                    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
                    { id: "providers", label: "Providers", icon: Shield, badge: providers.length || undefined },
                    { id: "log", label: "Usage Log", icon: Clock },
                    { id: "guides", label: "Setup Guides", icon: BookOpen },
                ] as { id: TabView; label: string; icon: typeof BarChart3; badge?: number }[]).map(({ id, label, icon: Icon, badge }) => (
                    <button key={id} onClick={() => setTab(id)}
                        className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                            tab === id ? "bg-zinc-800 text-zinc-50 shadow-lg shadow-zinc-900/50" : "text-zinc-500 hover:text-zinc-300")}>
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{label}</span>
                        {badge !== undefined && badge > 0 && (
                            <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-md font-bold">{badge}</span>
                        )}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {/* ─── DASHBOARD ──────────────────────────────────────────── */}
                {tab === "dashboard" && (
                    <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                        {!hasProviders ? <EmptyState onAdd={() => { setTab("providers"); setShowAddProvider(true); }} /> : (
                            <>
                                {/* Provider Cards */}
                                <div className={cn("grid gap-4", providers.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
                                    {providers.map((p) => {
                                        const meta = PROVIDER_META[p.provider];
                                        const pStats = providerStats[p._id] || { cost: 0, tokens: 0, requests: 0 };
                                        const budgetPct = p.monthly_budget && p.monthly_budget > 0
                                            ? Math.min((pStats.cost / p.monthly_budget) * 100, 100) : null;
                                        return (
                                            <div key={p._id} className={cn(
                                                "relative overflow-hidden rounded-2xl border transition-all group",
                                                p.is_active ? cn(meta.border, "bg-zinc-900/50") : "border-zinc-800/50 bg-zinc-950/30 opacity-50"
                                            )}>
                                                {/* Gradient accent */}
                                                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none", meta.gradient)} />

                                                <div className="relative p-5 space-y-4">
                                                    {/* Header */}
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", meta.bg, meta.border)}>
                                                                <Bot className={cn("w-6 h-6", meta.color)} />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-base font-bold text-zinc-100">{p.name}</h3>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md", meta.bg, meta.color)}>
                                                                        {meta.name}
                                                                    </span>
                                                                    {p.plan && (
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                                            <Gauge className="w-3 h-3" /> {p.plan}
                                                                        </span>
                                                                    )}
                                                                    {p.is_active
                                                                        ? <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                                                        : <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => handleSync(p._id)} disabled={syncing || !p.is_active}
                                                            className="p-2 rounded-lg hover:bg-zinc-800/80 text-zinc-600 hover:text-zinc-300 transition-colors disabled:opacity-30">
                                                            <RefreshCw className={cn("w-4 h-4", syncing && syncingId === p._id && "animate-spin")} />
                                                        </button>
                                                    </div>

                                                    {/* Stats Row */}
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600">Cost</p>
                                                            <p className={cn("text-lg font-bold mt-0.5", meta.color)}>{fmtCost(pStats.cost)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600">Tokens</p>
                                                            <p className="text-lg font-bold text-zinc-200 mt-0.5">{fmtTokens(pStats.tokens)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600">Requests</p>
                                                            <p className="text-lg font-bold text-zinc-200 mt-0.5">{pStats.requests.toLocaleString()}</p>
                                                        </div>
                                                    </div>

                                                    {/* Budget Bar */}
                                                    {budgetPct !== null && (
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 flex items-center gap-1">
                                                                    <Wallet className="w-3 h-3" /> Monthly Budget
                                                                </p>
                                                                <p className={cn("text-[10px] font-bold", budgetPct > 80 ? "text-danger" : budgetPct > 50 ? "text-warning" : "text-zinc-500")}>
                                                                    {fmtCost(pStats.cost)} / {fmtCost(p.monthly_budget!)} ({budgetPct.toFixed(0)}%)
                                                                </p>
                                                            </div>
                                                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                                <motion.div initial={{ width: 0 }} animate={{ width: `${budgetPct}%` }}
                                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                                    className={cn("h-full rounded-full transition-colors",
                                                                        budgetPct > 80 ? "bg-danger" : budgetPct > 50 ? "bg-warning" : "bg-accent")} />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Rate Limits */}
                                                    {(() => {
                                                        const lim = limitsMap[p._id];
                                                        if (!lim) return null;
                                                        if (lim.error && lim.windows.length === 0) return (
                                                            <div className="text-[10px] text-danger/70 flex items-center gap-1">
                                                                <AlertCircle className="w-3 h-3" /> Rate limits unavailable
                                                            </div>
                                                        );
                                                        if (lim.windows.length === 0) return null;
                                                        return (
                                                            <div className="space-y-2 pt-0.5">
                                                                <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 flex items-center gap-1">
                                                                    <Gauge className="w-3 h-3" /> Rate Limits
                                                                    {limitsLoading && <RefreshCw className="w-3 h-3 animate-spin ml-1" />}
                                                                </p>
                                                                {lim.windows.map((w) => {
                                                                    const used = w.limit - w.remaining;
                                                                    const pct = Math.min((used / w.limit) * 100, 100);
                                                                    const resetLabel = w.reset_at
                                                                        ? (() => {
                                                                            const d = new Date(w.reset_at);
                                                                            if (!isNaN(d.getTime())) {
                                                                                const diff = d.getTime() - Date.now();
                                                                                if (diff > 0) {
                                                                                    const s = Math.floor(diff / 1000);
                                                                                    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
                                                                                }
                                                                            }
                                                                            return w.reset_at;
                                                                        })()
                                                                        : null;
                                                                    return (
                                                                        <div key={w.label} className="space-y-1">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-[10px] text-zinc-500">{w.label}</span>
                                                                                <span className={cn("text-[10px] font-bold",
                                                                                    pct > 80 ? "text-danger" : pct > 50 ? "text-warning" : "text-zinc-400")}>
                                                                                    {pct.toFixed(0)}% used
                                                                                    {resetLabel && <span className="text-zinc-700 font-normal ml-1">· resets {resetLabel}</span>}
                                                                                </span>
                                                                            </div>
                                                                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                                                <motion.div
                                                                                    initial={{ width: 0 }}
                                                                                    animate={{ width: `${pct}%` }}
                                                                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                                                                    className={cn("h-full rounded-full",
                                                                                        pct > 80 ? "bg-danger" : pct > 50 ? "bg-warning" : meta.colorHex ? "" : "bg-accent")}
                                                                                    style={pct <= 50 && meta.colorHex ? { backgroundColor: meta.colorHex } : undefined}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                                <button onClick={fetchLimits} className="text-[10px] text-zinc-700 hover:text-zinc-400 flex items-center gap-1 transition-colors">
                                                                    <RefreshCw className="w-3 h-3" /> Refresh limits
                                                                </button>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Footer */}
                                                    <div className="flex items-center justify-between pt-1 border-t border-zinc-800/50">
                                                        <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                                                            {p.last_synced_at && (
                                                                <span className="flex items-center gap-1">
                                                                    <RefreshCw className="w-3 h-3" /> {relTime(p.last_synced_at)}
                                                                </span>
                                                            )}
                                                            {p.organization_name && (
                                                                <span className="text-zinc-700">· {p.organization_name}</span>
                                                            )}
                                                        </div>
                                                        <a href={meta.usageDashboardUrl} target="_blank" rel="noopener noreferrer"
                                                            className="text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors">
                                                            Dashboard <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <StatCard label="Total Cost" value={fmtCost(stats.totalCost)} sub={`${dateRange === "all" ? "all time" : `last ${dateRange}`}`} icon={DollarSign} accent="text-success" accentBg="bg-success/10" />
                                    <StatCard label="API Requests" value={stats.totalReq.toLocaleString()} sub={`across ${Object.keys(stats.byProvider).length} providers`} icon={Zap} accent="text-blue-400" accentBg="bg-blue-500/10" />
                                    <StatCard label="Input Tokens" value={fmtTokens(stats.totalIn)} sub={stats.totalCacheR > 0 ? `${fmtTokens(stats.totalCacheR)} cached` : undefined} icon={Hash} accent="text-orange-400" accentBg="bg-orange-500/10" />
                                    <StatCard label="Output Tokens" value={fmtTokens(stats.totalOut)} sub={stats.totalCacheW > 0 ? `${fmtTokens(stats.totalCacheW)} cache writes` : undefined} icon={TrendingUp} accent="text-purple-400" accentBg="bg-purple-500/10" />
                                </div>

                                {/* Charts Row */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Cost by Provider */}
                                    <div className="p-5 rounded-2xl border border-zinc-800/50 bg-zinc-900/30 space-y-4">
                                        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                                            <Coins className="w-4 h-4 text-accent" /> Cost by Provider
                                        </h3>
                                        {Object.entries(stats.byProvider).sort((a, b) => b[1].cost - a[1].cost).map(([prov, data]) => {
                                            const m = PROVIDER_META[prov as SupportedProvider] || { name: prov, color: "text-zinc-400", colorHex: "#a1a1aa", bg: "bg-zinc-500/10" };
                                            const pct = stats.totalCost > 0 ? (data.cost / stats.totalCost) * 100 : 0;
                                            return (
                                                <div key={prov} className="space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.colorHex }} />
                                                            <span className={cn("text-sm font-semibold", m.color)}>{m.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs">
                                                            <span className="text-zinc-500">{data.calls.toLocaleString()} req</span>
                                                            <span className="text-zinc-200 font-bold">{fmtCost(data.cost)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="h-2 bg-zinc-800/80 rounded-full overflow-hidden">
                                                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                                                            className="h-full rounded-full" style={{ backgroundColor: m.colorHex, opacity: 0.7 }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {Object.keys(stats.byProvider).length === 0 && <EmptyChart text="No usage data yet. Hit 'Sync All' to fetch." />}
                                    </div>

                                    {/* Top Models */}
                                    <div className="p-5 rounded-2xl border border-zinc-800/50 bg-zinc-900/30 space-y-3">
                                        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                                            <BarChart3 className="w-4 h-4 text-accent" /> Top Models
                                        </h3>
                                        {Object.entries(stats.byModel).sort((a, b) => b[1].cost - a[1].cost).slice(0, 7).map(([model, data], i) => {
                                            const m = PROVIDER_META[data.provider as SupportedProvider] || { name: data.provider, color: "text-zinc-400", colorHex: "#a1a1aa" };
                                            return (
                                                <div key={model} className="flex items-center gap-3 py-1.5">
                                                    <span className="text-[10px] font-bold text-zinc-700 w-4 text-right">{i + 1}</span>
                                                    <div className="w-1 h-8 rounded-full" style={{ backgroundColor: m.colorHex, opacity: 0.5 }} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-zinc-200 font-medium truncate">{model}</p>
                                                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider">{m.name} · {data.calls.toLocaleString()} req · {fmtTokens(data.tokens)} tok</p>
                                                    </div>
                                                    <p className="text-sm font-bold text-zinc-300 flex-shrink-0">{fmtCost(data.cost)}</p>
                                                </div>
                                            );
                                        })}
                                        {Object.keys(stats.byModel).length === 0 && <EmptyChart text="No model data yet." />}
                                    </div>
                                </div>

                                {/* Daily Spend */}
                                {Object.keys(stats.dailyCosts).length > 1 && (
                                    <div className="p-5 rounded-2xl border border-zinc-800/50 bg-zinc-900/30 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                                                <CalendarDays className="w-4 h-4 text-accent" /> Daily Spend
                                            </h3>
                                            <p className="text-[10px] text-zinc-600 font-bold">
                                                Avg: {fmtCost(stats.totalCost / Math.max(Object.keys(stats.dailyCosts).length, 1))}/day
                                            </p>
                                        </div>
                                        <div className="flex items-end gap-[3px] h-28">
                                            {(() => {
                                                const sorted = Object.entries(stats.dailyCosts).sort((a, b) => a[0].localeCompare(b[0])).slice(-30);
                                                const max = Math.max(...sorted.map(([, v]) => v), 0.01);
                                                return sorted.map(([day, val]) => {
                                                    const hPct = (val / max) * 100;
                                                    return (
                                                        <div key={day} className="flex-1 flex flex-col items-center group relative min-w-0">
                                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-zinc-800 text-zinc-200 text-[10px] px-2 py-1 rounded-md whitespace-nowrap z-10 pointer-events-none border border-zinc-700">
                                                                {new Date(day).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}: <strong>{fmtCost(val)}</strong>
                                                            </div>
                                                            <motion.div initial={{ height: 0 }} animate={{ height: `${hPct}%` }}
                                                                transition={{ duration: 0.5, ease: "easeOut", delay: 0.01 }}
                                                                className="w-full bg-accent/30 hover:bg-accent/60 rounded-t transition-colors min-h-[2px]" />
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                        <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                                            <span>{Object.keys(stats.dailyCosts).sort()[0]}</span>
                                            <span>{Object.keys(stats.dailyCosts).sort().slice(-1)[0]}</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>
                )}

                {/* ─── PROVIDERS ──────────────────────────────────────────── */}
                {tab === "providers" && (
                    <motion.div key="prov" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                        <div className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/30 flex items-start gap-3">
                            <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-zinc-200 font-medium">Automatic Usage Tracking</p>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Add your provider&apos;s <strong className="text-zinc-300">Admin API key</strong> and LifeOS will automatically fetch usage and cost data.
                                    Currently supported: <span className="text-success font-semibold">OpenAI</span> and <span className="text-orange-400 font-semibold">Anthropic</span>.
                                    Keys are stored securely and never exposed in public API responses.
                                </p>
                            </div>
                        </div>

                        {/* Sync Controls */}
                        {providers.length > 0 && (
                            <div className="flex items-center gap-3 flex-wrap">
                                <select value={syncDays} onChange={(e) => setSyncDays(Number(e.target.value))}
                                    className="h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm">
                                    <option value={7}>Sync last 7 days</option>
                                    <option value={30}>Sync last 30 days</option>
                                    <option value={60}>Sync last 60 days</option>
                                    <option value={90}>Sync last 90 days</option>
                                </select>
                                <button onClick={() => handleSync()} disabled={syncing || activeProviders.length === 0}
                                    className={cn("h-9 px-4 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all",
                                        syncing ? "bg-zinc-800 text-zinc-500" : "bg-accent text-zinc-950 hover:opacity-90")}>
                                    <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} /> {syncing ? "Syncing..." : "Sync All"}
                                </button>
                            </div>
                        )}

                        {/* Provider List */}
                        <div className="space-y-3">
                            {providers.map((p) => {
                                const meta = PROVIDER_META[p.provider];
                                return (
                                    <div key={p._id} className={cn("rounded-2xl border transition-all overflow-hidden",
                                        p.is_active ? cn(meta.border, "bg-zinc-900/50") : "border-zinc-800/50 bg-zinc-950/30 opacity-60")}>
                                        <div className="relative">
                                            <div className={cn("absolute inset-0 bg-gradient-to-r opacity-30 pointer-events-none", meta.gradient)} />
                                            <div className="relative p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", meta.bg, meta.border)}>
                                                        <Bot className={cn("w-5 h-5", meta.color)} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="text-sm font-bold text-zinc-200">{p.name}</p>
                                                            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md", meta.bg, meta.color)}>{meta.name}</span>
                                                            {p.plan && <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-md">{p.plan}</span>}
                                                            {p.is_active
                                                                ? <span className="text-[10px] text-success/80 font-bold uppercase tracking-wider flex items-center gap-1"><Power className="w-3 h-3" /> Active</span>
                                                                : <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider flex items-center gap-1"><PowerOff className="w-3 h-3" /> Paused</span>}
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                                                            <span className="font-mono text-zinc-600">{p.admin_api_key}</span>
                                                            {p.last_synced_at && <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> {relTime(p.last_synced_at)}</span>}
                                                            {p.organization_name && <span className="text-zinc-600">· {p.organization_name}</span>}
                                                            {p.monthly_budget ? <span className="text-zinc-600">· Budget: {fmtCost(p.monthly_budget)}/mo</span> : null}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => handleSync(p._id)} disabled={syncing || !p.is_active} title="Sync"
                                                        className="p-2 rounded-lg hover:bg-zinc-800/80 text-zinc-600 hover:text-zinc-300 transition-colors disabled:opacity-30">
                                                        <RefreshCw className={cn("w-4 h-4", syncing && syncingId === p._id && "animate-spin")} />
                                                    </button>
                                                    <button onClick={() => handleToggleProvider(p._id, p.is_active)} title={p.is_active ? "Pause" : "Activate"}
                                                        className="p-2 rounded-lg hover:bg-zinc-800/80 text-zinc-600 hover:text-zinc-300 transition-colors">
                                                        {p.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                                    </button>
                                                    <button onClick={() => {
                                                        setEditingProvider(p._id);
                                                        setProviderForm({ name: p.name, provider: p.provider, admin_api_key: "", plan: p.plan || "", monthly_budget: p.monthly_budget || 0, organization_name: p.organization_name || "" });
                                                        setShowAddProvider(true);
                                                    }} className="p-2 rounded-lg hover:bg-zinc-800/80 text-zinc-600 hover:text-zinc-300 transition-colors">
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteProvider(p._id)}
                                                        className="p-2 rounded-lg hover:bg-danger/10 text-zinc-600 hover:text-danger transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Add Provider */}
                        {!showAddProvider ? (
                            <button onClick={() => { setShowAddProvider(true); setEditingProvider(null); setProviderForm({ name: "", provider: "openai", admin_api_key: "", plan: "", monthly_budget: 0, organization_name: "" }); }}
                                className="w-full p-4 rounded-2xl border-2 border-dashed border-zinc-800/50 text-zinc-500 hover:border-accent/30 hover:text-accent transition-all flex items-center justify-center gap-2 text-sm font-medium">
                                <Plus className="w-4 h-4" /> Add Provider
                            </button>
                        ) : (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl border border-zinc-800/50 bg-zinc-900/30 space-y-5">
                                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest">{editingProvider ? "Edit Provider" : "Add New Provider"}</h3>

                                {/* Provider Type */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Provider</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(Object.entries(PROVIDER_META) as [SupportedProvider, typeof PROVIDER_META.openai][]).map(([key, meta]) => (
                                            <button key={key} onClick={() => setProviderForm((f) => ({ ...f, provider: key, plan: "" }))}
                                                className={cn("p-4 rounded-xl border text-left transition-all relative overflow-hidden",
                                                    providerForm.provider === key ? cn(meta.border, "shadow-lg") : "border-zinc-800/50 hover:border-zinc-700")}>
                                                {providerForm.provider === key && <div className={cn("absolute inset-0 bg-gradient-to-br opacity-30 pointer-events-none", meta.gradient)} />}
                                                <div className="relative">
                                                    <p className={cn("text-sm font-bold", providerForm.provider === key ? meta.color : "text-zinc-400")}>{meta.name}</p>
                                                    <p className="text-[10px] text-zinc-500 mt-1">{meta.description}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Name + Org */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Display Name *</label>
                                        <input type="text" value={providerForm.name} onChange={(e) => setProviderForm((f) => ({ ...f, name: e.target.value }))}
                                            placeholder={`e.g. Manthan's Personal`}
                                            className="w-full h-10 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-sm placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Organization Name</label>
                                        <input type="text" value={providerForm.organization_name} onChange={(e) => setProviderForm((f) => ({ ...f, organization_name: e.target.value }))}
                                            placeholder="Optional"
                                            className="w-full h-10 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-sm placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700" />
                                    </div>
                                </div>

                                {/* Plan + Budget */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Plan / Tier</label>
                                        <select value={providerForm.plan} onChange={(e) => setProviderForm((f) => ({ ...f, plan: e.target.value }))}
                                            className="w-full h-10 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-sm focus:outline-none focus:border-zinc-700">
                                            <option value="">Select plan...</option>
                                            {PROVIDER_META[providerForm.provider].plans.map((pl) => (
                                                <option key={pl.name} value={pl.name}>{pl.name} — {pl.rateLimit}{pl.monthlyLimit ? ` (${pl.monthlyLimit})` : ""}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Monthly Budget (USD)</label>
                                        <input type="number" min={0} step="1" value={providerForm.monthly_budget || ""} onChange={(e) => setProviderForm((f) => ({ ...f, monthly_budget: parseFloat(e.target.value) || 0 }))}
                                            placeholder="e.g. 100"
                                            className="w-full h-10 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-sm placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700" />
                                    </div>
                                </div>

                                {/* API Key */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                        {PROVIDER_META[providerForm.provider].keyLabel} {!editingProvider && "*"}
                                        <a href={PROVIDER_META[providerForm.provider].apiKeyUrl} target="_blank" rel="noopener noreferrer"
                                            className="text-accent hover:underline flex items-center gap-1">Get one <ExternalLink className="w-3 h-3" /></a>
                                    </label>
                                    <div className="relative">
                                        <input type={showKey ? "text" : "password"} value={providerForm.admin_api_key}
                                            onChange={(e) => setProviderForm((f) => ({ ...f, admin_api_key: e.target.value }))}
                                            placeholder={`${PROVIDER_META[providerForm.provider].keyPrefix}...`}
                                            className="w-full h-10 px-4 pr-10 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-sm placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700 font-mono" />
                                        <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
                                            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {editingProvider && <p className="text-[10px] text-zinc-600">Leave blank to keep existing key unchanged</p>}
                                </div>

                                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/50 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-warning/70 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-zinc-500">
                                        This must be an <strong className="text-zinc-300">Admin API key</strong>, not a regular API key.
                                        {providerForm.provider === "openai" ? " Only Organization Owners can create admin keys." : " Only Organization Admins can create admin keys."}
                                    </p>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button onClick={resetProviderForm} className="h-10 px-5 rounded-xl border border-zinc-800 text-zinc-400 text-sm font-medium hover:border-zinc-700 hover:text-zinc-300 transition-colors">Cancel</button>
                                    <button onClick={handleSaveProvider} disabled={savingProvider || !providerForm.name.trim() || (!editingProvider && !providerForm.admin_api_key.trim())}
                                        className={cn("h-10 px-6 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                                            savingProvider || !providerForm.name.trim() ? "bg-zinc-800 text-zinc-600 cursor-not-allowed" : "bg-accent text-zinc-950 hover:opacity-90")}>
                                        {savingProvider ? "Saving..." : editingProvider ? "Update Provider" : "Add Provider"}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Unsupported */}
                        <div className="space-y-3 pt-2">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600">Other Providers (No Usage API Available)</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                {Object.entries(UNSUPPORTED_PROVIDERS).map(([key, cfg]) => (
                                    <a key={key} href={cfg.dashboardUrl} target="_blank" rel="noopener noreferrer"
                                        className="p-3 rounded-xl border border-zinc-800/30 bg-zinc-950/20 hover:border-zinc-700/50 transition-all flex items-center justify-between group">
                                        <div>
                                            <span className={cn("text-xs font-bold", cfg.color)}>{cfg.name}</span>
                                            <p className="text-[10px] text-zinc-700 mt-0.5">{cfg.reason}</p>
                                        </div>
                                        <ExternalLink className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ─── USAGE LOG ──────────────────────────────────────────── */}
                {tab === "log" && (
                    <motion.div key="log" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                <input type="text" placeholder="Search models, providers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-10 pl-10 pr-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700" />
                            </div>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                                    <select value={filterProvider} onChange={(e) => setFilterProvider(e.target.value)}
                                        className="h-10 pl-9 pr-8 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm appearance-none cursor-pointer">
                                        <option value="all">All Providers</option>
                                        {Object.entries(PROVIDER_META).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                                    </select>
                                </div>
                                <button onClick={() => { if (sortBy === "date") setSortDir((d) => d === "desc" ? "asc" : "desc"); else { setSortBy("date"); setSortDir("desc"); } }}
                                    className={cn("h-10 px-3 rounded-xl border text-sm flex items-center gap-1.5 transition-colors",
                                        sortBy === "date" ? "bg-zinc-800 border-zinc-700 text-zinc-200" : "bg-zinc-900 border-zinc-800 text-zinc-500")}>
                                    <CalendarDays className="w-3.5 h-3.5" /><ArrowUpDown className="w-3 h-3" />
                                </button>
                                <button onClick={() => { if (sortBy === "cost") setSortDir((d) => d === "desc" ? "asc" : "desc"); else { setSortBy("cost"); setSortDir("desc"); } }}
                                    className={cn("h-10 px-3 rounded-xl border text-sm flex items-center gap-1.5 transition-colors",
                                        sortBy === "cost" ? "bg-zinc-800 border-zinc-700 text-zinc-200" : "bg-zinc-900 border-zinc-800 text-zinc-500")}>
                                    <DollarSign className="w-3.5 h-3.5" /><ArrowUpDown className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">{filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}</p>

                        <div className="space-y-2">
                            {filteredEntries.map((entry) => {
                                const meta = PROVIDER_META[entry.payload.provider as SupportedProvider] || { name: entry.payload.provider, color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20", colorHex: "#a1a1aa" };
                                return (
                                    <div key={entry._id} className="group p-4 rounded-2xl border border-zinc-800/50 bg-zinc-900/30 hover:border-zinc-700/50 transition-all">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border", meta.bg, meta.border)}>
                                                    <Bot className={cn("w-5 h-5", meta.color)} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={cn("text-sm font-bold", meta.color)}>{meta.name}</span>
                                                        <span className="text-zinc-700">/</span>
                                                        <span className="text-sm text-zinc-200 font-medium">{entry.payload.model}</span>
                                                        {entry.payload.synced && <span className="text-[10px] bg-zinc-800/50 text-zinc-600 px-1.5 py-0.5 rounded font-mono">synced</span>}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-zinc-500">
                                                        <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{(entry.payload.num_requests || 0).toLocaleString()} req</span>
                                                        <span className="text-zinc-700">·</span>
                                                        <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{fmtTokens(entry.payload.input_tokens + entry.payload.output_tokens)} tok</span>
                                                        <span className="text-zinc-700">·</span>
                                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(entry.payload.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-lg font-bold text-zinc-200 flex-shrink-0">{fmtCost(entry.payload.cost, entry.payload.currency)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredEntries.length === 0 && (
                                <div className="text-center py-16 space-y-3">
                                    <Bot className="w-12 h-12 text-zinc-800 mx-auto" />
                                    <p className="text-zinc-600 text-sm">{entries.length === 0 ? "No usage data yet. Add a provider and sync." : "No entries match your filters."}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* ─── SETUP GUIDES ───────────────────────────────────────── */}
                {tab === "guides" && (
                    <motion.div key="guides" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                        <div className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/30 flex items-start gap-3">
                            <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                            <div className="space-y-2">
                                <p className="text-sm text-zinc-200 font-medium">Provider Setup Guides</p>
                                <p className="text-xs text-zinc-500">Step-by-step instructions to get Admin API keys for automatic usage tracking.</p>
                                <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                                    <p className="text-xs text-warning font-semibold mb-1">What this tracks vs. what it does not</p>
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        This module tracks <span className="text-zinc-200 font-medium">developer API usage</span> — calls made with <code className="text-accent">sk-ant-...</code> / <code className="text-accent">sk-...</code> keys from code, Claude Code CLI, or apps.
                                        It does <span className="text-danger font-medium">not</span> track Claude.ai / ChatGPT web or app sessions — those are separate consumer products with no public usage API.
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-2">
                                        If you use <strong className="text-zinc-300">Claude Code</strong>: your usage appears here automatically once you configure the Admin key from the same org as your Claude Code API key.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {(Object.entries(PROVIDER_META) as [SupportedProvider, typeof PROVIDER_META.openai][]).map(([provider, config]) => {
                            const isExpanded = expandedGuide === provider;
                            return (
                                <div key={provider} className={cn("rounded-2xl border transition-all overflow-hidden",
                                    isExpanded ? cn(config.border, "bg-zinc-900/50") : "border-zinc-800/50 bg-zinc-900/20 hover:border-zinc-700/50")}>
                                    <button onClick={() => setExpandedGuide(isExpanded ? null : provider)} className="w-full p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", config.bg, config.border)}>
                                                <Bot className={cn("w-5 h-5", config.color)} />
                                            </div>
                                            <div className="text-left">
                                                <p className={cn("text-sm font-bold", config.color)}>{config.name}</p>
                                                <p className="text-xs text-zinc-500">{config.description} — Requires Admin API key</p>
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronDown className="w-5 h-5 text-zinc-500" /> : <ChevronRight className="w-5 h-5 text-zinc-500" />}
                                    </button>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                                <div className="px-4 pb-5 space-y-5">
                                                    {/* Steps */}
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600">Setup Steps</p>
                                                        <ol className="space-y-2">
                                                            {config.setupSteps.map((step, i) => (
                                                                <li key={i} className="flex items-start gap-3">
                                                                    <span className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5", config.bg, config.color)}>{i + 1}</span>
                                                                    <span className="text-sm text-zinc-300">{step}</span>
                                                                </li>
                                                            ))}
                                                        </ol>
                                                    </div>

                                                    {/* Plans Table */}
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600">Available Plans & Rate Limits</p>
                                                        <div className="rounded-xl border border-zinc-800/50 overflow-hidden">
                                                            <table className="w-full text-xs">
                                                                <thead>
                                                                    <tr className="bg-zinc-800/30">
                                                                        <th className="text-left px-3 py-2 text-zinc-500 font-bold uppercase tracking-wider">Plan</th>
                                                                        <th className="text-left px-3 py-2 text-zinc-500 font-bold uppercase tracking-wider">Rate Limit</th>
                                                                        <th className="text-left px-3 py-2 text-zinc-500 font-bold uppercase tracking-wider">Spend Limit</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {config.plans.map((pl) => (
                                                                        <tr key={pl.name} className="border-t border-zinc-800/30">
                                                                            <td className="px-3 py-2 text-zinc-300 font-medium">{pl.name}</td>
                                                                            <td className="px-3 py-2 text-zinc-400 font-mono">{pl.rateLimit}</td>
                                                                            <td className="px-3 py-2 text-zinc-400">{pl.monthlyLimit}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>

                                                    {/* Links */}
                                                    <div className="flex gap-3 flex-wrap">
                                                        <a href={config.docsUrl} target="_blank" rel="noopener noreferrer"
                                                            className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all hover:opacity-80", config.border, config.color, config.bg)}>
                                                            <BookOpen className="w-3.5 h-3.5" /> API Docs <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                        <a href={config.apiKeyUrl} target="_blank" rel="noopener noreferrer"
                                                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 transition-all">
                                                            <Zap className="w-3.5 h-3.5" /> Get Admin Key <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                        <a href={config.usageDashboardUrl} target="_blank" rel="noopener noreferrer"
                                                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 transition-all">
                                                            <BarChart3 className="w-3.5 h-3.5" /> Usage Dashboard <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    </div>

                                                    {/* Env var */}
                                                    <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/50 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 mb-1">Environment Variable</p>
                                                            <code className="text-xs text-zinc-400 font-mono">{config.envVar}=sk-...</code>
                                                        </div>
                                                        <button onClick={() => copyToClipboard(config.envVar)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-zinc-400 transition-colors">
                                                            {copiedText === config.envVar ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}

                        {/* Unsupported */}
                        <div className="pt-4 space-y-3">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600">Other Providers — Manual Dashboard Links</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {Object.entries(UNSUPPORTED_PROVIDERS).map(([key, cfg]) => (
                                    <a key={key} href={cfg.dashboardUrl} target="_blank" rel="noopener noreferrer"
                                        className="p-3 rounded-xl border border-zinc-800/30 bg-zinc-950/20 hover:border-zinc-700/50 transition-all flex items-center justify-between group">
                                        <div>
                                            <span className={cn("text-xs font-bold", cfg.color)}>{cfg.name}</span>
                                            <p className="text-[10px] text-zinc-700 mt-0.5">{cfg.reason}</p>
                                        </div>
                                        <ExternalLink className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent, accentBg }: {
    label: string; value: string; sub?: string; icon: typeof DollarSign; accent: string; accentBg: string;
}) {
    return (
        <div className="p-4 rounded-2xl border border-zinc-800/50 bg-zinc-900/30 relative overflow-hidden hover:border-zinc-700/50 transition-all group">
            <div className={cn("absolute top-3 right-3 w-9 h-9 rounded-xl flex items-center justify-center", accentBg)}>
                <Icon className={cn("w-4 h-4", accent)} />
            </div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 mb-1.5">{label}</p>
            <p className="text-2xl font-bold text-zinc-100 tracking-tight">{value}</p>
            {sub && <p className="text-[10px] text-zinc-600 mt-1">{sub}</p>}
        </div>
    );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
    return (
        <div className="text-center py-20 space-y-6">
            <div className="relative mx-auto w-fit">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center mx-auto">
                    <Bot className="w-10 h-10 text-accent/80" />
                </div>
                <div className="absolute -right-1 -bottom-1 w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5 text-zinc-500" />
                </div>
            </div>
            <div>
                <h3 className="text-xl font-bold text-zinc-200">Connect Your AI Providers</h3>
                <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto leading-relaxed">
                    Add your OpenAI or Anthropic Admin API key to automatically track usage, costs, token consumption, and model breakdowns — all in one place.
                </p>
            </div>
            <div className="flex items-center justify-center gap-3">
                <button onClick={onAdd}
                    className="h-11 px-6 rounded-xl bg-accent text-zinc-950 text-sm font-bold hover:opacity-90 transition-opacity inline-flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Your First Provider
                </button>
            </div>
            <div className="flex items-center justify-center gap-6 pt-2">
                <div className="flex items-center gap-2 text-success/60">
                    <Bot className="w-4 h-4" /> <span className="text-xs font-semibold">OpenAI</span>
                </div>
                <div className="flex items-center gap-2 text-orange-400/60">
                    <Bot className="w-4 h-4" /> <span className="text-xs font-semibold">Anthropic</span>
                </div>
            </div>
        </div>
    );
}

function EmptyChart({ text }: { text: string }) {
    return <p className="text-zinc-600 text-sm text-center py-8">{text}</p>;
}
