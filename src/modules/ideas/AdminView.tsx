"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
    Plus,
    Trash2,
    Edit3,
    X,
    Lightbulb,
    Rocket,
    Settings,
    Check,
    Search,
    RefreshCw,
    GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import {
    DndContext,
    MouseSensor,
    TouchSensor,
    KeyboardSensor,
    DragOverlay,
    closestCenter,
    useSensor,
    useSensors,
    useDroppable,
    defaultDropAnimationSideEffects,
    type DragEndEvent,
    type DragStartEvent,
    type DragOverEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    verticalListSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Toast, { type ToastType } from "@/components/ui/Toast";
import IdeaDetailsModal from "./IdeaDetailsModal";
import {
    IDEA_PRIORITY_STYLES,
    IDEA_STATUS_LABELS,
    type IdeaRecord,
} from "./shared";

const STATUSES = ["raw", "exploring", "archived"] as const;
const STATUS_LABELS = IDEA_STATUS_LABELS;
const STATUS_STYLES: Record<string, string> = {
    raw: "bg-zinc-500 text-zinc-300 border-zinc-500/25",
    exploring: "bg-blue-500 text-blue-300 border-blue-500/25",
    archived: "bg-zinc-500 text-zinc-500 border-zinc-500/25",
};
const PRIORITY_STYLES = IDEA_PRIORITY_STYLES;
type Idea = IdeaRecord;

interface IdeaCardProps {
    idea: Idea;
    isAnyDragging: boolean;
    isPromotingId: string | null;
    onOpen: (idea: Idea) => void;
    onPromote: (idea: Idea) => void;
    onEdit: (idea: Idea) => void;
    onDelete: (id: string) => void;
}

function SortableIdeaCard({
    idea,
    isAnyDragging,
    isPromotingId,
    onOpen,
    onPromote,
    onEdit,
    onDelete,
}: IdeaCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: idea._id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <article
            ref={setNodeRef}
            style={style}
            className={cn(
                "bg-zinc-900 border border-zinc-800 rounded-lg p-3 group hover:border-zinc-700 transition-all relative z-10",
                isDragging && "opacity-50 ring-2 ring-accent/50 border-accent/50 shadow-2xl z-50 scale-[1.02]",
                isAnyDragging && !isDragging && "opacity-40 grayscale-[0.5]"
            )}
        >
            <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-start gap-1">
                    <button
                        type="button"
                        {...attributes}
                        {...listeners}
                        className="p-1 -ml-1.5 text-zinc-700 hover:text-zinc-500 cursor-grab active:cursor-grabbing touch-none rounded transition-colors hover:bg-zinc-800"
                    >
                        <GripVertical className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onOpen(idea)}
                        className="rounded-md text-start focus:outline-none focus:ring-2 focus:ring-accent/40"
                        aria-label={`Open details for ${idea.payload.title}`}
                    >
                        <p className="text-xs font-semibold text-zinc-50 line-clamp-2 leading-tight">{idea.payload.title}</p>
                    </button>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {!idea.payload.promoted_to_portfolio && idea.payload.status !== "archived" && (
                        <button
                            onClick={() => onPromote(idea)}
                            disabled={isPromotingId === idea._id}
                            className="p-0.5 text-zinc-500 hover:text-green-400 disabled:opacity-50"
                            title="Promote"
                            aria-label="Promote to portfolio"
                        >
                            {isPromotingId === idea._id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
                        </button>
                    )}
                    <button
                        onClick={() => onEdit(idea)}
                        disabled={isPromotingId === idea._id}
                        className="p-0.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
                        title="Edit"
                        aria-label="Edit idea"
                    >
                        <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => onDelete(idea._id)}
                        disabled={isPromotingId === idea._id}
                        className="p-0.5 text-zinc-500 hover:text-red-400 disabled:opacity-50"
                        title="Delete"
                        aria-label="Delete idea"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap mb-1 ml-4">
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border leading-none font-medium", PRIORITY_STYLES[idea.payload.priority] || PRIORITY_STYLES.medium)}>
                    {idea.payload.priority}
                </span>
                {idea.payload.category && <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">{idea.payload.category}</span>}
            </div>

            <button
                type="button"
                onClick={() => onOpen(idea)}
                className="ml-4 mt-2 text-[11px] text-zinc-500 transition-colors hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-accent/40 rounded"
                aria-label={`View full details for ${idea.payload.title}`}
            >
                View details
            </button>
        </article>
    );
}

function DroppableColumn({
    id,
    title,
    count,
    children,
    isDragging
}: {
    id: string;
    title: string;
    count: number;
    children: React.ReactNode;
    isDragging: boolean;
}) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <section
            ref={setNodeRef}
            className={cn(
                "rounded-2xl border transition-all duration-300 flex flex-col h-full bg-zinc-900/40 p-4 min-h-[500px]",
                isOver ? "bg-zinc-800/80 border-accent/50 ring-4 ring-accent/10 shadow-inner" : "border-zinc-800/50",
                isDragging && !isOver && "border-dashed border-zinc-800"
            )}
        >
            <div className="flex items-center justify-between mb-4 px-1 shrink-0">
                <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.1em] flex items-center gap-2">
                    <span className={cn("inline-block w-1.5 h-1.5 rounded-full", STATUS_STYLES[id]?.split(" ")[0] || "bg-zinc-500")} />
                    {title}
                </h3>
                <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full ring-1 ring-zinc-700/50">
                    {count}
                </span>
            </div>

            <div className="flex-1 space-y-2.5">
                {children}
            </div>
        </section>
    );
}

function DeleteZone({ isDragging }: { isDragging: boolean }) {
    const { setNodeRef, isOver } = useDroppable({ id: "delete" });

    // Use a portal to ensure it's at the root of the document body
    // This avoids parent transform/z-index issues
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const frame = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(frame);
    }, []);

    const content = (
        <div
            ref={setNodeRef}
            className={cn(
                "fixed bottom-0 left-0 right-0 h-48 flex items-center justify-center transition-all duration-500 ease-in-out z-[9999]",
                isDragging ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
            )}
        >
            <div className="absolute inset-0 bg-gradient-to-t from-red-600/40 via-zinc-950 to-transparent backdrop-blur-md" />
            <div className={cn(
                "relative px-14 py-7 rounded-full border-2 flex items-center justify-center gap-5 transition-all duration-300 shadow-[0_-20px_60px_-15px_rgba(239,68,68,0.3)]",
                isOver
                    ? "bg-red-600 border-red-400 text-white scale-110 -translate-y-10"
                    : "bg-zinc-950 border-red-500/40 text-red-500/80"
            )}>
                <Trash2 className={cn("w-8 h-8", isOver && "animate-bounce")} />
                <span className="font-extrabold text-xl tracking-tighter uppercase italic">Drop anywhere to delete</span>
            </div>
        </div>
    );

    if (!mounted) return null;
    return createPortal(content, document.body);
}

function DragPreviewCard({ idea }: { idea: Idea }) {
    return (
        <article className="bg-zinc-900 border-2 border-accent/50 rounded-xl p-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] opacity-95 w-72 rotate-3 scale-105 ring-4 ring-accent/5 pointer-events-none">
            <div className="flex items-start gap-2 mb-2">
                <GripVertical className="w-4 h-4 text-accent/60 mt-0.5" />
                <p className="text-sm font-bold text-zinc-50 leading-tight">{idea.payload.title}</p>
            </div>
            <div className="flex items-center gap-1.5 ml-6">
                <span className={cn("text-[9px] px-2 py-0.5 rounded-full border leading-none font-bold", PRIORITY_STYLES[idea.payload.priority] || PRIORITY_STYLES.medium)}>
                    {idea.payload.priority}
                </span>
            </div>
        </article>
    );
}

const IDEAS_DEFAULTS = {
    defaultStatus: "raw",
    defaultPriority: "medium",
    categories: ["Product", "Personal", "Research", "Business", "Creative"],
};


export default function IdeasAdminView() {
    const { settings, updateSettings, saving: settingsSaving } = useModuleSettings("ideasSettings", IDEAS_DEFAULTS);

    const [showSettings, setShowSettings] = useState(false);
    const [newCat, setNewCat] = useState("");
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [priorityFilter, setPriorityFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [status, setStatus] = useState<string>(settings.defaultStatus);
    const [priority, setPriority] = useState<string>(settings.defaultPriority);
    const [tagsInput, setTagsInput] = useState("");
    const [formError, setFormError] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPromotingId, setIsPromotingId] = useState<string | null>(null);

    const [activeId, setActiveId] = useState<string | null>(null);
    const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

    // Undo & Delayed Delete state
    const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastDeletedIdeaRef = useRef<{ idea: Idea, index: number } | null>(null);

    // Custom Dialog & Toast state
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [toast, setToast] = useState<{
        message: string;
        type: ToastType;
        isVisible: boolean;
        action?: { label: string; onClick: () => void };
    }>({
        message: "",
        type: "success",
        isVisible: false
    });

    const showToast = (message: string, type: ToastType = "success", action?: { label: string; onClick: () => void }) => {
        setToast({ message, type, isVisible: true, action });
    };

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: { distance: 10 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 250, tolerance: 5 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const fetchIdeas = useCallback(async () => {
        try {
            const response = await fetch("/api/content?module_type=idea");
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to fetch ideas");
            const unsorted = data.data || [];
            // Sort by order if available, otherwise by date
            const sorted = [...unsorted].sort((a, b) => {
                if (a.payload.order !== undefined && b.payload.order !== undefined) {
                    return a.payload.order - b.payload.order;
                }
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
            setIdeas(sorted);
        } catch (err: unknown) {
            console.error("fetchIdeas failed:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchIdeas();
    }, [fetchIdeas]);

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setCategory("");
        setStatus(settings.defaultStatus);
        setPriority(settings.defaultPriority);
        setTagsInput("");
        setEditingId(null);
        setFormError("");
        setShowForm(false);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!title.trim()) {
            setFormError("Title required");
            return;
        }

        const payload = {
            title: title.trim(),
            description: description.trim() || undefined,
            category: category.trim() || undefined,
            status,
            priority,
            tags: tagsInput
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            promoted_to_portfolio: editingId ? ideas.find(i => i._id === editingId)?.payload.promoted_to_portfolio : false,
        };

        setIsSubmitting(true);
        setFormError("");
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
                    body: JSON.stringify({ module_type: "idea", is_public: false, payload }),
                });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save idea");

            resetForm();
            await fetchIdeas();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to save";
            setFormError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (idea: Idea) => {
        setTitle(idea.payload.title);
        setDescription(idea.payload.description || "");
        setCategory(idea.payload.category || "");
        setStatus(idea.payload.status);
        setPriority(idea.payload.priority);
        setTagsInput(idea.payload.tags.join(", "));
        setEditingId(idea._id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        const ideaToDelete = ideas.find(i => i._id === id);
        if (!ideaToDelete) return;

        const index = ideas.findIndex(i => i._id === id);

        // Optimistic UI update
        setIdeas(prev => prev.filter(i => i._id !== id));
        lastDeletedIdeaRef.current = { idea: ideaToDelete, index };
        setConfirmDeleteId(null);

        // Schedule actual deletion
        if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);

        deleteTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
                if (!res.ok) throw new Error("Delete failed");
                lastDeletedIdeaRef.current = null;
            } catch (err) {
                // If it failed, maybe put it back? Or just alert.
                console.error("Delayed delete failed:", err);
            }
        }, 5000);

        showToast("Idea deleted", "success", {
            label: "Undo",
            onClick: () => handleUndoDelete()
        });
    };

    const handleUndoDelete = () => {
        if (deleteTimeoutRef.current) {
            clearTimeout(deleteTimeoutRef.current);
            deleteTimeoutRef.current = null;
        }

        const lastDeleted = lastDeletedIdeaRef.current;
        if (lastDeleted) {
            setIdeas(prev => {
                const updated = [...prev];
                updated.splice(lastDeleted.index, 0, lastDeleted.idea);
                // After restoring, we should re-sync orders to ensure dnd works correctly
                const reSynced = updated.map((item, idx) => ({
                    ...item,
                    payload: { ...item.payload, order: idx }
                }));
                void handleReorder(reSynced);
                return reSynced;
            });
            lastDeletedIdeaRef.current = null;
            // Delay the success toast slightly to ensure it shows after the delete toast closes
            setTimeout(() => showToast("Deletion undone", "success"), 50);
        }
    };

    const handlePromote = async (idea: Idea) => {
        const payload = {
            ...idea.payload,
            status: "archived",
            promoted_to_portfolio: true,
            promoted_at: new Date().toISOString(),
        };

        setIsPromotingId(idea._id);
        try {
            const res = await fetch(`/api/content/${idea._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payload }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Promotion failed");
            await fetchIdeas();
            showToast("Idea promoted to portfolio!", "success");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to promote";
            showToast(message, "error");
        } finally {
            setIsPromotingId(null);
        }
    };

    const filtered = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return [...ideas]
            .filter((idea) => {
                if (statusFilter !== "all" && idea.payload.status !== statusFilter) return false;
                if (priorityFilter !== "all" && idea.payload.priority !== priorityFilter) return false;
                if (!query) return true;

                const haystack = `${idea.payload.title} ${idea.payload.description || ""} ${idea.payload.category || ""} ${idea.payload.tags.join(" ")}`.toLowerCase();
                return haystack.includes(query);
            });
    }, [ideas, statusFilter, priorityFilter, searchQuery]);

    const grouped = useMemo(() => {
        const res = STATUSES.reduce<Record<string, Idea[]>>((acc, statusKey) => {
            acc[statusKey] = filtered.filter((idea) => idea.payload.status === statusKey);
            return acc;
        }, {} as Record<string, Idea[]>);

        // Within each column, sort by order
        Object.keys(res).forEach(key => {
            res[key] = [...res[key]].sort((a, b) => (a.payload.order || 0) - (b.payload.order || 0));
        });
        return res;
    }, [filtered]);

    const handleReorder = async (newIdeas: Idea[]) => {
        try {
            // Update orders in database
            await Promise.all(newIdeas.map((idea, index) => {
                const payload = { ...idea.payload, order: index };
                return fetch(`/api/content/${idea._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ payload }),
                });
            }));
        } catch (err) {
            console.error("Failed to persist reorder:", err);
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(String(event.active.id));
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) {
            return;
        }

        const activeIdStr = String(active.id);
        const overIdStr = String(over.id);


        // Find which column we are dragging over
        const overCol = (STATUSES as readonly string[]).includes(overIdStr)
            ? overIdStr
            : ideas.find((i) => i._id === overIdStr)?.payload.status;

        if (!overCol) return;

        const activeIdeaObj = ideas.find((i) => i._id === activeIdStr);
        if (!activeIdeaObj) return;

        if (activeIdeaObj.payload.status !== overCol) {
            setIdeas((prev) => {
                const newIdeas = prev.map((i) =>
                    i._id === activeIdStr ? { ...i, payload: { ...i.payload, status: overCol } } : i
                );
                return newIdeas;
            });
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeIdStr = String(active.id);
        const overIdStr = String(over.id);

        console.log("Drag End:", { activeIdStr, overIdStr });

        if (overIdStr === "delete") {
            setConfirmDeleteId(activeIdStr);
            return;
        }

        setIdeas((prev) => {
            const oldIndex = prev.findIndex((i) => i._id === activeIdStr);
            const newIndex = prev.findIndex((i) => i._id === overIdStr);

            if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                const reordered = arrayMove(prev, oldIndex, newIndex);
                // Crucial: Update the 'order' property locally so the memoized sort remains consistent
                const withNewOrders = reordered.map((idea, index) => ({
                    ...idea,
                    payload: { ...idea.payload, order: index }
                }));
                void handleReorder(withNewOrders);
                return withNewOrders;
            }

            // If we moved columns but index is the same or over is -1
            void handleReorder(prev);
            return prev;
        });
    };

    const activeIdea = activeId ? ideas.find((i) => i._id === activeId) : null;

    const stats = useMemo(() => {
        const total = ideas.length;
        const promoted = ideas.filter((idea) => idea.payload.promoted_to_portfolio).length;
        const active = ideas.filter((idea) => ["raw", "exploring"].includes(idea.payload.status)).length;
        const archived = ideas.filter((idea) => idea.payload.status === "archived").length;
        const highPriority = ideas.filter((idea) => idea.payload.priority === "high" && idea.payload.status !== "archived").length;

        return {
            total,
            promoted,
            active,
            archived,
            highPriority,
        };
    }, [ideas]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="space-y-6 relative">
                <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                    <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-accent/20 blur-3xl animate-pulse" />
                    <div className="absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-green-500/10 blur-3xl" />

                    <div className="relative space-y-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Idea Dump</h1>
                                <p className="text-zinc-400 mt-1">Capture raw thoughts, evolve them in pipeline, and promote winners to execution.</p>
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
                                    <Plus className="w-4 h-4" /> New Idea
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                                <p className="text-xs text-zinc-500">Total</p>
                                <p className="text-lg font-semibold text-zinc-50">{stats.total}</p>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                                <p className="text-xs text-zinc-500">Active Pipeline</p>
                                <p className="text-lg font-semibold text-zinc-50">{stats.active}</p>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                                <p className="text-xs text-zinc-500">High Priority</p>
                                <p className="text-lg font-semibold text-red-300">{stats.highPriority}</p>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                                <p className="text-xs text-zinc-500">Promoted</p>
                                <p className="text-lg font-semibold text-green-300">{stats.promoted}</p>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                                <p className="text-xs text-zinc-500">Archived</p>
                                <p className="text-lg font-semibold text-zinc-300">{stats.archived}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {showSettings && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-fade-in-up space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-zinc-50">Ideas Settings</h2>
                            {settingsSaving && (
                                <span className="text-xs text-accent flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Saved
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="idea-default-status" className="block text-xs text-zinc-500 mb-1.5">Default Status</label>
                                <select
                                    id="idea-default-status"
                                    value={settings.defaultStatus}
                                    onChange={(event) => updateSettings({ defaultStatus: event.target.value })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                >
                                    {STATUSES.map((statusItem) => (
                                        <option key={statusItem} value={statusItem}>
                                            {STATUS_LABELS[statusItem]}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="idea-default-priority" className="block text-xs text-zinc-500 mb-1.5">Default Priority</label>
                                <select
                                    id="idea-default-priority"
                                    value={settings.defaultPriority}
                                    onChange={(event) => updateSettings({ defaultPriority: event.target.value })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                >
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-zinc-500 mb-2">Quick Categories</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {settings.categories.map((cat: string) => (
                                    <span key={cat} className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300">
                                        {cat}
                                        <button
                                            onClick={() => updateSettings({ categories: settings.categories.filter((item: string) => item !== cat) })}
                                            className="text-zinc-500 hover:text-red-400 ml-0.5"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    id="new-category-input"
                                    type="text"
                                    value={newCat}
                                    onChange={(event) => setNewCat(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            if (newCat.trim()) {
                                                updateSettings({ categories: [...settings.categories, newCat.trim()] });
                                                setNewCat("");
                                            }
                                        }
                                    }}
                                    placeholder="New category"
                                    aria-label="New category name"
                                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                />
                                <button
                                    onClick={() => {
                                        if (newCat.trim()) {
                                            updateSettings({ categories: [...settings.categories, newCat.trim()] });
                                            setNewCat("");
                                        }
                                    }}
                                    disabled={!newCat.trim()}
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
                            <h2 className="text-lg font-semibold text-zinc-50">{editingId ? "Edit" : "New"} Idea</h2>
                            <button onClick={resetForm} className="text-zinc-500 hover:text-zinc-300">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label htmlFor="idea-title" className="block text-xs text-zinc-500 mb-1.5">Title</label>
                                <input
                                    id="idea-title"
                                    type="text"
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                    placeholder="Idea title"
                                    autoFocus
                                    disabled={isSubmitting}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="idea-description" className="block text-xs text-zinc-500 mb-1.5">Description</label>
                                <textarea
                                    id="idea-description"
                                    value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                    rows={4}
                                    placeholder="Describe the idea and why it matters"
                                    disabled={isSubmitting}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
                                />
                            </div>
                            <div>
                                <label htmlFor="idea-category" className="block text-xs text-zinc-500 mb-1.5">Category</label>
                                <input
                                    id="idea-category"
                                    type="text"
                                    value={category}
                                    onChange={(event) => setCategory(event.target.value)}
                                    placeholder="Product, Research..."
                                    disabled={isSubmitting}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                />
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label htmlFor="idea-status" className="block text-xs text-zinc-500 mb-1.5">Status</label>
                                    <select
                                        id="idea-status"
                                        value={status}
                                        onChange={(event) => setStatus(event.target.value)}
                                        disabled={isSubmitting}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                    >
                                        {STATUSES.map((statusItem) => (
                                            <option key={statusItem} value={statusItem}>
                                                {STATUS_LABELS[statusItem]}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label htmlFor="idea-priority" className="block text-xs text-zinc-500 mb-1.5">Priority</label>
                                    <select
                                        id="idea-priority"
                                        value={priority}
                                        onChange={(event) => setPriority(event.target.value)}
                                        disabled={isSubmitting}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                    >
                                        <option value="high">High</option>
                                        <option value="medium">Medium</option>
                                        <option value="low">Low</option>
                                    </select>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="idea-tags" className="block text-xs text-zinc-500 mb-1.5">Tags</label>
                                <input
                                    id="idea-tags"
                                    type="text"
                                    value={tagsInput}
                                    onChange={(event) => setTagsInput(event.target.value)}
                                    placeholder="ai, workflow, startup"
                                    disabled={isSubmitting}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                />
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-3">
                                {formError && <span className="text-red-400 text-xs self-center">{formError}</span>}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    aria-label={editingId ? "Update idea" : "Add idea"}
                                    className="bg-accent hover:bg-accent-hover text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                                    {isSubmitting ? (editingId ? "Updating..." : "Adding...") : (editingId ? "Update" : "Add")}
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
                                placeholder="Search title, description, tags"
                                aria-label="Search ideas"
                                className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35"
                            />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => setStatusFilter("all")}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                    statusFilter === "all"
                                        ? "bg-accent/15 border-accent/35 text-accent"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                                )}
                            >
                                All Status
                            </button>
                            {STATUSES.map((statusItem) => (
                                <button
                                    key={statusItem}
                                    onClick={() => setStatusFilter(statusItem)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                        statusFilter === statusItem
                                            ? STATUS_STYLES[statusItem]
                                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                                    )}
                                >
                                    {STATUS_LABELS[statusItem]}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            {["all", "high", "medium", "low"].map((priorityItem) => (
                                <button
                                    key={priorityItem}
                                    onClick={() => setPriorityFilter(priorityItem)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs capitalize border transition-colors",
                                        priorityFilter === priorityItem
                                            ? priorityItem === "all"
                                                ? "bg-accent/15 border-accent/35 text-accent"
                                                : PRIORITY_STYLES[priorityItem]
                                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                                    )}
                                >
                                    {priorityItem}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                        <RefreshCw className="w-8 h-8 animate-spin text-accent mb-3" />
                        <span>Loading your ideas...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center text-zinc-500 py-14 border border-zinc-800 rounded-2xl bg-zinc-900/40">
                        <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>No ideas match current filters.</p>
                    </div>
                ) : statusFilter === "all" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
                        {STATUSES.map((statusItem) => (
                            <DroppableColumn
                                key={statusItem}
                                id={statusItem}
                                title={STATUS_LABELS[statusItem]}
                                count={grouped[statusItem]?.length || 0}
                                isDragging={!!activeId}
                            >
                                <SortableContext
                                    id={statusItem}
                                    items={(grouped[statusItem] || []).map(i => i._id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {(grouped[statusItem] || []).map((idea) => (
                                        <SortableIdeaCard
                                            key={idea._id}
                                            idea={idea}
                                            isAnyDragging={!!activeId}
                                            isPromotingId={isPromotingId}
                                            onOpen={setSelectedIdea}
                                            onPromote={handlePromote}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </SortableContext>
                            </DroppableColumn>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filtered.map((idea) => (
                            <SortableIdeaCard
                                key={idea._id}
                                idea={idea}
                                isAnyDragging={false}
                                isPromotingId={isPromotingId}
                                onOpen={setSelectedIdea}
                                onPromote={handlePromote}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}

                <DragOverlay
                    zIndex={1000}
                    dropAnimation={{
                        sideEffects: defaultDropAnimationSideEffects({
                            styles: {
                                active: { opacity: "0.5" }
                            }
                        })
                    }}
                >
                    {activeIdea ? <DragPreviewCard idea={activeIdea} /> : null}
                </DragOverlay>


                <DeleteZone isDragging={!!activeId} />

                <ConfirmDialog
                    isOpen={!!confirmDeleteId}
                    title="Delete Idea?"
                    description="This action cannot be undone. This idea will be permanently removed."
                    confirmLabel="Delete"
                    onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
                    onClose={() => setConfirmDeleteId(null)}
                    variant="danger"
                />

                <Toast
                    message={toast.message}
                    type={toast.type}
                    isVisible={toast.isVisible}
                    action={toast.action}
                    onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
                />

                <IdeaDetailsModal
                    idea={selectedIdea}
                    isOpen={!!selectedIdea}
                    onClose={() => setSelectedIdea(null)}
                />
            </div>
        </DndContext>
    );
}
