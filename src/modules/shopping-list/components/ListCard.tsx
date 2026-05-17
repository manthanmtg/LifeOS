"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Copy, ShoppingBag, Trash2 } from "lucide-react";
import { ShoppingListDocument } from "../types";
import { formatUpdatedDate, summarizeList } from "../helpers";

interface ListCardProps {
  list: ShoppingListDocument;
  onOpen: (listId: string) => void;
  onDuplicate: (list: ShoppingListDocument) => void;
  onDelete: (listId: string) => void;
}

const ListCard = ({
  list,
  onOpen,
  onDuplicate,
  onDelete,
}: ListCardProps) => {
  const summary = useMemo(() => summarizeList(list.payload), [list.payload]);
  const updatedLabel = useMemo(
    () => formatUpdatedDate(list.updated_at),
    [list.updated_at],
  );

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onClick={() => onOpen(list._id)}
      className="group relative cursor-pointer overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-sm transition-all hover:border-accent/30 hover:bg-zinc-900"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Shopping List</span>
          </div>
          <h3 className="truncate text-base font-semibold text-zinc-50">
            {list.payload.title}
          </h3>
          <p className="text-xs text-zinc-500">
            {summary.remainingItems} left, {summary.purchasedItems} picked up
          </p>
        </div>

        <button
          type="button"
          aria-label={`Delete ${list.payload.title}`}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(list._id);
          }}
          className="rounded-xl p-2 text-zinc-500 transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{summary.totalItems} items</span>
          <span>{summary.completionPercent}% complete</span>
        </div>

        <div className="h-2 rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${summary.completionPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-500">
            Updated {updatedLabel}
          </span>

          <button
            type="button"
            aria-label={`Duplicate ${list.payload.title}`}
            onClick={(event) => {
              event.stopPropagation();
              onDuplicate(list);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-accent/30 hover:text-accent"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export default memo(ListCard);
