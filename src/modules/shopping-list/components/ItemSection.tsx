"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  X,
} from "lucide-react";
import { ShoppingItem } from "../types";

interface ItemSectionProps {
  title: string;
  count: number;
  items: ShoppingItem[];
  emptyMessage: string;
  listId: string;
  purchased: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
  onToggleItem: (listId: string, itemId: string) => void;
  onDeleteItem: (listId: string, itemId: string) => void;
}

export default function ItemSection({
  title,
  count,
  items,
  emptyMessage,
  listId,
  purchased,
  isCollapsed = false,
  onToggleCollapse,
  actionLabel,
  onAction,
  suggestions = [],
  onSuggestionSelect,
  onToggleItem,
  onDeleteItem,
}: ItemSectionProps) {
  const isHidden = purchased && isCollapsed;

  return (
    <section className="space-y-3 rounded-3xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-sm shadow-zinc-950/40 transition-colors duration-200 hover:border-zinc-700/80 hover:bg-zinc-950/60">
      <div
        className={`flex items-center justify-between gap-3 rounded-xl px-1 py-1 transition-colors duration-200 ${
          purchased
            ? "cursor-pointer hover:bg-zinc-900/60"
            : ""
        }`}
        onClick={purchased ? onToggleCollapse : undefined}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            {title}
          </h3>
          {purchased &&
            (isCollapsed ? (
              <ChevronDown className="h-3.5 w-3.5 text-zinc-600" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5 text-zinc-600" />
            ))}
        </div>

        <div className="flex items-center gap-2">
          {actionLabel && onAction ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onAction();
              }}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium text-zinc-500 transition-colors hover:text-danger"
            >
              {actionLabel}
            </button>
          ) : null}
          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-500">
            {count}
          </span>
        </div>
      </div>

      {!purchased && suggestions.length > 0 && onSuggestionSelect ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-accent/20 bg-accent/5 p-3">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>Common picks</span>
          </div>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSuggestionSelect(suggestion)}
              className="rounded-full border border-accent/20 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-accent/40 hover:text-accent"
            >
              + {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      {!isHidden ? (
        items.length > 0 ? (
          <motion.div
            layout
            className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className={`group flex items-center gap-3 rounded-2xl border p-3 transition-colors ${
                    purchased
                      ? "border-zinc-800 bg-zinc-900/70"
                      : "border-zinc-800 bg-zinc-900/40 hover:border-accent/20"
                  }`}
                >
                  <button
                    type="button"
                    aria-label={`${item.purchased ? "Unmark" : "Mark"} ${item.name}`}
                    onClick={() => onToggleItem(listId, item.id)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                      purchased
                        ? "border-success bg-success text-zinc-950"
                        : "border-zinc-700 hover:border-accent"
                    }`}
                  >
                    {purchased ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-sm bg-accent/20 opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-medium ${
                        purchased
                          ? "text-zinc-400 line-through"
                          : "text-zinc-100"
                      }`}
                    >
                      {item.name}
                    </p>
                    {item.quantity || item.unit ? (
                      <p className="text-xs text-zinc-500">
                        {item.quantity} {item.unit}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    aria-label={`Delete ${item.name}`}
                    onClick={() => onDeleteItem(listId, item.id)}
                    className="rounded-lg p-1.5 text-zinc-600 opacity-0 transition-all hover:text-danger group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/10 px-4 py-8 text-center text-sm text-zinc-500">
            <p className="font-medium text-zinc-600">{emptyMessage}</p>
          </div>
        )
      ) : null}
    </section>
  );
}
