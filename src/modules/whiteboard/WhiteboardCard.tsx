"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  Star,
  Globe,
  Lock,
  Copy,
  Edit3,
  Trash2,
  Save,
  Shapes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import WhiteboardPreview from "./WhiteboardPreview";
import { ContentDoc, ColorLabel, COLOR_LABELS, COLOR_BORDER } from "./utils";

interface WhiteboardCardProps {
  board: ContentDoc;
  isRenaming: boolean;
  renameValue: string;
  setRenameValue: (value: string) => void;
  handleRename: (id: string) => void;
  setRenamingId: (id: string | null) => void;
  openBoard: (board: ContentDoc) => void;
  toggleFavorite: (board: ContentDoc) => void;
  toggleVisibility: (board: ContentDoc) => void;
  duplicateBoard: (board: ContentDoc) => void;
  setColorLabel: (board: ContentDoc, color: ColorLabel) => void;
  setDeleteTarget: (board: ContentDoc) => void;
  updatedMeta?: { title: string; relative: string };
}

export default function WhiteboardCard({
  board,
  isRenaming,
  renameValue,
  setRenameValue,
  handleRename,
  setRenamingId,
  openBoard,
  toggleFavorite,
  toggleVisibility,
  duplicateBoard,
  setColorLabel,
  setDeleteTarget,
  updatedMeta,
}: WhiteboardCardProps) {
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const elementCount = board.payload.elements?.length || 0;
  const colorBorder = COLOR_BORDER[board.payload.color_label || "none"];
  const colorLabel = COLOR_LABELS.find(
    (color) => color.value === board.payload.color_label,
  )?.label;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group relative rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition-all",
        "hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 hover:scale-[1.01]",
        colorBorder && `border-l-[3px] ${colorBorder}`,
      )}
    >
      {!isRenaming && (
        <button
          type="button"
          onClick={() => openBoard(board)}
          aria-label={`Open ${board.payload.name}`}
          className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
        />
      )}

      {/* Top badges */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20 pointer-events-none">
        {board.payload.is_favorite && (
          <div
            className="p-1 rounded-md bg-warning/15"
            title="Favorite"
            aria-label="Favorite board"
          >
            <Star className="w-3 h-3 text-warning" fill="currentColor" />
          </div>
        )}
        {board.is_public && (
          <div
            className="p-1 rounded-md bg-success/15"
            title="Public"
            aria-label="Public board"
          >
            <Globe className="w-3 h-3 text-success" />
          </div>
        )}
      </div>

      {/* Card actions remain visible for touch and reveal on hover/focus at md+. */}
      <div
        aria-label="Board actions"
        className="absolute top-3 right-3 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity z-30"
      >
        <button
          type="button"
          onClick={() => toggleFavorite(board)}
          className="min-h-11 min-w-11 p-2 rounded-lg bg-zinc-800/90 hover:bg-warning/20 text-zinc-400 hover:text-warning transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label={
            board.payload.is_favorite ? "Unfavorite board" : "Favorite board"
          }
          title="Favorite"
        >
          <Star
            className="w-3.5 h-3.5"
            fill={board.payload.is_favorite ? "currentColor" : "none"}
          />
        </button>
        <button
          type="button"
          onClick={() => toggleVisibility(board)}
          className="min-h-11 min-w-11 p-2 rounded-lg bg-zinc-800/90 hover:bg-success/20 text-zinc-400 hover:text-success transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label={
            board.is_public ? "Make board private" : "Make board public"
          }
          title={board.is_public ? "Make private" : "Make public"}
        >
          {board.is_public ? (
            <Globe className="w-3.5 h-3.5" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={() => duplicateBoard(board)}
          className="min-h-11 min-w-11 p-2 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Duplicate board"
          title="Duplicate"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        {/* Color label picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setColorMenuOpen((open) => !open)}
            className="min-h-11 min-w-11 p-2 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="Color label"
            aria-label={`Current color label: ${colorLabel || "none"}`}
            aria-haspopup="true"
            aria-expanded={colorMenuOpen}
            aria-controls={`board-color-${board._id}`}
          >
            <div
              className={cn(
                "w-3.5 h-3.5 rounded-full border border-zinc-600",
                COLOR_LABELS.find((c) => c.value === board.payload.color_label)
                  ?.dot || "bg-zinc-600",
              )}
            />
          </button>
          {colorMenuOpen && (
            <div
              id={`board-color-${board._id}`}
              role="radiogroup"
              aria-label="Board color label"
              className="absolute right-0 top-full mt-1 flex bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl p-2 gap-1 z-50"
            >
              {COLOR_LABELS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-label={c.label}
                  aria-checked={board.payload.color_label === c.value}
                  onClick={() => {
                    setColorLabel(board, c.value);
                    setColorMenuOpen(false);
                  }}
                  className={cn(
                    "min-h-11 min-w-11 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    c.dot,
                    board.payload.color_label === c.value
                      ? "ring-2 ring-zinc-50/40 scale-105"
                      : "hover:scale-105 opacity-80 hover:opacity-100",
                  )}
                  title={c.label}
                />
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => {
            setRenamingId(board._id);
            setRenameValue(board.payload.name);
          }}
          type="button"
          aria-label={`Rename ${board.payload.name}`}
          className="min-h-11 min-w-11 p-2 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          title="Rename"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setDeleteTarget(board)}
          type="button"
          aria-label={`Delete board ${board.payload.name}`}
          className="min-h-11 min-w-11 p-2 rounded-lg bg-zinc-800/90 hover:bg-danger/20 text-zinc-400 hover:text-danger transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Canvas preview */}
      <div className="relative z-10 pointer-events-none h-36 rounded-xl bg-zinc-950/60 border border-zinc-800/50 mb-4 flex items-center justify-center overflow-hidden">
        <WhiteboardPreview
          elements={board.payload.elements}
          files={board.payload.files}
        />
      </div>

      {/* Name */}
      {isRenaming ? (
        <div className="relative z-20 flex gap-2">
          <input
            type="text"
            aria-label="Board name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename(board._id);
              if (e.key === "Escape") {
                setRenamingId(null);
                setRenameValue("");
              }
            }}
            autoFocus
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-accent/50"
          />
          <button
            type="button"
            aria-label="Save board name"
            title="Save"
            onClick={() => handleRename(board._id)}
            className="min-h-11 min-w-11 p-2 rounded-lg bg-zinc-50 text-zinc-950 hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <h3 className="relative z-10 pointer-events-none font-semibold text-zinc-100 truncate">
          {board.payload.name}
        </h3>
      )}

      {/* Description */}
      {board.payload.description && (
        <p className="relative z-10 pointer-events-none text-xs text-zinc-500 mt-0.5 line-clamp-1">
          {board.payload.description}
        </p>
      )}

      {/* Tags + meta row */}
      <div className="relative z-10 pointer-events-none flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {board.payload.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-xs rounded-md font-medium"
            >
              {t}
            </span>
          ))}
          {board.payload.tags.length > 3 && (
            <span className="text-xs text-zinc-600">
              +{board.payload.tags.length - 3}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-600 shrink-0">
          {elementCount > 0 && (
            <span className="flex items-center gap-1">
              <Shapes className="w-3 h-3" /> {elementCount}
            </span>
          )}
          <span title={updatedMeta?.title}>{updatedMeta?.relative}</span>{" "}
        </div>
      </div>
    </motion.article>
  );
}
