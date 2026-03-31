"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Check,
  Lightbulb,
  Plus,
  Settings,
  X,
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
} from "@dnd-kit/sortable";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Toast, { type ToastType } from "@/components/ui/Toast";
import { SkeletonBlock } from "@/components/ui/Skeletons";
import IdeaDetailsModal from "./IdeaDetailsModal";
import {
  IDEA_STATUS_LABELS,
  type IdeaRecord,
} from "./shared";
import {
  SortableIdeaCard,
  DroppableColumn,
  DeleteZone,
  DragPreviewCard,
} from "./components/IdeaKanban";
import IdeaFormPanel from "./components/IdeaFormPanel";
import IdeaFilters from "./components/IdeaFilters";

const STATUSES = ["raw", "exploring", "archived"] as const;

const IDEAS_DEFAULTS = {
  defaultStatus: "raw",
  defaultPriority: "medium",
  categories: ["Product", "Personal", "Research", "Business", "Creative"],
};

type Idea = IdeaRecord;

function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
      {[3, 2, 1].map((cardCount, col) => (
        <div
          key={col}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 min-h-[300px]"
        >
          <div className="flex items-center justify-between mb-4 px-1">
            <SkeletonBlock className="h-2.5 w-20" />
            <SkeletonBlock className="h-5 w-5 rounded-full" />
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: cardCount }).map((_, i) => (
              <div
                key={i}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-2"
              >
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-3 w-2/3" />
                <SkeletonBlock className="h-3 w-12 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function IdeasAdminView() {
  const {
    settings,
    updateSettings,
    saving: settingsSaving,
  } = useModuleSettings("ideasSettings", IDEAS_DEFAULTS);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [newCat, setNewCat] = useState("");

  // Data state
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<string>(settings.defaultStatus);
  const [priority, setPriority] = useState<string>(settings.defaultPriority);
  const [tagsInput, setTagsInput] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Actions
  const [isPromotingId, setIsPromotingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

  // Undo & delayed delete
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDeletedIdeaRef = useRef<{ idea: Idea; index: number } | null>(null);

  // Dialogs & toasts
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
    isVisible: boolean;
    action?: { label: string; onClick: () => void };
  }>({ message: "", type: "success", isVisible: false });

  const showToast = (
    message: string,
    type: ToastType = "success",
    action?: { label: string; onClick: () => void },
  ) => {
    setToast({ message, type, isVisible: true, action });
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchIdeas = useCallback(async () => {
    try {
      const response = await fetch("/api/content?module_type=idea");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch ideas");
      const unsorted = data.data || [];
      const sorted = [...unsorted].sort((a: Idea, b: Idea) => {
        if (
          a.payload.order !== undefined &&
          b.payload.order !== undefined
        ) {
          return a.payload.order - b.payload.order;
        }
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
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
    setNotes("");
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
      notes: notes.trim() || undefined,
      category: category.trim() || undefined,
      status,
      priority,
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      promoted_to_portfolio: editingId
        ? ideas.find((i) => i._id === editingId)?.payload.promoted_to_portfolio
        : false,
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
            body: JSON.stringify({
              module_type: "idea",
              is_public: false,
              payload,
            }),
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
    setNotes(idea.payload.notes || "");
    setCategory(idea.payload.category || "");
    setStatus(idea.payload.status);
    setPriority(idea.payload.priority);
    setTagsInput(idea.payload.tags.join(", "));
    setEditingId(idea._id);
    setShowForm(true);
  };

  const handleReorder = async (newIdeas: Idea[]) => {
    try {
      await Promise.all(
        newIdeas.map((idea, index) => {
          const payload = { ...idea.payload, order: index };
          return fetch(`/api/content/${idea._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payload }),
          });
        }),
      );
    } catch (err) {
      console.error("Failed to persist reorder:", err);
    }
  };

  const handleUndoDelete = () => {
    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = null;
    }
    const lastDeleted = lastDeletedIdeaRef.current;
    if (lastDeleted) {
      setIdeas((prev) => {
        const updated = [...prev];
        updated.splice(lastDeleted.index, 0, lastDeleted.idea);
        const reSynced = updated.map((item, idx) => ({
          ...item,
          payload: { ...item.payload, order: idx },
        }));
        void handleReorder(reSynced);
        return reSynced;
      });
      lastDeletedIdeaRef.current = null;
      setTimeout(() => showToast("Deletion undone", "success"), 50);
    }
  };

  const handleDelete = async (id: string) => {
    const ideaToDelete = ideas.find((i) => i._id === id);
    if (!ideaToDelete) return;

    const index = ideas.findIndex((i) => i._id === id);
    setIdeas((prev) => prev.filter((i) => i._id !== id));
    lastDeletedIdeaRef.current = { idea: ideaToDelete, index };
    setConfirmDeleteId(null);

    if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);

    deleteTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
        lastDeletedIdeaRef.current = null;
      } catch (err) {
        console.error("Delayed delete failed:", err);
      }
    }, 5000);

    showToast("Idea deleted", "success", {
      label: "Undo",
      onClick: () => handleUndoDelete(),
    });
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
    return [...ideas].filter((idea) => {
      if (statusFilter !== "all" && idea.payload.status !== statusFilter)
        return false;
      if (priorityFilter !== "all" && idea.payload.priority !== priorityFilter)
        return false;
      if (!query) return true;
      const haystack =
        `${idea.payload.title} ${idea.payload.description || ""} ${idea.payload.category || ""} ${idea.payload.tags.join(" ")}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [ideas, statusFilter, priorityFilter, searchQuery]);

  const grouped = useMemo(() => {
    const res = STATUSES.reduce<Record<string, Idea[]>>(
      (acc, statusKey) => {
        acc[statusKey] = filtered.filter(
          (idea) => idea.payload.status === statusKey,
        );
        return acc;
      },
      {} as Record<string, Idea[]>,
    );
    Object.keys(res).forEach((key) => {
      res[key] = [...res[key]].sort(
        (a, b) => (a.payload.order || 0) - (b.payload.order || 0),
      );
    });
    return res;
  }, [filtered]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    const overCol = (STATUSES as readonly string[]).includes(overIdStr)
      ? overIdStr
      : ideas.find((i) => i._id === overIdStr)?.payload.status;

    if (!overCol) return;

    const activeIdeaObj = ideas.find((i) => i._id === activeIdStr);
    if (!activeIdeaObj) return;

    if (activeIdeaObj.payload.status !== overCol) {
      setIdeas((prev) =>
        prev.map((i) =>
          i._id === activeIdStr
            ? { ...i, payload: { ...i.payload, status: overCol } }
            : i,
        ),
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    if (overIdStr === "delete") {
      setConfirmDeleteId(activeIdStr);
      return;
    }

    setIdeas((prev) => {
      const oldIndex = prev.findIndex((i) => i._id === activeIdStr);
      const newIndex = prev.findIndex((i) => i._id === overIdStr);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(prev, oldIndex, newIndex);
        const withNewOrders = reordered.map((idea, index) => ({
          ...idea,
          payload: { ...idea.payload, order: index },
        }));
        void handleReorder(withNewOrders);
        return withNewOrders;
      }

      void handleReorder(prev);
      return prev;
    });
  };

  const activeIdea = activeId ? ideas.find((i) => i._id === activeId) : null;

  const stats = useMemo(() => {
    const total = ideas.length;
    const promoted = ideas.filter((i) => i.payload.promoted_to_portfolio).length;
    const active = ideas.filter((i) =>
      ["raw", "exploring"].includes(i.payload.status),
    ).length;
    const archived = ideas.filter((i) => i.payload.status === "archived").length;
    const highPriority = ideas.filter(
      (i) =>
        i.payload.priority === "high" && i.payload.status !== "archived",
    ).length;
    return { total, promoted, active, archived, highPriority };
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
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-accent/20 blur-3xl animate-pulse" />
          <div className="absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-success/10 blur-3xl" />

          <div className="relative space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
                  Idea Dump
                </h1>
                <p className="text-zinc-400 mt-1">
                  Capture raw thoughts, evolve them in pipeline, and promote
                  winners to execution.
                </p>
              </div>
              <div className="flex items-center gap-2 md:pt-1">
                <button
                  onClick={() => setShowSettings((prev) => !prev)}
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-sm transition-colors",
                    showSettings
                      ? "bg-accent/15 text-accent"
                      : "bg-zinc-800 text-zinc-400 hover:text-zinc-300",
                  )}
                  aria-label="Toggle settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                  className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-zinc-50 font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" /> New Idea
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                <p className="text-xs text-zinc-500">Total</p>
                <p className="text-lg font-semibold text-zinc-50">
                  {stats.total}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                <p className="text-xs text-zinc-500">Active Pipeline</p>
                <p className="text-lg font-semibold text-zinc-50">
                  {stats.active}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                <p className="text-xs text-zinc-500">High Priority</p>
                <p className="text-lg font-semibold text-danger">
                  {stats.highPriority}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                <p className="text-xs text-zinc-500">Promoted</p>
                <p className="text-lg font-semibold text-success">
                  {stats.promoted}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                <p className="text-xs text-zinc-500">Archived</p>
                <p className="text-lg font-semibold text-zinc-300">
                  {stats.archived}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-fade-in-up space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-50">
                Ideas Settings
              </h2>
              {settingsSaving && (
                <span className="text-xs text-accent flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="idea-default-status"
                  className="block text-xs text-zinc-500 mb-1.5"
                >
                  Default Status
                </label>
                <select
                  id="idea-default-status"
                  value={settings.defaultStatus}
                  onChange={(e) =>
                    updateSettings({ defaultStatus: e.target.value })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {IDEA_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="idea-default-priority"
                  className="block text-xs text-zinc-500 mb-1.5"
                >
                  Default Priority
                </label>
                <select
                  id="idea-default-priority"
                  value={settings.defaultPriority}
                  onChange={(e) =>
                    updateSettings({ defaultPriority: e.target.value })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-2">
                Quick Categories
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {settings.categories.map((cat: string) => (
                  <span
                    key={cat}
                    className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300"
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={() =>
                        updateSettings({
                          categories: settings.categories.filter(
                            (item: string) => item !== cat,
                          ),
                        })
                      }
                      className="text-zinc-500 hover:text-danger ml-0.5"
                      aria-label={`Remove ${cat} category`}
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
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newCat.trim()) {
                        updateSettings({
                          categories: [
                            ...settings.categories,
                            newCat.trim(),
                          ],
                        });
                        setNewCat("");
                      }
                    }
                  }}
                  placeholder="New category"
                  aria-label="New category name"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newCat.trim()) {
                      updateSettings({
                        categories: [...settings.categories, newCat.trim()],
                      });
                      setNewCat("");
                    }
                  }}
                  disabled={!newCat.trim()}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-zinc-50 rounded-lg text-sm font-medium transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form panel */}
        {showForm && (
          <IdeaFormPanel
            editingId={editingId}
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            notes={notes}
            setNotes={setNotes}
            category={category}
            setCategory={setCategory}
            status={status}
            setStatus={setStatus}
            priority={priority}
            setPriority={setPriority}
            tagsInput={tagsInput}
            setTagsInput={setTagsInput}
            isSubmitting={isSubmitting}
            formError={formError}
            categories={settings.categories}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
        )}

        {/* Filters */}
        <IdeaFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityChange={setPriorityFilter}
        />

        {/* Content */}
        {loading ? (
          <KanbanSkeleton />
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
                title={IDEA_STATUS_LABELS[statusItem]}
                count={grouped[statusItem]?.length || 0}
                isDragging={!!activeId}
              >
                <SortableContext
                  id={statusItem}
                  items={(grouped[statusItem] || []).map((i) => i._id)}
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
              styles: { active: { opacity: "0.5" } },
            }),
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
          onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
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
