"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type FormEvent,
} from "react";
import { Lightbulb } from "lucide-react";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  DragOverlay,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Toast, { type ToastType } from "@/components/ui/Toast";
import { AdminModuleSkeleton, SkeletonBlock } from "@/components/ui/Skeletons";
import IdeaDetailsModal from "./IdeaDetailsModal";
import { IDEA_STATUS_LABELS, type IdeaRecord } from "./shared";
import {
  DeleteZone,
  DragPreviewCard,
  DroppableColumn,
  SortableIdeaCard,
} from "./components/IdeaKanban";
import IdeaFormPanel from "./components/IdeaFormPanel";
import IdeaFilters from "./components/IdeaFilters";
import IdeaDashboardHeader from "./components/IdeaDashboardHeader";
import IdeaSettingsPanel from "./components/IdeaSettingsPanel";
import {
  filterIdeas,
  getIdeaCategoryOptions,
  getIdeaMetrics,
  getIdeaReviewQueue,
  getIdeaSpotlight,
  normalizeIdeaCategories,
  sortIdeasForReview,
} from "./insights";
import {
  getIdeaBoardStatus,
  IDEA_BOARD_STATUSES,
  isIdeaBoardStatus,
  normalizeIdeaBoardOrder,
  projectIdeaBoardMove,
} from "./dnd";

const STATUSES = IDEA_BOARD_STATUSES;

const IDEAS_DEFAULTS = {
  defaultStatus: "raw",
  defaultPriority: "medium",
  categories: ["Product", "Personal", "Research", "Business", "Creative"],
};

type Idea = IdeaRecord;

function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 animate-pulse md:grid-cols-2 xl:grid-cols-3">
      {[3, 2, 1].map((cardCount, col) => (
        <div
          key={col}
          className="min-h-[300px] rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4"
        >
          <div className="mb-4 flex items-center justify-between px-1">
            <SkeletonBlock className="h-2.5 w-20" />
            <SkeletonBlock className="h-5 w-5 rounded-full" />
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: cardCount }).map((_, index) => (
              <div
                key={index}
                className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3"
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
    loaded: settingsLoaded,
  } = useModuleSettings("ideasSettings", IDEAS_DEFAULTS);

  const [showSettings, setShowSettings] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<string>(IDEAS_DEFAULTS.defaultStatus);
  const [priority, setPriority] = useState<string>(
    IDEAS_DEFAULTS.defaultPriority,
  );
  const [tagsInput, setTagsInput] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [isPromotingId, setIsPromotingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
    isVisible: boolean;
    action?: { label: string; onClick: () => void };
  }>({ message: "", type: "success", isVisible: false });

  const dragSnapshotRef = useRef<Idea[] | null>(null);
  const lastOverId = useRef<string | null>(null);
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDeletedIdeaRef = useRef<{ idea: Idea; index: number } | null>(null);

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = "success",
      action?: { label: string; onClick: () => void },
    ) => {
      setToast({ message, type, isVisible: true, action });
    },
    [],
  );

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
    setLoading(true);
    try {
      const response = await fetch("/api/content?module_type=idea");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch ideas");

      const unsorted = (data.data || []) as Idea[];
      const sorted = [...unsorted].sort((a, b) => {
        if (a.payload.order !== undefined && b.payload.order !== undefined) {
          return a.payload.order - b.payload.order;
        }

        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      setIdeas(normalizeIdeaBoardOrder(sorted));
    } catch (error: unknown) {
      console.error("fetchIdeas failed:", error);
      showToast("Could not load ideas", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void fetchIdeas();
  }, [fetchIdeas]);

  useEffect(() => {
    setStatus(settings.defaultStatus);
    setPriority(settings.defaultPriority);
  }, [settings.defaultPriority, settings.defaultStatus]);

  const resetForm = useCallback(() => {
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
  }, [settings.defaultPriority, settings.defaultStatus]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setCategoryFilter("all");
  };

  const handleSubmit = async (event: FormEvent) => {
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
        .map((tag) => tag.trim())
        .filter(Boolean),
      promoted_to_portfolio: editingId
        ? ideas.find((idea) => idea._id === editingId)?.payload
            .promoted_to_portfolio
        : false,
    };

    setIsSubmitting(true);
    setFormError("");

    try {
      const response = editingId
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

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save idea");

      resetForm();
      await fetchIdeas();
      showToast(editingId ? "Idea updated" : "Idea added", "success");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save";
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

  const handleReorder = async (nextIdeas: Idea[]) => {
    try {
      const normalizedIdeas = normalizeIdeaBoardOrder(nextIdeas);

      await Promise.all(
        normalizedIdeas.map(async (idea) => {
          const payload = {
            ...idea.payload,
            order: idea.payload.order ?? 0,
          };

          const response = await fetch(`/api/content/${idea._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payload }),
          });

          if (!response.ok) {
            throw new Error(`Failed to persist order for ${idea._id}`);
          }
        }),
      );
    } catch (error) {
      console.error("Failed to persist reorder:", error);
      showToast("Could not save board order", "error");
    }
  };

  const handleUndoDelete = () => {
    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = null;
    }

    const lastDeleted = lastDeletedIdeaRef.current;
    if (!lastDeleted) return;

    setIdeas((prev) => {
      const updated = [...prev];
      updated.splice(lastDeleted.index, 0, lastDeleted.idea);
      const nextIdeas = normalizeIdeaBoardOrder(updated);
      void handleReorder(nextIdeas);
      return nextIdeas;
    });

    lastDeletedIdeaRef.current = null;
    setTimeout(() => showToast("Deletion undone", "success"), 50);
  };

  const handleDelete = async (id: string) => {
    const ideaToDelete = ideas.find((idea) => idea._id === id);
    if (!ideaToDelete) return;

    const index = ideas.findIndex((idea) => idea._id === id);
    setIdeas((prev) => {
      const nextIdeas = normalizeIdeaBoardOrder(
        prev.filter((idea) => idea._id !== id),
      );
      void handleReorder(nextIdeas);
      return nextIdeas;
    });

    lastDeletedIdeaRef.current = { idea: ideaToDelete, index };
    setConfirmDeleteId(null);

    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
    }

    deleteTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/content/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Delete failed");
        lastDeletedIdeaRef.current = null;
      } catch (error) {
        console.error("Delayed delete failed:", error);
        showToast("Could not delete idea", "error");
      }
    }, 5000);

    showToast("Idea deleted", "success", {
      label: "Undo",
      onClick: handleUndoDelete,
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
      const response = await fetch(`/api/content/${idea._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Promotion failed");

      await fetchIdeas();
      showToast("Idea promoted to portfolio", "success");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to promote";
      showToast(message, "error");
    } finally {
      setIsPromotingId(null);
    }
  };

  const filtered = useMemo(
    () =>
      filterIdeas(ideas, {
        searchQuery,
        statusFilter,
        priorityFilter,
        categoryFilter,
      }),
    [categoryFilter, ideas, priorityFilter, searchQuery, statusFilter],
  );

  const grouped = useMemo(() => {
    const result = STATUSES.reduce<Record<string, Idea[]>>((acc, statusKey) => {
      acc[statusKey] = filtered.filter(
        (idea) => idea.payload.status === statusKey,
      );
      return acc;
    }, {});

    Object.keys(result).forEach((key) => {
      result[key] = [...result[key]].sort(
        (a, b) => (a.payload.order || 0) - (b.payload.order || 0),
      );
    });

    return result;
  }, [filtered]);

  const collisionDetectionStrategy = useCallback<CollisionDetection>(
    (args) => {
      if (statusFilter !== "all") {
        return closestCenter(args);
      }

      const pointerIntersections = pointerWithin(args);
      const intersections =
        pointerIntersections.length > 0
          ? pointerIntersections
          : rectIntersection(args);
      let overId = getFirstCollision(intersections, "id");

      if (!overId) {
        return lastOverId.current ? [{ id: lastOverId.current }] : [];
      }

      if (String(overId) === "delete") {
        lastOverId.current = String(overId);
        return [{ id: overId }];
      }

      const overStatus = getIdeaBoardStatus(String(overId), ideas);
      if (
        overStatus &&
        isIdeaBoardStatus(String(overId)) &&
        grouped[overStatus]?.length
      ) {
        const columnItemIds = new Set(
          grouped[overStatus].map((idea) => idea._id),
        );
        const closestIdea = closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter((container) =>
            columnItemIds.has(String(container.id)),
          ),
        });
        const closestIdeaId = getFirstCollision(closestIdea, "id");

        if (closestIdeaId) {
          overId = closestIdeaId;
        }
      }

      lastOverId.current = String(overId);
      return [{ id: overId }];
    },
    [grouped, ideas, statusFilter],
  );

  const handleDragStart = (event: DragStartEvent) => {
    dragSnapshotRef.current = ideas;
    lastOverId.current = null;
    setActiveId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const translatedTop = active.rect.current.translated?.top;
    const insertAfter =
      translatedTop !== undefined
        ? translatedTop > over.rect.top + over.rect.height / 2
        : false;

    setIdeas((prev) => {
      const nextIdeas = projectIdeaBoardMove({
        ideas: prev,
        activeId: String(active.id),
        overId: String(over.id),
        insertAfter,
      });

      const didChange =
        nextIdeas.length !== prev.length ||
        nextIdeas.some(
          (idea, index) =>
            idea._id !== prev[index]?._id ||
            idea.payload.status !== prev[index]?.payload.status ||
            idea.payload.order !== prev[index]?.payload.order,
        );

      return didChange ? nextIdeas : prev;
    });
  };

  const handleDragCancel = () => {
    setActiveId(null);
    lastOverId.current = null;

    if (dragSnapshotRef.current) {
      setIdeas(dragSnapshotRef.current);
    }

    dragSnapshotRef.current = null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    lastOverId.current = null;

    if (!over) {
      if (dragSnapshotRef.current) {
        setIdeas(dragSnapshotRef.current);
      }
      dragSnapshotRef.current = null;
      return;
    }

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    if (overIdStr === "delete") {
      if (dragSnapshotRef.current) {
        setIdeas(dragSnapshotRef.current);
      }
      dragSnapshotRef.current = null;
      setConfirmDeleteId(activeIdStr);
      return;
    }

    setIdeas((prev) => {
      const translatedTop = active.rect.current.translated?.top;
      const insertAfter =
        translatedTop !== undefined
          ? translatedTop > over.rect.top + over.rect.height / 2
          : false;
      const nextIdeas = projectIdeaBoardMove({
        ideas: prev,
        activeId: activeIdStr,
        overId: overIdStr,
        insertAfter,
      });

      void handleReorder(nextIdeas);
      return nextIdeas;
    });

    dragSnapshotRef.current = null;
  };

  const stats = useMemo(() => getIdeaMetrics(ideas), [ideas]);
  const spotlight = useMemo(() => getIdeaSpotlight(ideas), [ideas]);
  const reviewQueue = useMemo(() => getIdeaReviewQueue(ideas), [ideas]);
  const categoryOptions = useMemo(
    () => getIdeaCategoryOptions(ideas, settings.categories),
    [ideas, settings.categories],
  );
  const activeIdea = activeId
    ? ideas.find((idea) => idea._id === activeId)
    : null;
  const sortedFiltered = useMemo(
    () => sortIdeasForReview(filtered),
    [filtered],
  );

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    categoryFilter !== "all";

  if (!settingsLoaded) {
    return <AdminModuleSkeleton />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div className="relative space-y-6">
        <IdeaDashboardHeader
          showSettings={showSettings}
          stats={stats}
          spotlight={spotlight}
          onToggleSettings={() => setShowSettings((prev) => !prev)}
          onCreateIdea={() => {
            resetForm();
            setShowForm(true);
          }}
        />

        {showSettings ? (
          <IdeaSettingsPanel
            categories={settings.categories}
            defaultPriority={settings.defaultPriority}
            defaultStatus={settings.defaultStatus}
            newCategory={newCategory}
            saving={settingsSaving}
            onDefaultPriorityChange={(value) =>
              updateSettings({ defaultPriority: value })
            }
            onDefaultStatusChange={(value) =>
              updateSettings({ defaultStatus: value })
            }
            onNewCategoryChange={setNewCategory}
            onCategoriesChange={(categories) =>
              updateSettings({
                categories: normalizeIdeaCategories(categories),
              })
            }
          />
        ) : null}

        {showForm ? (
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
            categories={categoryOptions}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
        ) : null}

        {reviewQueue.length > 0 ? (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-50">
                  Review Queue
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Highest-signal ideas surfaced so they do not get buried.
                </p>
              </div>
              {stats.reviewCount > reviewQueue.length ? (
                <span className="text-xs text-zinc-500">
                  {stats.reviewCount - reviewQueue.length} more high-priority
                  idea{stats.reviewCount - reviewQueue.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {reviewQueue.map((idea) => (
                <button
                  key={idea._id}
                  type="button"
                  onClick={() => setSelectedIdea(idea)}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-left transition-colors hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-accent/35"
                >
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                    {IDEA_STATUS_LABELS[idea.payload.status]} ·{" "}
                    {idea.payload.priority}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-50">
                    {idea.payload.title}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">
                    {idea.payload.description || "No description yet."}
                  </p>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <IdeaFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityChange={setPriorityFilter}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          categoryOptions={categoryOptions}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {loading ? (
          <KanbanSkeleton />
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 py-14 text-center text-zinc-500">
            <Lightbulb className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>No ideas match the current filters.</p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-50"
              >
                Reset filters
              </button>
            ) : null}
          </div>
        ) : statusFilter === "all" ? (
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
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
                  items={(grouped[statusItem] || []).map((idea) => idea._id)}
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortedFiltered.map((idea) => (
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
