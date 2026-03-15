"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Plus,
    Trash2,
    X,
    BookOpen,
    ExternalLink,
    Check,
    ArrowUpCircle,
    ArrowRightCircle,
    ArrowDownCircle,
    Settings,
    Search,
    RefreshCw,
    Pencil,
    Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useModuleSettings } from "@/hooks/useModuleSettings";

const DEFAULT_TYPES = ["article", "paper", "video", "podcast"] as const;
const PRIORITIES = ["high", "medium", "low"] as const;
const PRIORITY_STYLES: Record<string, string> = {
    high: "bg-danger/15 text-danger border-danger/25",
    medium: "bg-warning/15 text-warning border-warning/25",
    low: "bg-success/15 text-success border-success/25",
};
const PRIORITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    high: ArrowUpCircle,
    medium: ArrowRightCircle,
    low: ArrowDownCircle,
};

interface ReadingItem {
    _id: string;
    created_at: string;
    payload: {
        url: string;
        title: string;
        source_domain?: string;
        priority: string;
        type: string;
        is_read: boolean;
        notes?: string;
        read_at?: string;
        tags?: string[];
    };
}

function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.replace("www.", "");
    } catch {
        return "";
    }
}

function formatDate(iso?: string) {
    if (!iso) return "";
    const date = new Date(iso);
    if (!Number.isFinite(date.getTime())) return "";
    return date.toLocaleDateString();
}

const READING_DEFAULTS = {
    defaultPriority: "medium",
    defaultType: "article",
    types: ["article", "paper", "video", "podcast"],
};

export default function ReadingAdminView() {
    const { settings, updateSettings, saving: settingsSaving } = useModuleSettings("readingSettings", READING_DEFAULTS);

    const [showSettings, setShowSettings] = useState(false);
    const [newType, setNewType] = useState("");
    const [items, setItems] = useState<ReadingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const [statusFilter, setStatusFilter] = useState<string>("unread");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [tagFilter, setTagFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const [url, setUrl] = useState("");
    const [title, setTitle] = useState("");
    const [priority, setPriority] = useState<string>(settings.defaultPriority);
    const [type, setType] = useState<string>(settings.defaultType);
    const [notes, setNotes] = useState("");
    const [tags, setTags] = useState("");
    const [formError, setFormError] = useState("");

    const [editingId, setEditingId] = useState<string | null>(null);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTogglingId, setIsTogglingId] = useState<string | null>(null);

    const allTypes = useMemo(() => {
        const configured = Array.isArray(settings.types) ? settings.types : [];
        return configured.length > 0 ? configured : [...DEFAULT_TYPES];
    }, [settings.types]);

    const allUniqueTags = useMemo(() => {
        const tags = new Set<string>();
        items.forEach((item) => {
            item.payload.tags?.forEach((tag) => tags.add(tag));
        });
        return Array.from(tags).sort();
    }, [items]);

    const fetchItems = useCallback(async () => {
        try {
            const response = await fetch("/api/content?module_type=reading_item");
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to fetch items");
            setItems(data.data || []);
        } catch (err: unknown) {
            console.error("fetchItems failed:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const resetForm = () => {
        setUrl("");
        setTitle("");
        setPriority(settings.defaultPriority);
        setType(settings.defaultType);
        setNotes("");
        setTags("");
        setFormError("");
        setEditingId(null);
        setShowForm(false);
    };

    const handleUrlPaste = (value: string) => {
        setUrl(value);
        if (!title.trim() && !editingId) {
            const domain = extractDomain(value);
            if (domain) setTitle(domain);
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!url.trim()) {
            setFormError("URL required");
            return;
        }
        if (!title.trim()) {
            setFormError("Title required");
            return;
        }

        const payload = {
            url: url.trim(),
            title: title.trim(),
            source_domain: extractDomain(url),
            priority,
            type,
            is_read: false,
            notes: notes.trim() || undefined,
            tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        };

        setIsSubmitting(true);
        setFormError("");
        try {
            const method = editingId ? "PUT" : "POST";
            const endpoint = editingId ? `/api/content/${editingId}` : "/api/content";

            const res = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ module_type: "reading_item", is_public: false, payload }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Failed to ${editingId ? "update" : "save"} item`);

            resetForm();
            await fetchItems();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to save";
            setFormError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleRead = async (item: ReadingItem) => {
        setIsTogglingId(item._id);
        try {
            const payload = {
                ...item.payload,
                is_read: !item.payload.is_read,
                read_at: !item.payload.is_read ? new Date().toISOString() : undefined,
            };

            const res = await fetch(`/api/content/${item._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payload }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update item");
            await fetchItems();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to toggle status";
            alert(message);
        } finally {
            setIsTogglingId(null);
        }
    };
    
    const handleEdit = (item: ReadingItem) => {
        setEditingId(item._id);
        setUrl(item.payload.url);
        setTitle(item.payload.title);
        setPriority(item.payload.priority);
        setType(item.payload.type);
        setNotes(item.payload.notes || "");
        setTags(item.payload.tags?.join(", ") || "");
        setShowForm(true);
        // Scroll to form
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this item?")) return;
        setIsDeletingId(id);
        try {
            const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Delete failed");
            await fetchItems();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to delete";
            alert(message);
        } finally {
            setIsDeletingId(null);
        }
    };

    const filtered = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

        return [...items]
            .filter((item) => {
                if (statusFilter === "unread" && item.payload.is_read) return false;
                if (statusFilter === "read" && !item.payload.is_read) return false;
                if (typeFilter !== "all" && item.payload.type !== typeFilter) return false;
                if (tagFilter !== "all" && !item.payload.tags?.includes(tagFilter)) return false;
                if (!query) return true;

                const tagsString = (item.payload.tags || []).join(" ");
                const haystack = `${item.payload.title} ${item.payload.source_domain || ""} ${item.payload.type} ${item.payload.notes || ""} ${tagsString}`.toLowerCase();
                return haystack.includes(query);
            })
            .sort((a, b) => {
                const prioritySort = (priorityOrder[a.payload.priority] ?? 1) - (priorityOrder[b.payload.priority] ?? 1);
                if (prioritySort !== 0) return prioritySort;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
    }, [items, statusFilter, typeFilter, searchQuery, tagFilter]);

    const stats = useMemo(() => {
        const total = items.length;
        const unread = items.filter((item) => !item.payload.is_read).length;
        const highPriorityUnread = items.filter((item) => !item.payload.is_read && item.payload.priority === "high").length;
        const read = items.filter((item) => item.payload.is_read).length;
        const readRate = total > 0 ? (read / total) * 100 : 0;

        return {
            total,
            unread,
            highPriorityUnread,
            read,
            readRate,
        };
    }, [items]);

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
                <div className="absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

                <div className="relative space-y-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Reading Queue</h1>
                            <p className="text-zinc-400 mt-1">Capture links, prioritize what matters, and maintain a clean learning backlog.</p>
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
                                <Plus className="w-4 h-4" /> Add Item
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Total</p>
                            <p className="text-lg font-semibold text-zinc-50">{stats.total}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Unread</p>
                            <p className="text-lg font-semibold text-zinc-50">{stats.unread}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">High Priority</p>
                            <p className="text-lg font-semibold text-danger">{stats.highPriorityUnread}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Completed</p>
                            <p className="text-lg font-semibold text-success">{stats.read}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Read Rate</p>
                            <p className="text-lg font-semibold text-zinc-50">{stats.readRate.toFixed(0)}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {showSettings && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-fade-in-up space-y-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-zinc-50">Reading Settings</h2>
                        {settingsSaving && (
                            <span className="text-xs text-accent flex items-center gap-1">
                                <Check className="w-3 h-3" /> Saved
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="reading-default-priority" className="block text-xs text-zinc-500 mb-1.5">Default Priority</label>
                            <select
                                id="reading-default-priority"
                                value={settings.defaultPriority}
                                onChange={(event) => updateSettings({ defaultPriority: event.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                            >
                                {PRIORITIES.map((item) => (
                                    <option key={item} value={item}>
                                        {item.charAt(0).toUpperCase() + item.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="reading-default-type" className="block text-xs text-zinc-500 mb-1.5">Default Type</label>
                            <select
                                id="reading-default-type"
                                value={settings.defaultType}
                                onChange={(event) => updateSettings({ defaultType: event.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                            >
                                {allTypes.map((item) => (
                                    <option key={item} value={item}>
                                        {item.charAt(0).toUpperCase() + item.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-zinc-500 mb-2">Content Types</label>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {allTypes.map((item) => (
                                <span key={item} className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 capitalize">
                                    {item}
                                    <button
                                        onClick={() => updateSettings({ types: allTypes.filter((typeItem) => typeItem !== item) })}
                                        className="text-zinc-500 hover:text-danger ml-0.5"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                id="new-type-input"
                                type="text"
                                value={newType}
                                onChange={(event) => setNewType(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        const normalized = newType.trim().toLowerCase();
                                        if (normalized && !allTypes.includes(normalized)) {
                                            updateSettings({ types: [...allTypes, normalized] });
                                            setNewType("");
                                        }
                                    }
                                }}
                                placeholder="New type"
                                aria-label="New content type"
                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                            <button
                                onClick={() => {
                                    const normalized = newType.trim().toLowerCase();
                                    if (normalized && !allTypes.includes(normalized)) {
                                        updateSettings({ types: [...allTypes, normalized] });
                                        setNewType("");
                                    }
                                }}
                                disabled={!newType.trim()}
                                className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-fade-in-up">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-zinc-50">
                            {editingId ? "Edit Reading Item" : "Add to Reading Queue"}
                        </h2>
                        <button onClick={resetForm} className="text-zinc-500 hover:text-zinc-300">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label htmlFor="reading-url" className="block text-xs text-zinc-500 mb-1.5">URL</label>
                            <input
                                id="reading-url"
                                type="url"
                                value={url}
                                onChange={(event) => handleUrlPaste(event.target.value)}
                                placeholder="https://..."
                                autoFocus
                                disabled={isSubmitting}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                        </div>
                        <div>
                            <label htmlFor="reading-title" className="block text-xs text-zinc-500 mb-1.5">Title</label>
                            <input
                                id="reading-title"
                                type="text"
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                placeholder="Readable title"
                                disabled={isSubmitting}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label htmlFor="reading-priority" className="block text-xs text-zinc-500 mb-1.5">Priority</label>
                                <select
                                    id="reading-priority"
                                    value={priority}
                                    onChange={(event) => setPriority(event.target.value)}
                                    disabled={isSubmitting}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                >
                                    {PRIORITIES.map((item) => (
                                        <option key={item} value={item}>
                                            {item.charAt(0).toUpperCase() + item.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label htmlFor="reading-type" className="block text-xs text-zinc-500 mb-1.5">Type</label>
                                <select
                                    id="reading-type"
                                    value={type}
                                    onChange={(event) => setType(event.target.value)}
                                    disabled={isSubmitting}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                >
                                    {allTypes.map((item) => (
                                        <option key={item} value={item}>
                                            {item.charAt(0).toUpperCase() + item.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="reading-notes" className="block text-xs text-zinc-500 mb-1.5">Notes (optional)</label>
                            <textarea
                                id="reading-notes"
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                                rows={2}
                                placeholder="Why this matters"
                                disabled={isSubmitting}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="reading-tags" className="block text-xs text-zinc-500 mb-1.5">Tags (optional, comma separated)</label>
                            <input
                                id="reading-tags"
                                type="text"
                                value={tags}
                                onChange={(event) => setTags(event.target.value)}
                                placeholder="e.g. AI, Development, Research"
                                disabled={isSubmitting}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3">
                            {formError && <span className="text-danger text-xs self-center">{formError}</span>}
                             <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-accent hover:bg-accent-hover text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSubmitting ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : editingId ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <Plus className="w-4 h-4" />
                                )}
                                {isSubmitting ? (editingId ? "Updating..." : "Adding...") : editingId ? "Update" : "Add"}
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
                            placeholder="Search title, domain, notes"
                            aria-label="Search reading queue"
                            className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35"
                        />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {[
                            { key: "unread", label: "Unread" },
                            { key: "read", label: "Read" },
                            { key: "all", label: "All" },
                        ].map((item) => (
                            <button
                                key={item.key}
                                onClick={() => setStatusFilter(item.key)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                    statusFilter === item.key
                                        ? "bg-accent/15 border-accent/35 text-accent"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                                )}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setTypeFilter("all")}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                typeFilter === "all"
                                    ? "bg-accent/15 border-accent/35 text-accent"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                            )}
                        >
                            All Types
                        </button>
                        {allTypes.map((item) => (
                            <button
                                key={item}
                                onClick={() => setTypeFilter(item)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs capitalize border transition-colors",
                                    typeFilter === item
                                        ? "bg-accent/15 border-accent/35 text-accent"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                                )}
                            >
                                {item}
                            </button>
                        ))}
                    </div>

                    {allUniqueTags.length > 0 && (
                        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50 flex-wrap">
                            <div className="flex items-center gap-1.5 pr-2 border-r border-zinc-800/50">
                                <Tag className="w-3 h-3 text-zinc-500" />
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Tags</span>
                            </div>
                            <button
                                onClick={() => setTagFilter("all")}
                                className={cn(
                                    "px-2.5 py-1 rounded-lg text-xs border transition-colors",
                                    tagFilter === "all"
                                        ? "bg-accent/15 border-accent/35 text-accent"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                                )}
                            >
                                All Tags
                            </button>
                            {allUniqueTags.map((tag) => (
                                <button
                                    key={tag}
                                    onClick={() => setTagFilter(tag)}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs border transition-colors",
                                        tagFilter === tag
                                            ? "bg-accent/15 border-accent/35 text-accent"
                                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                                    )}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                    <RefreshCw className="w-8 h-8 animate-spin text-accent mb-3" />
                    <span>Loading queue...</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center text-zinc-500 py-14 border border-zinc-800 rounded-2xl bg-zinc-900/40">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Queue is empty for current filters.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((item) => {
                        const PriorityIcon = PRIORITY_ICONS[item.payload.priority] || ArrowRightCircle;

                        return (
                            <article
                                key={item._id}
                                className={cn(
                                    "bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors group",
                                    item.payload.is_read && "opacity-60"
                                )}
                            >
                                <button
                                    onClick={() => toggleRead(item)}
                                    disabled={isTogglingId === item._id}
                                    className={cn(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors disabled:opacity-50",
                                        item.payload.is_read
                                            ? "border-success bg-success/15 text-success"
                                            : "border-zinc-600 hover:border-zinc-400"
                                    )}
                                    aria-label={item.payload.is_read ? "Mark as unread" : "Mark as read"}
                                >
                                    {isTogglingId === item._id ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        item.payload.is_read && <Check className="w-3.5 h-3.5" />
                                    )}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <p className={cn("text-sm font-medium truncate", item.payload.is_read ? "text-zinc-500 line-through" : "text-zinc-50")}>
                                            {item.payload.title}
                                        </p>
                                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium inline-flex items-center gap-1", PRIORITY_STYLES[item.payload.priority])}>
                                            <PriorityIcon className="w-3 h-3" /> {item.payload.priority}
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-400 capitalize">
                                            {item.payload.type}
                                        </span>
                                        {item.payload.tags?.map((tag) => (
                                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded border border-accent/20 bg-accent/5 text-accent/80">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
                                        {item.payload.source_domain && <span>{item.payload.source_domain}</span>}
                                        <span>Added {formatDate(item.created_at)}</span>
                                        {item.payload.read_at && item.payload.is_read && <span>Read {formatDate(item.payload.read_at)}</span>}
                                    </div>

                                    {item.payload.notes && <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{item.payload.notes}</p>}
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-md hover:bg-zinc-800"
                                        aria-label={`Edit ${item.payload.title}`}
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <a
                                        href={item.payload.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-md hover:bg-zinc-800"
                                        aria-label={`Open ${item.payload.title}`}
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                    <button
                                        onClick={() => handleDelete(item._id)}
                                        disabled={isDeletingId === item._id}
                                        className="p-1.5 text-zinc-500 hover:text-danger rounded-md hover:bg-zinc-800 disabled:opacity-50"
                                        aria-label={`Delete ${item.payload.title}`}
                                    >
                                        {isDeletingId === item._id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
