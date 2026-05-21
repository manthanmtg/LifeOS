"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Edit3, GripVertical, RefreshCw, Rocket, Trash2 } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  IDEA_PRIORITY_STYLES,
  IDEA_STATUS_LABELS,
  type IdeaRecord,
} from "../shared";

/** Solid dot color per status column header — distinct from the badge opacity style */
const STATUS_DOT_COLORS: Record<string, string> = {
  raw: "bg-zinc-500",
  exploring: "bg-accent",
  archived: "bg-zinc-700",
};

interface IdeaCardProps {
  idea: IdeaRecord;
  isAnyDragging: boolean;
  isPromotingId: string | null;
  onOpen: (idea: IdeaRecord) => void;
  onPromote: (idea: IdeaRecord) => void;
  onEdit: (idea: IdeaRecord) => void;
  onDelete: (id: string) => void;
}

export function SortableIdeaCard({
  idea,
  isAnyDragging,
  isPromotingId,
  onOpen,
  onPromote,
  onEdit,
  onDelete,
}: IdeaCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: idea._id });

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
        isDragging &&
          "opacity-50 ring-2 ring-accent/50 border-accent/50 shadow-2xl z-50 scale-[1.02]",
        isAnyDragging && !isDragging && "opacity-40 grayscale-[0.5]",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-start gap-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-1 -ml-1.5 text-zinc-700 hover:text-zinc-500 cursor-grab active:cursor-grabbing touch-none rounded transition-colors hover:bg-zinc-800"
            aria-label={`Reorder idea ${idea.payload.title}`}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onOpen(idea)}
            className="rounded-md text-start focus:outline-none focus:ring-2 focus:ring-accent/40"
            aria-label={`Open details for ${idea.payload.title}`}
          >
            <p className="text-xs font-semibold text-zinc-50 line-clamp-2 leading-tight">
              {idea.payload.title}
            </p>
          </button>
        </div>

        <div className="flex gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          {!idea.payload.promoted_to_portfolio &&
            idea.payload.status !== "archived" && (
              <button
                type="button"
                onClick={() => onPromote(idea)}
                disabled={isPromotingId === idea._id}
                className="p-0.5 text-zinc-500 hover:text-success disabled:opacity-50"
                title="Promote to portfolio"
                aria-label="Promote to portfolio"
              >
                {isPromotingId === idea._id ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Rocket className="w-3 h-3" />
                )}
              </button>
            )}
          <button
            type="button"
            onClick={() => onEdit(idea)}
            disabled={isPromotingId === idea._id}
            className="p-0.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
            title="Edit"
            aria-label="Edit idea"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(idea._id)}
            disabled={isPromotingId === idea._id}
            className="p-0.5 text-zinc-500 hover:text-danger disabled:opacity-50"
            title="Delete"
            aria-label="Delete idea"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-1 ml-4">
        <span
          className={cn(
            "text-[9px] px-1.5 py-0.5 rounded-full border leading-none font-medium",
            IDEA_PRIORITY_STYLES[idea.payload.priority] ??
              IDEA_PRIORITY_STYLES.medium,
          )}
        >
          {idea.payload.priority}
        </span>
        {idea.payload.category && (
          <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">
            {idea.payload.category}
          </span>
        )}
      </div>

      {idea.payload.description ? (
        <p className="ml-4 mt-2 line-clamp-2 text-[11px] leading-5 text-zinc-400">
          {idea.payload.description}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => onOpen(idea)}
        className="ml-4 mt-2 rounded text-[11px] text-zinc-500 transition-colors hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-accent/40"
        aria-label={`View full details for ${idea.payload.title}`}
      >
        {idea.payload.promoted_to_portfolio
          ? "View promoted idea"
          : "View details"}
      </button>
    </article>
  );
}

export function DroppableColumn({
  id,
  title,
  count,
  children,
  isDragging,
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
        isOver
          ? "bg-zinc-800/80 border-accent/50 ring-4 ring-accent/10 shadow-inner"
          : "border-zinc-800/50",
        isDragging && !isOver && "border-dashed border-zinc-800",
      )}
    >
      <div className="flex items-center justify-between mb-4 px-1 shrink-0">
        <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.1em] flex items-center gap-2">
          <span
            className={cn(
              "inline-block w-1.5 h-1.5 rounded-full",
              STATUS_DOT_COLORS[id] ?? "bg-zinc-500",
            )}
          />
          {IDEA_STATUS_LABELS[id] ?? title}
        </h3>
        <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full ring-1 ring-zinc-700/50">
          {count}
        </span>
      </div>

      <div className="flex-1 space-y-2.5">{children}</div>
    </section>
  );
}

export function DeleteZone({ isDragging }: { isDragging: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "delete" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={setNodeRef}
      className={cn(
        "fixed bottom-0 left-0 right-0 h-48 flex items-center justify-center transition-all duration-500 ease-in-out z-[9999]",
        isDragging
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0 pointer-events-none",
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-danger-muted/40 via-zinc-950 to-transparent backdrop-blur-md" />
      <div
        className={cn(
          "relative px-14 py-7 rounded-full border-2 flex items-center justify-center gap-5 transition-all duration-300 shadow-[0_-20px_60px_-15px_rgba(239,68,68,0.3)]",
          isOver
            ? "bg-danger-muted border-danger text-zinc-50 scale-110 -translate-y-10"
            : "bg-zinc-950 border-danger/40 text-danger/80",
        )}
      >
        <Trash2 className={cn("w-8 h-8", isOver && "animate-bounce")} />
        <span className="font-extrabold text-xl tracking-tighter uppercase italic">
          Drop here to delete
        </span>
      </div>
    </div>,
    document.body,
  );
}

export function DragPreviewCard({ idea }: { idea: IdeaRecord }) {
  return (
    <article className="bg-zinc-900 border-2 border-accent/50 rounded-xl p-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] opacity-95 w-72 rotate-3 scale-105 ring-4 ring-accent/5 pointer-events-none">
      <div className="flex items-start gap-2 mb-2">
        <GripVertical className="w-4 h-4 text-accent/60 mt-0.5 shrink-0" />
        <p className="text-sm font-bold text-zinc-50 leading-tight">
          {idea.payload.title}
        </p>
      </div>
      <div className="flex items-center gap-1.5 ml-6">
        <span
          className={cn(
            "text-[9px] px-2 py-0.5 rounded-full border leading-none font-bold",
            IDEA_PRIORITY_STYLES[idea.payload.priority] ??
              IDEA_PRIORITY_STYLES.medium,
          )}
        >
          {idea.payload.priority}
        </span>
      </div>
    </article>
  );
}
