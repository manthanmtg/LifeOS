"use client";

import { motion } from "framer-motion";
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
import {
  ContentDoc,
  ColorLabel,
  COLOR_LABELS,
  COLOR_BORDER,
} from "./utils";

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
  const elementCount = board.payload.elements?.length || 0;
  const colorBorder = COLOR_BORDER[board.payload.color_label || "none"];
  const colorLabel = COLOR_LABELS.find(
    (color) => color.value === board.payload.color_label,
  )?.label;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => !isRenaming && openBoard(board)}
      className={cn(
        "group relative rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition-all cursor-pointer",
        "hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 hover:scale-[1.01]",
        colorBorder && `border-l-[3px] ${colorBorder}`,
      )}
    >
      {/* Top badges */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
        {board.payload.is_favorite && (
          <div className="p-1 rounded-md bg-warning/15" title="Favorite">
            <Star className="w-3 h-3 text-warning" fill="currentColor" />
          </div>
        )}
        {board.is_public && (
          <div className="p-1 rounded-md bg-success/15" title="Public">
            <Globe className="w-3 h-3 text-success" />
          </div>
        )}
      </div>

      {/* Hover actions */}
      <div
        className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => toggleFavorite(board)}
          className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-warning/20 text-zinc-400 hover:text-warning transition-colors"
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
          onClick={() => toggleVisibility(board)}
          className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-success/20 text-zinc-400 hover:text-success transition-colors"
          aria-label={board.is_public ? "Make board private" : "Make board public"}
          title={board.is_public ? "Make private" : "Make public"}
        >
          {board.is_public ? (
            <Globe className="w-3.5 h-3.5" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={() => duplicateBoard(board)}
          className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors"
          aria-label="Duplicate board"
          title="Duplicate"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        {/* Color label picker */}
        <div className="relative group/color">
          <button
            type="button"
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Color label"
            aria-label={`Current color label: ${colorLabel || "none"}`}
          >
            <div
              className={cn(
                "w-3.5 h-3.5 rounded-full border border-zinc-600",
                COLOR_LABELS.find((c) => c.value === board.payload.color_label)
                  ?.dot || "bg-zinc-600",
              )}
            />
          </button>
          <div className="absolute right-0 top-full mt-1 hidden group-hover/color:flex bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl p-2 gap-1.5 z-50">
            {COLOR_LABELS.map((c) => (
              <button
                key={c.value}
                onClick={() => setColorLabel(board, c.value)}
                className={cn(
                  "w-5 h-5 rounded-full transition-all",
                  c.dot,
                  board.payload.color_label === c.value
                    ? "ring-2 ring-zinc-50/40 scale-110"
                    : "hover:scale-110 opacity-70 hover:opacity-100",
                )}
                title={c.label}
              />
            ))}
          </div>
        </div>
        <button
          onClick={() => {
            setRenamingId(board._id);
            setRenameValue(board.payload.name);
          }}
          type="button"
          aria-label={`Rename ${board.payload.name}`}
          className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors"
          title="Rename"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setDeleteTarget(board)}
          type="button"
          aria-label={`Delete board ${board.payload.name}`}
          className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-danger/20 text-zinc-400 hover:text-danger transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Canvas preview */}
      <div className="h-36 rounded-xl bg-zinc-950/60 border border-zinc-800/50 mb-4 flex items-center justify-center overflow-hidden">
        <WhiteboardPreview
          elements={board.payload.elements}
          files={board.payload.files}
        />
      </div>

      {/* Name */}
      {isRenaming ? (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
            className="p-1.5 rounded-lg bg-zinc-50 text-zinc-950 hover:bg-zinc-200"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <h3 className="font-semibold text-zinc-100 truncate">
          {board.payload.name}
        </h3>
      )}

      {/* Description */}
      {board.payload.description && (
        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
          {board.payload.description}
        </p>
      )}

      {/* Tags + meta row */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {board.payload.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] rounded-md font-medium"
            >
              {t}
            </span>
          ))}
          {board.payload.tags.length > 3 && (
            <span className="text-[10px] text-zinc-600">
              +{board.payload.tags.length - 3}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-600 shrink-0">
          {elementCount > 0 && (
            <span className="flex items-center gap-1">
              <Shapes className="w-3 h-3" /> {elementCount}
            </span>
          )}
          <span title={updatedMeta?.title}>{updatedMeta?.relative}</span>{" "}
        </div>
      </div>
    </motion.div>
  );
}
