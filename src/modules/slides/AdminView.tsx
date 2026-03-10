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
    Eye,
    Copy,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    Minimize2,
    GripVertical,
    Tag,
    Folder,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    SlideDeckItem,
    Slide,
    FORMATS,
    VISIBILITIES,
    FORMAT_LABELS,
    FORMAT_STYLES,
    VISIBILITY_LABELS,
    VISIBILITY_STYLES,
} from "./types";

export default function SlidesAdminView() {
    const [items, setItems] = useState<SlideDeckItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

    // Filters
    const [formatFilter, setFormatFilter] = useState<string>("all");
    const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Presentation mode
    const [presentingDeck, setPresentingDeck] = useState<SlideDeckItem | null>(null);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showPresenterNotes, setShowPresenterNotes] = useState(false);

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [format, setFormat] = useState<string>("html");
    const [visibility, setVisibility] = useState<string>("private");
    const [tagsInput, setTagsInput] = useState("");
    const [author, setAuthor] = useState("");
    const [topic, setTopic] = useState("");
    const [folder, setFolder] = useState("");
    const [embedEnabled, setEmbedEnabled] = useState(false);
    const [fileUrl, setFileUrl] = useState("");
    const [thumbnailUrl, setThumbnailUrl] = useState("");
    const [slides, setSlides] = useState<Slide[]>([]);
    const [formError, setFormError] = useState("");

    const fetchItems = useCallback(async () => {
        try {
            const res = await fetch("/api/content?module_type=slide_deck");
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
        setFormat("html");
        setVisibility("private");
        setTagsInput("");
        setAuthor("");
        setTopic("");
        setFolder("");
        setEmbedEnabled(false);
        setFileUrl("");
        setThumbnailUrl("");
        setSlides([]);
        setEditingId(null);
        setFormError("");
        setShowForm(false);
    };

    const addSlide = () => {
        setSlides((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                title: "",
                content: "",
                notes: "",
                order: prev.length,
            },
        ]);
    };

    const updateSlide = (index: number, field: keyof Slide, value: string | number) => {
        setSlides((prev) =>
            prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
        );
    };

    const removeSlide = (index: number) => {
        setSlides((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })));
    };

    const moveSlide = (index: number, direction: "up" | "down") => {
        if (
            (direction === "up" && index === 0) ||
            (direction === "down" && index === slides.length - 1)
        )
            return;
        const newSlides = [...slides];
        const swapIndex = direction === "up" ? index - 1 : index + 1;
        [newSlides[index], newSlides[swapIndex]] = [newSlides[swapIndex], newSlides[index]];
        setSlides(newSlides.map((s, i) => ({ ...s, order: i })));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setFormError("");

        if (!title.trim()) {
            setFormError("Title is required");
            return;
        }

        const tags = tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);

        const payload: Record<string, unknown> = {
            title: title.trim(),
            description: description.trim() || undefined,
            format,
            visibility,
            tags,
            author: author.trim() || undefined,
            topic: topic.trim() || undefined,
            folder: folder.trim() || undefined,
            slide_count: slides.length,
            slides,
            embed_enabled: embedEnabled,
            file_url: fileUrl.trim() || undefined,
            thumbnail_url: thumbnailUrl.trim() || undefined,
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
                          module_type: "slide_deck",
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

    const handleEdit = (item: SlideDeckItem) => {
        setTitle(item.payload.title);
        setDescription(item.payload.description || "");
        setFormat(item.payload.format);
        setVisibility(item.payload.visibility);
        setTagsInput((item.payload.tags || []).join(", "));
        setAuthor(item.payload.author || "");
        setTopic(item.payload.topic || "");
        setFolder(item.payload.folder || "");
        setEmbedEnabled(item.payload.embed_enabled);
        setFileUrl(item.payload.file_url || "");
        setThumbnailUrl(item.payload.thumbnail_url || "");
        setSlides(item.payload.slides || []);
        setEditingId(item._id);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this slide deck?")) return;
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

    const handlePresent = (item: SlideDeckItem) => {
        if (item.payload.slides.length === 0) {
            alert("This deck has no slides to present.");
            return;
        }
        setPresentingDeck(item);
        setCurrentSlideIndex(0);
        setShowPresenterNotes(false);
    };

    const copyEmbedCode = (item: SlideDeckItem) => {
        const embedCode = `<iframe src="${window.location.origin}/slides/embed/${item._id}" width="100%" height="500" frameborder="0" allowfullscreen></iframe>`;
        navigator.clipboard.writeText(embedCode);
        alert("Embed code copied to clipboard!");
    };

    // Keyboard navigation for presentation
    useEffect(() => {
        if (!presentingDeck) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const totalSlides = presentingDeck.payload.slides.length;
            if (e.key === "ArrowRight" || e.key === " ") {
                e.preventDefault();
                setCurrentSlideIndex((prev) => Math.min(prev + 1, totalSlides - 1));
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Escape") {
                setPresentingDeck(null);
                setIsFullscreen(false);
            } else if (e.key === "f" || e.key === "F") {
                setIsFullscreen((prev) => !prev);
            } else if (e.key === "n" || e.key === "N") {
                setShowPresenterNotes((prev) => !prev);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [presentingDeck]);

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
        const totalSlides = items.reduce((sum, i) => sum + (i.payload.slide_count || 0), 0);
        const folders = new Set(items.map((i) => i.payload.folder).filter(Boolean));
        return { total, publicDecks, totalSlides, folderCount: folders.size };
    }, [items]);

    // Presentation mode UI
    if (presentingDeck) {
        const currentSlide = presentingDeck.payload.slides[currentSlideIndex];
        const totalSlides = presentingDeck.payload.slides.length;

        return (
            <div
                className={cn(
                    "bg-black flex flex-col",
                    isFullscreen ? "fixed inset-0 z-50" : "min-h-[80vh] rounded-2xl border border-zinc-800"
                )}
            >
                {/* Presentation header */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-950">
                    <div className="flex items-center gap-3">
                        <Presentation className="w-4 h-4 text-accent" />
                        <span className="text-sm font-medium text-zinc-300">{presentingDeck.payload.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">
                            {currentSlideIndex + 1} / {totalSlides}
                        </span>
                        <button
                            onClick={() => setShowPresenterNotes((p) => !p)}
                            className={cn(
                                "p-1.5 rounded-lg text-xs transition-colors",
                                showPresenterNotes
                                    ? "bg-accent/20 text-accent"
                                    : "text-zinc-500 hover:text-zinc-300"
                            )}
                            title="Toggle notes (N)"
                        >
                            Notes
                        </button>
                        <button
                            onClick={() => setIsFullscreen((p) => !p)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
                            title="Toggle fullscreen (F)"
                        >
                            {isFullscreen ? (
                                <Minimize2 className="w-4 h-4" />
                            ) : (
                                <Maximize2 className="w-4 h-4" />
                            )}
                        </button>
                        <button
                            onClick={() => {
                                setPresentingDeck(null);
                                setIsFullscreen(false);
                            }}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
                            title="Exit (Esc)"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Slide content */}
                <div className="flex-1 flex">
                    <div className="flex-1 flex items-center justify-center p-8 relative">
                        <button
                            onClick={() => setCurrentSlideIndex((p) => Math.max(p - 1, 0))}
                            disabled={currentSlideIndex === 0}
                            className="absolute left-4 p-2 rounded-full bg-zinc-800/50 text-zinc-400 hover:text-white disabled:opacity-20 transition-all"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>

                        <div className="w-full max-w-4xl mx-auto">
                            {currentSlide?.title && (
                                <h2 className="text-3xl font-bold text-white mb-6 text-center">
                                    {currentSlide.title}
                                </h2>
                            )}
                            <div
                                className="prose prose-invert prose-lg max-w-none text-center"
                                dangerouslySetInnerHTML={{
                                    __html: currentSlide?.content || "<p class='text-zinc-500'>Empty slide</p>",
                                }}
                            />
                        </div>

                        <button
                            onClick={() => setCurrentSlideIndex((p) => Math.min(p + 1, totalSlides - 1))}
                            disabled={currentSlideIndex === totalSlides - 1}
                            className="absolute right-4 p-2 rounded-full bg-zinc-800/50 text-zinc-400 hover:text-white disabled:opacity-20 transition-all"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Presenter notes panel */}
                    {showPresenterNotes && (
                        <div className="w-80 border-l border-zinc-800 bg-zinc-950 p-4 overflow-y-auto">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 mb-3">
                                Presenter Notes
                            </p>
                            <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                                {currentSlide?.notes || "No notes for this slide."}
                            </p>
                        </div>
                    )}
                </div>

                {/* Slide thumbnails */}
                <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-3">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {presentingDeck.payload.slides.map((slide, idx) => (
                            <button
                                key={slide.id}
                                onClick={() => setCurrentSlideIndex(idx)}
                                className={cn(
                                    "shrink-0 w-24 h-16 rounded-lg border text-[10px] font-medium p-2 text-left transition-all truncate",
                                    idx === currentSlideIndex
                                        ? "border-accent bg-accent/10 text-accent"
                                        : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700"
                                )}
                            >
                                {slide.title || `Slide ${idx + 1}`}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
                <div className="absolute -bottom-16 left-1/4 h-44 w-44 rounded-full bg-purple-500/10 blur-3xl" />
                <div className="relative space-y-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Slides</h1>
                            <p className="text-zinc-400 mt-1">
                                Create, manage, and present slide decks from one place.
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

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Total Decks</p>
                            <p className="text-lg font-semibold text-zinc-50">{stats.total}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Public</p>
                            <p className="text-lg font-semibold text-green-300">{stats.publicDecks}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Total Slides</p>
                            <p className="text-lg font-semibold text-blue-300">{stats.totalSlides}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Folders</p>
                            <p className="text-lg font-semibold text-yellow-300">{stats.folderCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form */}
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
                        {/* Title */}
                        <div className="md:col-span-2">
                            <label htmlFor="slide-title" className="block text-xs text-zinc-500 mb-1.5">
                                Title <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="slide-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="My Presentation"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                autoFocus
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Description */}
                        <div className="md:col-span-2">
                            <label htmlFor="slide-desc" className="block text-xs text-zinc-500 mb-1.5">
                                Description
                            </label>
                            <textarea
                                id="slide-desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                placeholder="Brief description of this deck..."
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Format */}
                        <div>
                            <label htmlFor="slide-format" className="block text-xs text-zinc-500 mb-1.5">
                                Format
                            </label>
                            <select
                                id="slide-format"
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

                        {/* Visibility */}
                        <div>
                            <label htmlFor="slide-visibility" className="block text-xs text-zinc-500 mb-1.5">
                                Visibility
                            </label>
                            <select
                                id="slide-visibility"
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

                        {/* Author */}
                        <div>
                            <label htmlFor="slide-author" className="block text-xs text-zinc-500 mb-1.5">
                                Author
                            </label>
                            <input
                                id="slide-author"
                                type="text"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                placeholder="Author name"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Topic */}
                        <div>
                            <label htmlFor="slide-topic" className="block text-xs text-zinc-500 mb-1.5">
                                Topic
                            </label>
                            <input
                                id="slide-topic"
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g. JavaScript, Design"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Folder */}
                        <div>
                            <label htmlFor="slide-folder" className="block text-xs text-zinc-500 mb-1.5">
                                Folder
                            </label>
                            <input
                                id="slide-folder"
                                type="text"
                                value={folder}
                                onChange={(e) => setFolder(e.target.value)}
                                placeholder="e.g. Work, Courses"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Tags */}
                        <div>
                            <label htmlFor="slide-tags" className="block text-xs text-zinc-500 mb-1.5">
                                Tags (comma-separated)
                            </label>
                            <input
                                id="slide-tags"
                                type="text"
                                value={tagsInput}
                                onChange={(e) => setTagsInput(e.target.value)}
                                placeholder="react, design, tutorial"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* File URL */}
                        <div>
                            <label htmlFor="slide-file-url" className="block text-xs text-zinc-500 mb-1.5">
                                File URL
                            </label>
                            <input
                                id="slide-file-url"
                                type="url"
                                value={fileUrl}
                                onChange={(e) => setFileUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Thumbnail URL */}
                        <div>
                            <label htmlFor="slide-thumb-url" className="block text-xs text-zinc-500 mb-1.5">
                                Thumbnail URL
                            </label>
                            <input
                                id="slide-thumb-url"
                                type="url"
                                value={thumbnailUrl}
                                onChange={(e) => setThumbnailUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Embed enabled */}
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

                        {/* Slides editor */}
                        <div className="md:col-span-2 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs text-zinc-500">
                                    Slides ({slides.length})
                                </label>
                                <button
                                    type="button"
                                    onClick={addSlide}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Slide
                                </button>
                            </div>

                            {slides.map((slide, idx) => (
                                <div
                                    key={slide.id}
                                    className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <GripVertical className="w-4 h-4 text-zinc-600" />
                                            <span className="text-xs font-medium text-zinc-400">
                                                Slide {idx + 1}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => moveSlide(idx, "up")}
                                                disabled={idx === 0 || isSubmitting}
                                                className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                                                aria-label="Move up"
                                            >
                                                <ChevronLeft className="w-3.5 h-3.5 rotate-90" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => moveSlide(idx, "down")}
                                                disabled={idx === slides.length - 1 || isSubmitting}
                                                className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                                                aria-label="Move down"
                                            >
                                                <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeSlide(idx)}
                                                disabled={isSubmitting}
                                                className="p-1 text-red-400/60 hover:text-red-400"
                                                aria-label="Remove slide"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        value={slide.title || ""}
                                        onChange={(e) => updateSlide(idx, "title", e.target.value)}
                                        placeholder="Slide title (optional)"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                        disabled={isSubmitting}
                                    />
                                    <textarea
                                        value={slide.content}
                                        onChange={(e) => updateSlide(idx, "content", e.target.value)}
                                        rows={4}
                                        placeholder="Slide content (HTML supported)"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y font-mono"
                                        disabled={isSubmitting}
                                    />
                                    <textarea
                                        value={slide.notes || ""}
                                        onChange={(e) => updateSlide(idx, "notes", e.target.value)}
                                        rows={2}
                                        placeholder="Presenter notes (only visible to you)"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            ))}
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

            {/* Filters */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search decks..."
                            aria-label="Search slide decks"
                            className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35"
                        />
                    </div>
                    <p className="text-xs text-zinc-500 ml-auto">{filtered.length} visible</p>
                </div>

                {/* Format filters */}
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

                {/* Visibility filters */}
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

            {/* Deck Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20 text-zinc-500">
                    <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="w-8 h-8 animate-spin text-accent" />
                        <span>Loading your slide decks...</span>
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
                            {/* Thumbnail / placeholder */}
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

                            {/* Info */}
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
                                    <span className="text-[10px] text-zinc-500">
                                        {item.payload.slide_count} slide{item.payload.slide_count !== 1 ? "s" : ""}
                                    </span>
                                </div>

                                {/* Tags */}
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

                            {/* Actions */}
                            <div className="flex items-center gap-1 pt-2 border-t border-zinc-800">
                                <button
                                    onClick={() => handlePresent(item)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-accent hover:bg-accent/10 transition-colors"
                                    title="Present"
                                >
                                    <Eye className="w-3.5 h-3.5" /> Present
                                </button>
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
