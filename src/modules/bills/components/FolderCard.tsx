"use client";

import { useState } from "react";
import {
  FolderOpen,
  ChevronRight,
  MoreHorizontal,
  Check,
  FolderInput,
  Edit3,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import ContextMenu from "./ContextMenu";
import type { BillFolder } from "../types";

interface FolderCardProps {
  folder: BillFolder;
  billCount: number;
  subfolderCount: number;
  onClick: () => void;
  onRename: (name: string) => void;
  onMove: () => void;
  onDelete: () => void;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}

export default function FolderCard({
  folder,
  billCount,
  subfolderCount,
  onClick,
  onRename,
  onMove,
  onDelete,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
}: FolderCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(folder.payload.name);

  const handleRenameSubmit = () => {
    if (editName.trim() && editName.trim() !== folder.payload.name) {
      onRename(editName.trim());
    }
    setEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      role="button"
      tabIndex={0}
      aria-label={`Open folder ${folder.payload.name}`}
      className={cn(
        "relative group rounded-2xl border transition-all cursor-pointer overflow-hidden backdrop-blur-md",
        isDragOver
          ? "border-accent bg-accent/10 ring-4 ring-accent/10 scale-[1.03]"
          : "border-zinc-800/50 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-800/60 shadow-lg shadow-black/10",
      )}
      onClick={() => {
        if (!editing) onClick();
      }}
      onKeyDown={(e) => {
        if (!editing && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="p-4 flex items-center gap-4">
        <div
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300",
            isDragOver
              ? "bg-accent/20 scale-110"
              : "bg-accent/10 group-hover:bg-accent/20 group-hover:scale-105",
          )}
        >
          <FolderOpen
            className={cn(
              "w-6 h-6 text-accent transition-transform duration-300",
              isDragOver && "scale-110",
            )}
          />
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRenameSubmit}
                aria-label="Folder name"
                maxLength={100}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit();
                  if (e.key === "Escape") {
                    setEditName(folder.payload.name);
                    setEditing(false);
                  }
                }}
                className="flex-1 min-w-0 bg-zinc-800/80 border border-accent/40 rounded-xl px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/10"
              />
              <button
                onClick={handleRenameSubmit}
                aria-label="Confirm rename"
                className="p-1.5 text-success hover:bg-success/10 rounded-lg transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <h4 className="text-sm font-bold text-zinc-100 truncate group-hover:text-accent transition-colors">
                {folder.payload.name}
              </h4>
              <p className="text-xs text-zinc-500 mt-1 font-bold uppercase tracking-widest flex items-center gap-1.5">
                <span>
                  {billCount} bill{billCount !== 1 ? "s" : ""}
                </span>
                {subfolderCount > 0 && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-zinc-700" />
                    <span>
                      {subfolderCount} subfolder
                      {subfolderCount !== 1 ? "s" : ""}
                    </span>
                  </>
                )}
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu((v) => !v);
              }}
              aria-label="More options"
              className="p-2 rounded-xl text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showMenu && (
                <ContextMenu
                  items={[
                    {
                      label: "Rename",
                      icon: <Edit3 className="w-3.5 h-3.5" />,
                      onClick: () => {
                        setEditing(true);
                        setEditName(folder.payload.name);
                      },
                    },
                    {
                      label: "Move to…",
                      icon: <FolderInput className="w-3.5 h-3.5" />,
                      onClick: onMove,
                    },
                    {
                      label: "Delete",
                      icon: <Trash2 className="w-3.5 h-3.5" />,
                      onClick: onDelete,
                      danger: true,
                    },
                  ]}
                  onClose={() => setShowMenu(false)}
                />
              )}
            </AnimatePresence>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* Premium accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-accent/0 via-accent/40 to-accent/0 opacity-0 group-hover:w-1.5 group-hover:opacity-100 transition-all duration-300" />
    </motion.div>
  );
}
