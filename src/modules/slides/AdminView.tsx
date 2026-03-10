"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Plus,
    Trash2,
    Edit3,
    X,
    Presentation,
    Search,
    RefreshCw,
    Check,
    Copy,
    Tag,
    Folder,
    Upload,
    Link as LinkIcon,
    ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DeckItem,
    FORMATS,
    VISIBILITIES,
    FORMAT_LABELS,
    FORMAT_STYLES,
    VISIBILITY_LABELS,
    VISIBILITY_STYLES,
} from "./types";

export default function SlidesAdminView() {
    const [items, setItems] = useState<DeckItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

    const [formatFilter, setFormatFilter] = useState<string>("all");
    const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [format, setFormat] = useState<string>("url");
    const [visibility, setVisibility] = useState<string>("private");
    const [tagsInput, setTagsInput] = useState("");
    const [author, setAuthor] = useState("");
    const [topic, setTopic] = useState("");
    const [folder, setFolder] = useState("");
    const [embedEnabled, setEmbedEnabled] = useState(false);
    const [deckUrl, setDeckUrl] = useState("");
    const [thumbnailUrl, setThumbnailUrl] = useState("");
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [formError, setFormError] = useState("");

    const fetchItems = useCallback(async () => {
        try {
            const res = await fetch("/api/content?module_type=deck");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch");
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
        setTitle("");
        setDescription("");
        setFormat("url");
        setVisibility("private");
        setTagsInput("");
        setAuthor("");
        setTopic("");
        setFolder("");
        setEmbedEnabled(false);
        setDeckUrl("");
        setThumbnailUrl("");
        setUploadedFile(null);
        setEditingId(null);
        setFormError("");
        setShowForm(false);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const ext = file.name.split(".").pop()?.toLowerCase();
        const allowedTypes = ["pdf", "ppt", "pptx", "html", "htm"];
        
        if (!ext || !allowedTypes.includes(ext)) {
            setFormError("Please upload a PDF, PowerPoint, or HTML file");
            e.target.value = "";
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setFormError("File too large (max 10MB)");
            e.target.value = "";
            return;
        }

        setUploadedFile(file);
        
        if (ext === "pdf") setFormat("pdf");
        else if (ext === "pptx" || ext === "ppt") setFormat("pptx");
        else if (ext === "html" || ext === "htm") setFormat("html");

        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            setDeckUrl(base64);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setFormError("");

        if (!title.trim()) {
            setFormError("Title is required");
            return;
        }

        if (!deckUrl.trim()) {
            setFormError("Please provide a URL or upload a file");
            return;
        }

        const tags = tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);

        let finalDeckUrl = deckUrl.trim();
        let fileName = uploadedFile?.name;
        let fileSize = uploadedFile?.size;

        const payload: Record<string, unknown> = {
            title: title.trim(),
            description: description.trim() || undefined,
            format,
            visibility,
            tags,
            author: author.trim() || undefined,
            topic: topic.trim() || undefined,
            folder: folder.trim() || undefined,
            deck_url: finalDeckUrl || undefined,
            file_name: fileName || undefined,
            file_size: fileSize || undefined,
            thumbnail_url: thumbnailUrl.trim() || undefined,
            embed_enabled: embedEnabled,
        };

        setIsSubmitting(true);
        try {
            const res = editingId
                ? await fetch(`/api/content/${editingId}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ payload }),
                  })
                : await fetch("/api/content", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                          module_type: "deck",
                          is_public: visibility === "public",
                          payload,
                      }),
                  });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save");

            resetForm();
            await fetchItems();
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (item: DeckItem) => {
        setTitle(item.payload.title);
        setDescription(item.payload.description || "");
        setFormat(item.payload.format);
        setVisibility(item.payload.visibility);
        setTagsInput((item.payload.tags || []).join(", "));
        setAuthor(item.payload.author || "");
        setTopic(item.payload.topic || "");
        setFolder(item.payload.folder || "");
        setEmbedEnabled(item.payload.embed_enabled);
        setDeckUrl(item.payload.deck_url || "");
        setThumbnailUrl(item.payload.thumbnail_url || "");
        setEditingId(item._id);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this deck?")) return;
        setIsDeletingId(id);
        try {
            const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Delete failed");
            await fetchItems();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Delete failed");
        } finally {
            setIsDeletingId(null);
        }
    };

    const copyEmbedCode = (item: DeckItem) => {
        const embedCode = `<iframe src="${window.location.origin}/slides/embed/${item._id}" width="100%" height="500" frameborder="0" allowfullscreen></iframe>`;
        navigator.clipboard.writeText(embedCode);
        alert("Embed code copied to clipboard!");
    };

    const sortedItems = useMemo(() => {
        return [...items].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }, [items]);

    const filtered = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return sortedItems.filter((item) => {
            if (formatFilter !== "all" && item.payload.format !== formatFilter) return false;
            if (visibilityFilter !== "all" && item.payload.visibility !== visibilityFilter) return false;
            if (!query) return true;
            const haystack =
                `${item.payload.title} ${item.payload.description || ""} ${(item.payload.tags || []).join(" ")} ${item.payload.author || ""} ${item.payload.topic || ""}`.toLowerCase();
            return haystack.includes(query);
        });
    }, [sortedItems, formatFilter, visibilityFilter, searchQuery]);

    const stats = useMemo(() => {
        const total = items.length;
        const publicDecks = items.filter((i) => i.payload.visibility === "public").length;
        const folders = new Set(items.map((i) => i.payload.folder).filter(Boolean));
        return { total, publicDecks, folderCount: folders.size };
    }, [items]);

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
                <div className="absolute -bottom-16 left-1/4 h-44 w-44 rounded-full bg-purple-500/10 blur-3xl" />
                <div className="relative space-y-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Slides</h1>
                            <p className="text-zinc-400 mt-1">
                                Upload or link to your presentation decks.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 md:pt-1">
                            <button
                                onClick={() => {
                                    resetForm();
                                    setShowForm(true);
                                }}
                                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
                            >
                                <Plus className="w-4 h-4" /> New Deck
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Total Decks</p>
                            <p className="text-lg font-semibold text-zinc-50">{stats.total}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Public</p>
                            <p className="text-lg font-semibold text-green-300">{stats.publicDecks}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Folders</p>
                            <p className="text-lg font-semibold text-yellow-300">{stats.folderCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {showForm && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-fade-in-up space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-zinc-50">
                            {editingId ? "Edit" : "Create"} Deck
                        </h2>
                        <button onClick={resetForm} className="text-zinc-500 hover:text-zinc-300" aria-label="Close form">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label htmlFor="deck-title" className="block text-xs text-zinc-500 mb-1.5">
                                Title <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="deck-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="My Presentation"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                autoFocus
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="deck-desc" className="block text-xs text-zinc-500 mb-1.5">
                                Description
                            </label>
                            <textarea
                                id="deck-desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                placeholder="Brief description..."
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div>
                            <label htmlFor="deck-format" className="block text-xs text-zinc-500 mb-1.5">
                                Format
                            </label>
                            <select
                                id="deck-format"
                                value={format}
                                onChange={(e) => setFormat(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            >
                                {FORMATS.map((f) => (
                                    <option key={f} value={f}>
                                        {FORMAT_LABELS[f]}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="deck-visibility" className="block text-xs text-zinc-500 mb-1.5">
                                Visibility
                            </label>
                            <select
                                id="deck-visibility"
                                value={visibility}
                                onChange={(e) => setVisibility(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            >
                                {VISIBILITIES.map((v) => (
                                    <option key={v} value={v}>
                                        {VISIBILITY_LABELS[v]}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="deck-url" className="block text-xs text-zinc-500 mb-1.5 flex items-center gap-1.5">
                                <LinkIcon className="w-3 h-3" /> Deck URL
                            </label>
                            <input
                                id="deck-url"
                                type="url"
                                value={deckUrl}
                                onChange={(e) => setDeckUrl(e.target.value)}
                                placeholder="https://docs.google.com/presentation/..."
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="deck-file" className="block text-xs text-zinc-500 mb-1.5 flex items-center gap-1.5">
                                <Upload className="w-3 h-3" /> Or Upload File
                            </label>
                            <input
                                id="deck-file"
                                type="file"
                                accept=".pdf,.ppt,.pptx,.html,.htm"
                                onChange={handleFileChange}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-accent file:text-white hover:file:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            />
                            {uploadedFile && (
                                <p className="text-xs text-zinc-400 mt-1.5">
                                    Selected: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(2)} KB)
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="deck-author" className="block text-xs text-zinc-500 mb-1.5">
                                Author
                            </label>
                            <input
                                id="deck-author"
                                type="text"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                placeholder="Author name"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div>
                            <label htmlFor="deck-topic" className="block text-xs text-zinc-500 mb-1.5">
                                Topic
                            </label>
                            <input
                                id="deck-topic"
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g. JavaScript, Design"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div>
                            <label htmlFor="deck-folder" className="block text-xs text-zinc-500 mb-1.5">
                                Folder
                            </label>
                            <input
                                id="deck-folder"
                                type="text"
                                value={folder}
                                onChange={(e) => setFolder(e.target.value)}
                                placeholder="e.g. Work, Courses"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div>
                            <label htmlFor="deck-tags" className="block text-xs text-zinc-500 mb-1.5">
                                Tags (comma-separated)
                            </label>
                            <input
                                id="deck-tags"
                                type="text"
                                value={tagsInput}
                                onChange={(e) => setTagsInput(e.target.value)}
                                placeholder="react, design, tutorial"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div>
                            <label htmlFor="deck-thumb-url" className="block text-xs text-zinc-500 mb-1.5">
                                Thumbnail URL
                            </label>
                            <input
                                id="deck-thumb-url"
                                type="url"
                                value={thumbnailUrl}
                                onChange={(e) => setThumbnailUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={embedEnabled}
                                    onChange={(e) => setEmbedEnabled(e.target.checked)}
                                    disabled={isSubmitting}
                                    className="w-4 h-4 rounded accent-accent"
                                />
                                <span className="text-sm text-zinc-300">Enable embedding</span>
                            </label>
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-3">
                            {formError && (
                                <span className="text-red-400 text-xs self-center">{formError}</span>
                            )}
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-accent hover:bg-accent-hover text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSubmitting ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                                {isSubmitting ? "Saving..." : editingId ? "Update" : "Create"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search decks..."
                            aria-label="Search decks"
                            className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35"
                        />
                    </div>
                    <p className="text-xs text-zinc-500 ml-auto">{filtered.length} visible</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setFormatFilter("all")}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                            formatFilter === "all"
                                ? "bg-accent/15 border-accent/35 text-accent"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                        )}
                    >
                        All Formats
                    </button>
                    {FORMATS.map((f) => (
                        <button
                            key={f}
                            onClick={() => setFormatFilter(f)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                formatFilter === f
                                    ? FORMAT_STYLES[f]
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                            )}
                        >
                            {FORMAT_LABELS[f]}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setVisibilityFilter("all")}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                            visibilityFilter === "all"
                                ? "bg-accent/15 border-accent/35 text-accent"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                        )}
                    >
                        All Visibility
                    </button>
                    {VISIBILITIES.map((v) => (
                        <button
                            key={v}
                            onClick={() => setVisibilityFilter(v)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                visibilityFilter === v
                                    ? VISIBILITY_STYLES[v]
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                            )}
                        >
                            {VISIBILITY_LABELS[v]}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-zinc-500">
                    <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="w-8 h-8 animate-spin text-accent" />
                        <span>Loading your decks...</span>
                    </div>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center text-zinc-500 py-14 border border-zinc-800 rounded-2xl bg-zinc-900/40">
                    <Presentation className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No decks found for current filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((item) => (
                        <article
                            key={item._id}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-zinc-700 transition-colors group"
                        >
                            <div className="w-full h-32 rounded-xl bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center">
                                {item.payload.thumbnail_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={item.payload.thumbnail_url}
                                        alt={item.payload.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Presentation className="w-8 h-8 text-zinc-600" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-zinc-50 line-clamp-1 leading-snug">
                                    {item.payload.title}
                                </p>
                                {item.payload.description && (
                                    <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">
                                        {item.payload.description}
                                    </p>
                                )}

                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                    <span
                                        className={cn(
                                            "px-2 py-0.5 rounded-md text-[10px] font-medium border",
                                            FORMAT_STYLES[item.payload.format]
                                        )}
                                    >
                                        {FORMAT_LABELS[item.payload.format]}
                                    </span>
                                    <span
                                        className={cn(
                                            "px-2 py-0.5 rounded-md text-[10px] font-medium border",
                                            VISIBILITY_STYLES[item.payload.visibility]
                                        )}
                                    >
                                        {VISIBILITY_LABELS[item.payload.visibility]}
                                    </span>
                                </div>

                                {item.payload.tags.length > 0 && (
                                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                                        <Tag className="w-3 h-3 text-zinc-600 shrink-0" />
                                        {item.payload.tags.slice(0, 3).map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                        {item.payload.tags.length > 3 && (
                                            <span className="text-[10px] text-zinc-600">
                                                +{item.payload.tags.length - 3}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {item.payload.folder && (
                                    <div className="flex items-center gap-1 mt-1.5">
                                        <Folder className="w-3 h-3 text-zinc-600" />
                                        <span className="text-[10px] text-zinc-500">{item.payload.folder}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-1 pt-2 border-t border-zinc-800">
                                {item.payload.deck_url && (
                                    <a
                                        href={item.payload.deck_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-accent hover:bg-accent/10 transition-colors"
                                        title="Open deck"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" /> Open
                                    </a>
                                )}
                                {item.payload.embed_enabled && (
                                    <button
                                        onClick={() => copyEmbedCode(item)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:bg-zinc-800 transition-colors"
                                        title="Copy embed code"
                                    >
                                        <Copy className="w-3.5 h-3.5" /> Embed
                                    </button>
                                )}
                                <div className="ml-auto flex items-center gap-1">
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                                        title="Edit"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item._id)}
                                        disabled={isDeletingId === item._id}
                                        className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
