"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Plus,
    Trash2,
    Edit3,
    X,
    Code,
    Copy,
    Check,
    Star,
    Search,
    Settings,
    Filter,
    RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useModuleSettings } from "@/hooks/useModuleSettings";

const LANGUAGES = [
    "javascript",
    "typescript",
    "python",
    "rust",
    "go",
    "java",
    "c",
    "cpp",
    "html",
    "css",
    "sql",
    "bash",
    "json",
    "yaml",
    "markdown",
    "other",
];

interface Snippet {
    _id: string;
    created_at: string;
    payload: {
        title: string;
        code: string;
        language: string;
        description?: string;
        tags: string[];
        is_favorite: boolean;
    };
}

const SNIPPET_DEFAULTS = {
    defaultLanguage: "javascript",
    languages: LANGUAGES,
    showLineNumbers: false,
};

function formatDate(iso: string) {
    const date = new Date(iso);
    if (!Number.isFinite(date.getTime())) return "";
    return date.toLocaleDateString();
}

function withLineNumbers(code: string) {
    return code
        .split("\n")
        .map((line, index) => `${String(index + 1).padStart(2, "0")}  ${line}`)
        .join("\n");
}

export default function SnippetsAdminView() {
    const { settings, updateSettings, saving: settingsSaving } = useModuleSettings("snippetSettings", SNIPPET_DEFAULTS);

    const [showSettings, setShowSettings] = useState(false);
    const [newLang, setNewLang] = useState("");
    const [snippets, setSnippets] = useState<Snippet[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [langFilter, setLangFilter] = useState<string>("all");
    const [favoritesOnly, setFavoritesOnly] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

    const [title, setTitle] = useState("");
    const [code, setCode] = useState("");
    const [language, setLanguage] = useState(settings.defaultLanguage);
    const [description, setDescription] = useState("");
    const [tagsInput, setTagsInput] = useState("");
    const [isFavorite, setIsFavorite] = useState(false);
    const [formError, setFormError] = useState("");

    const configuredLanguages = useMemo(() => {
        return Array.isArray(settings.languages) && settings.languages.length > 0 ? settings.languages : LANGUAGES;
    }, [settings.languages]);

    const fetchSnippets = useCallback(async () => {
        try {
            const response = await fetch("/api/content?module_type=snippet");
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to fetch snippets");
            setSnippets(data.data || []);
        } catch (err: unknown) {
            console.error("fetchSnippets failed:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSnippets();
    }, [fetchSnippets]);

    const resetForm = () => {
        setTitle("");
        setCode("");
        setLanguage(settings.defaultLanguage);
        setDescription("");
        setTagsInput("");
        setIsFavorite(false);
        setEditingId(null);
        setFormError("");
        setShowForm(false);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setFormError("");
        if (!title.trim()) { setFormError("Title required"); return; }
        if (!code.trim()) { setFormError("Code required"); return; }

        setIsSubmitting(true);
        try {
            const payload = {
                title: title.trim(),
                code,
                language,
                description: description.trim() || undefined,
                tags: tagsInput
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                is_favorite: isFavorite,
            };

            const response = editingId
                ? await fetch(`/api/content/${editingId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ payload }),
                })
                : await fetch("/api/content", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ module_type: "snippet", is_public: false, payload }),
                });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to save snippet");

            resetForm();
            await fetchSnippets();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to save";
            setFormError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (snippet: Snippet) => {
        setTitle(snippet.payload.title);
        setCode(snippet.payload.code);
        setLanguage(snippet.payload.language);
        setDescription(snippet.payload.description || "");
        setTagsInput(snippet.payload.tags.join(", "));
        setIsFavorite(snippet.payload.is_favorite);
        setEditingId(snippet._id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this snippet?")) return;
        setIsProcessingId(id);
        try {
            const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Delete failed");
            await fetchSnippets();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to delete";
            alert(message);
        } finally {
            setIsProcessingId(null);
        }
    };

    const handleCopy = async (id: string, snippetCode: string) => {
        await navigator.clipboard.writeText(snippetCode);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1800);
    };

    const toggleFavorite = async (snippet: Snippet) => {
        setIsProcessingId(snippet._id);
        try {
            const payload = { ...snippet.payload, is_favorite: !snippet.payload.is_favorite };
            const res = await fetch(`/api/content/${snippet._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payload }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update favorite");
            await fetchSnippets();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to update";
            alert(message);
        } finally {
            setIsProcessingId(null);
        }
    };

    const filtered = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return [...snippets]
            .filter((snippet) => {
                if (langFilter !== "all" && snippet.payload.language !== langFilter) return false;
                if (favoritesOnly && !snippet.payload.is_favorite) return false;
                if (!query) return true;

                const haystack = `${snippet.payload.title} ${snippet.payload.code} ${snippet.payload.description || ""} ${snippet.payload.tags.join(" ")}`.toLowerCase();
                return haystack.includes(query);
            })
            .sort((a, b) => {
                if (a.payload.is_favorite !== b.payload.is_favorite) {
                    return a.payload.is_favorite ? -1 : 1;
                }
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
    }, [snippets, langFilter, favoritesOnly, searchQuery]);

    const stats = useMemo(() => {
        const total = snippets.length;
        const favorites = snippets.filter((snippet) => snippet.payload.is_favorite).length;
        const languages = new Set(snippets.map((snippet) => snippet.payload.language)).size;
        const averageLength = snippets.length > 0
            ? Math.round(snippets.reduce((sum, snippet) => sum + snippet.payload.code.split("\n").length, 0) / snippets.length)
            : 0;

        return {
            total,
            favorites,
            languages,
            averageLength,
        };
    }, [snippets]);

    const languageChips = useMemo(() => {
        return [...new Set(snippets.map((snippet) => snippet.payload.language))].sort((a, b) => a.localeCompare(b));
    }, [snippets]);

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
                <div className="absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />

                <div className="relative space-y-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Snippet Box</h1>
                            <p className="text-zinc-400 mt-1">Build a clean, searchable, and reusable code system for your everyday workflow.</p>
                        </div>
                        <div className="flex items-center gap-2 md:pt-1">
                            <button
                                onClick={() => setShowSettings((prev) => !prev)}
                                className={cn(
                                    "px-3 py-2.5 rounded-xl text-sm transition-colors",
                                    showSettings ? "bg-accent/15 text-accent" : "bg-zinc-800 text-zinc-400 hover:text-zinc-300"
                                )}
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => {
                                    resetForm();
                                    setShowForm(true);
                                }}
                                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
                            >
                                <Plus className="w-4 h-4" /> New Snippet
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Snippets</p>
                            <p className="text-lg font-semibold text-zinc-50">{stats.total}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Favorites</p>
                            <p className="text-lg font-semibold text-yellow-300">{stats.favorites}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Languages</p>
                            <p className="text-lg font-semibold text-zinc-50">{stats.languages}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Avg Lines</p>
                            <p className="text-lg font-semibold text-zinc-50">{stats.averageLength}</p>
                        </div>
                    </div>
                </div>
            </div>

            {showSettings && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-fade-in-up space-y-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-zinc-50">Snippet Settings</h2>
                        {settingsSaving && (
                            <span className="text-xs text-accent flex items-center gap-1">
                                <Check className="w-3 h-3" /> Saved
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="settings-default-language" className="block text-xs text-zinc-500 mb-1.5">Default Language</label>
                            <select
                                id="settings-default-language"
                                value={settings.defaultLanguage}
                                onChange={(event) => updateSettings({ defaultLanguage: event.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                            >
                                {configuredLanguages.map((languageItem: string) => (
                                    <option key={languageItem} value={languageItem}>
                                        {languageItem}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <label htmlFor="settings-show-line-numbers" className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer pb-1">
                                <input
                                    id="settings-show-line-numbers"
                                    type="checkbox"
                                    checked={settings.showLineNumbers}
                                    onChange={(event) => updateSettings({ showLineNumbers: event.target.checked })}
                                    className="w-4 h-4 rounded border-zinc-700 accent-accent"
                                />
                                Show line numbers
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-zinc-500 mb-2">Languages</label>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {configuredLanguages.map((languageItem: string) => (
                                <span key={languageItem} className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300">
                                    {languageItem}
                                    <button
                                        onClick={() => updateSettings({ languages: configuredLanguages.filter((item) => item !== languageItem) })}
                                        className="text-zinc-500 hover:text-red-400 ml-0.5"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                id="settings-new-language"
                                type="text"
                                value={newLang}
                                onChange={(event) => setNewLang(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        const normalized = newLang.trim().toLowerCase();
                                        if (normalized && !configuredLanguages.includes(normalized)) {
                                            updateSettings({ languages: [...configuredLanguages, normalized] });
                                            setNewLang("");
                                        }
                                    }
                                }}
                                placeholder="New language"
                                aria-label="Add new language"
                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                            <button
                                onClick={() => {
                                    const normalized = newLang.trim().toLowerCase();
                                    if (normalized && !configuredLanguages.includes(normalized)) {
                                        updateSettings({ languages: [...configuredLanguages, normalized] });
                                        setNewLang("");
                                    }
                                }}
                                disabled={!newLang.trim()}
                                className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-fade-in-up space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-zinc-50">{editingId ? "Edit" : "New"} Snippet</h2>
                        <button onClick={resetForm} className="text-zinc-500 hover:text-zinc-300">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="snippet-title" className="block text-xs text-zinc-500 mb-1.5">Title</label>
                                <input
                                    id="snippet-title"
                                    type="text"
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                    placeholder="Snippet name"
                                    autoFocus
                                    disabled={isSubmitting}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                />
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label htmlFor="snippet-language" className="block text-xs text-zinc-500 mb-1.5">Language</label>
                                    <select
                                        id="snippet-language"
                                        value={language}
                                        onChange={(event) => setLanguage(event.target.value)}
                                        disabled={isSubmitting}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                    >
                                        {configuredLanguages.map((languageItem: string) => (
                                            <option key={languageItem} value={languageItem}>
                                                {languageItem}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-end pb-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setIsFavorite((prev) => !prev)}
                                        disabled={isSubmitting}
                                        className={cn(
                                            "p-2.5 rounded-lg transition-colors disabled:opacity-50",
                                            isFavorite ? "text-yellow-400 bg-yellow-400/10" : "text-zinc-500 bg-zinc-800"
                                        )}
                                        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                                        aria-pressed={isFavorite}
                                    >
                                        <Star className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="snippet-code" className="block text-xs text-zinc-500 mb-1.5">Code</label>
                            <textarea
                                id="snippet-code"
                                value={code}
                                onChange={(event) => setCode(event.target.value)}
                                rows={12}
                                placeholder="Paste your code"
                                disabled={isSubmitting}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 font-mono resize-y"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="snippet-description" className="block text-xs text-zinc-500 mb-1.5">Description</label>
                                <input
                                    id="snippet-description"
                                    type="text"
                                    value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                    placeholder="What this solves"
                                    disabled={isSubmitting}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                />
                            </div>
                            <div>
                                <label htmlFor="snippet-tags" className="block text-xs text-zinc-500 mb-1.5">Tags</label>
                                <input
                                    id="snippet-tags"
                                    type="text"
                                    value={tagsInput}
                                    onChange={(event) => setTagsInput(event.target.value)}
                                    placeholder="util, api, hook"
                                    disabled={isSubmitting}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                />
                            </div>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                            <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500 mb-2">Preview</p>
                            <pre className="text-xs text-zinc-300 font-mono overflow-x-auto max-h-[180px] overflow-y-auto">
                                <code>{settings.showLineNumbers ? withLineNumbers(code || "") : code || "// your snippet preview"}</code>
                            </pre>
                        </div>

                        <div className="flex justify-end gap-3">
                            {formError && <span className="text-red-400 text-xs self-center">{formError}</span>}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-accent hover:bg-accent-hover text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : (editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
                                {isSubmitting ? "Saving..." : (editingId ? "Update" : "Save")}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search title, code, tags"
                            className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35"
                        />
                    </div>

                    <button
                        onClick={() => setFavoritesOnly((prev) => !prev)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs border transition-colors inline-flex items-center gap-1.5",
                            favoritesOnly
                                ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-300"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                        )}
                    >
                        <Filter className="w-3.5 h-3.5" /> Favorites
                    </button>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setLangFilter("all")}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                langFilter === "all"
                                    ? "bg-accent/15 border-accent/35 text-accent"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                            )}
                        >
                            All
                        </button>
                        {languageChips.map((languageItem) => (
                            <button
                                key={languageItem}
                                onClick={() => setLangFilter(languageItem)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                    langFilter === languageItem
                                        ? "bg-accent/15 border-accent/35 text-accent"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                                )}
                            >
                                {languageItem}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
                    <RefreshCw className="w-10 h-10 animate-spin text-accent mb-4" />
                    <p className="text-sm">Fetching and indexing snippets...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center text-zinc-500 py-14 border border-zinc-800 rounded-2xl bg-zinc-900/40">
                    <Code className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No snippets found for current filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {filtered.map((snippet) => (
                        <article key={snippet._id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-colors">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                                <div className="flex items-center gap-2 min-w-0">
                                    {snippet.payload.is_favorite && <Star className="w-3.5 h-3.5 text-yellow-400 shrink-0" fill="currentColor" />}
                                    <p className="text-sm font-medium text-zinc-50 truncate">{snippet.payload.title}</p>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">{snippet.payload.language}</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button
                                        onClick={() => handleCopy(snippet._id, snippet.payload.code)}
                                        className={cn(
                                            "p-1.5 rounded-md transition-colors",
                                            copiedId === snippet._id
                                                ? "text-green-400 bg-green-400/10"
                                                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                                        )}
                                        aria-label="Copy code"
                                    >
                                        {copiedId === snippet._id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                        onClick={() => toggleFavorite(snippet)}
                                        disabled={isProcessingId === snippet._id}
                                        className="p-1.5 text-zinc-500 hover:text-yellow-400 rounded-md hover:bg-zinc-800 disabled:opacity-50"
                                        aria-label={snippet.payload.is_favorite ? "Remove from favorites" : "Add to favorites"}
                                        aria-pressed={snippet.payload.is_favorite}
                                    >
                                        {isProcessingId === snippet._id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" fill={snippet.payload.is_favorite ? "currentColor" : "none"} />}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(snippet)}
                                        disabled={isProcessingId === snippet._id}
                                        className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-md hover:bg-zinc-800 disabled:opacity-50"
                                        aria-label="Edit snippet"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(snippet._id)}
                                        disabled={isProcessingId === snippet._id}
                                        className="p-1.5 text-zinc-500 hover:text-red-400 rounded-md hover:bg-zinc-800 disabled:opacity-50"
                                        aria-label="Delete snippet"
                                    >
                                        {isProcessingId === snippet._id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>

                            <pre className="px-4 py-3 text-xs text-zinc-300 font-mono overflow-x-auto max-h-[220px] overflow-y-auto">
                                <code>{settings.showLineNumbers ? withLineNumbers(snippet.payload.code) : snippet.payload.code}</code>
                            </pre>

                            {(snippet.payload.description || snippet.payload.tags.length > 0) && (
                                <div className="px-4 py-2 border-t border-zinc-800">
                                    {snippet.payload.description && <p className="text-xs text-zinc-500 line-clamp-1">{snippet.payload.description}</p>}
                                    {snippet.payload.tags.length > 0 && (
                                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                            {snippet.payload.tags.slice(0, 5).map((tag) => (
                                                <span key={tag} className="px-1.5 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] rounded">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-[11px] text-zinc-500 mt-2">Updated {formatDate(snippet.created_at)}</p>
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
