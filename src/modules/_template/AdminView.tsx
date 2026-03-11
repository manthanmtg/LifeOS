"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Plus, Trash2, X, Search, Settings, RefreshCw, Check,
    Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useModuleSettings } from "@/hooks/useModuleSettings";

/**
 * BEST PRACTICE TEMPLATE FOR NEW MODULES
 * Use this as a starting point for creating new AdminView components.
 * It includes:
 * - Granular loading states (isLoading, isSubmitting, isProcessingId)
 * - Standardized error handling
 * - Accessibility (ARIA labels, explicit IDs)
 * - Search and Filter patterns
 * - Stats overview
 * - Settings integration
 */

interface TemplateItem {
    _id: string;
    created_at: string;
    payload: {
        name: string;
        description?: string;
        category: string;
        is_active: boolean;
    };
}

interface TemplateSettings {
    [key: string]: unknown;
    categories: string[];
    defaultCategory: string;
}

const DEFAULT_SETTINGS: TemplateSettings = {
    categories: ["General", "Work", "Personal"],
    defaultCategory: "General",
};

export default function TemplateAdminView() {
    // 1. Module Settings
    const { settings, saving: settingsSaving } = useModuleSettings<TemplateSettings>("templateSettings", DEFAULT_SETTINGS);
    const [showSettings, setShowSettings] = useState(false);

    // 2. Core State
    const [items, setItems] = useState<TemplateItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

    // 3. UI State
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // 4. Form State
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState(settings.defaultCategory);
    const [isActive, setIsActive] = useState(true);
    const [formError, setFormError] = useState("");

    // 5. Data Fetching
    const fetchItems = useCallback(async () => {
        try {
            const response = await fetch("/api/content?module_type=template");
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

    // 6. Action Handlers
    const resetForm = () => {
        setName("");
        setDescription("");
        setCategory(settings.defaultCategory);
        setIsActive(true);
        setEditingId(null);
        setFormError("");
        setShowForm(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        if (!name.trim()) { setFormError("Name requested"); return; }

        setIsSubmitting(true);
        try {
            const payload = {
                name: name.trim(),
                description: description.trim() || undefined,
                category,
                is_active: isActive,
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
                    body: JSON.stringify({ module_type: "template", is_public: false, payload }),
                });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to save");

            resetForm();
            await fetchItems();
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this item?")) return;
        setIsProcessingId(id);
        try {
            const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Delete failed");
            await fetchItems();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Delete failed");
        } finally {
            setIsProcessingId(null);
        }
    };

    // 7. Filtering & Memoized Stats
    const filteredItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return items.filter((item) => {
            if (!query) return true;
            return item.payload.name.toLowerCase().includes(query) ||
                item.payload.description?.toLowerCase().includes(query);
        });
    }, [items, searchQuery]);

    // 8. Visual Components
    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header & Stats Section */}
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-accent/20 blur-3xl opacity-50" />
                <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Module Template</h1>
                        <p className="text-zinc-400 mt-1">A playground for standardized features and accessibility.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            aria-label="Toggle settings"
                            className={cn("p-2.5 rounded-xl transition-colors", showSettings ? "bg-accent/15 text-accent" : "bg-zinc-800 text-zinc-400 hover:text-zinc-300")}
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => { resetForm(); setShowForm(true); }}
                            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
                        >
                            <Plus className="w-4 h-4" /> New Item
                        </button>
                    </div>
                </div>
            </div>

            {/* Settings & Admin Controls */}
            {showSettings && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-fade-in-up space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-zinc-50">Module Settings</h2>
                        {settingsSaving && <span className="text-xs text-accent flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Saving...</span>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Add settings controls here */}
                    </div>
                </div>
            )}

            {/* Main Form */}
            {showForm && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-fade-in-up">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-zinc-50">{editingId ? "Edit" : "Add New"} Item</h2>
                        <button onClick={resetForm} className="text-zinc-500 hover:text-zinc-300" aria-label="Close form"><X className="w-5 h-5" /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label htmlFor="form-name" className="text-xs text-zinc-500">Name</label>
                            <input
                                id="form-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isSubmitting}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                        </div>
                        {/* Additional fields... */}
                        <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                            {formError && <span className="text-red-400 text-xs self-center">{formError}</span>}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-accent hover:bg-accent-hover text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                {isSubmitting ? "Saving..." : (editingId ? "Update" : "Create")}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List & Filtering */}
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[280px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search items..."
                            aria-label="Search items"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                        <RefreshCw className="w-10 h-10 animate-spin text-accent mb-4" />
                        <p className="text-sm">Fetching records...</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-20 border border-zinc-800 rounded-2xl bg-zinc-900/40">
                        <Info className="w-10 h-10 mx-auto mb-3 opacity-20 text-zinc-400" />
                        <p className="text-zinc-500">No records found matching your filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredItems.map((item) => (
                            <article key={item._id} className="group bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors">
                                <div className="flex items-start justify-between gap-3">
                                    <h4 className="font-semibold text-zinc-50 truncate">{item.payload.name}</h4>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleDelete(item._id)}
                                            disabled={isProcessingId === item._id}
                                            className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800 disabled:opacity-50"
                                            aria-label="Delete item"
                                        >
                                            {isProcessingId === item._id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
