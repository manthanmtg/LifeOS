"use client";

import { useState } from "react";
import {
  Receipt,
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Edit3,
  Trash2,
  FolderInput,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import ContextMenu from "./ContextMenu";
import type { FolderNode } from "../types";

// ─── Folder Tree Node ────────────────────────────────────────────────────────

interface FolderNodeItemProps {
  node: FolderNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onCreateSubfolder: (parentId: string) => void;
  onMoveFolder: (folderId: string) => void;
  depth: number;
  dragOverFolderId: string | null;
  onDragOverFolder: (id: string | null) => void;
  onDropOnFolder: (folderId: string) => void;
}

function FolderNodeItem({
  node,
  selectedId,
  onSelect,
  onRename,
  onDelete,
  onCreateSubfolder,
  onMoveFolder,
  depth,
  dragOverFolderId,
  onDragOverFolder,
  onDropOnFolder,
}: FolderNodeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.payload.name);
  const [showMenu, setShowMenu] = useState(false);
  const isSelected = selectedId === node._id;
  const isDragOver = dragOverFolderId === node._id;

  const handleRename = () => {
    if (editName.trim() && editName.trim() !== node.payload.name) {
      onRename(node._id, editName.trim());
    }
    setEditing(false);
  };

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all text-sm relative",
          isSelected
            ? "bg-accent/10 text-accent"
            : isDragOver
              ? "bg-accent/5 text-accent ring-1 ring-accent/30"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800",
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => {
          if (!editing) onSelect(node._id);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDragOverFolder(node._id);
        }}
        onDragLeave={(e) => {
          e.stopPropagation();
          onDragOverFolder(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDropOnFolder(node._id);
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="w-4 h-4 flex items-center justify-center shrink-0 text-zinc-600"
        >
          {node.children.length > 0 ? (
            expanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )
          ) : (
            <span className="w-3" />
          )}
        </button>

        {isSelected ? (
          <FolderOpen className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <Folder className="w-3.5 h-3.5 shrink-0" />
        )}

        {editing ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") {
                setEditName(node.payload.name);
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 bg-transparent border-b border-accent/50 text-xs text-zinc-200 focus:outline-none"
          />
        ) : (
          <span className="flex-1 min-w-0 truncate text-xs font-medium">
            {node.payload.name}
          </span>
        )}

        <span className="text-[10px] text-zinc-600 shrink-0 tabular-nums">
          {node.billCount}
        </span>

        <div className="relative shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((v) => !v);
            }}
            className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-accent rounded transition-all"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
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
                      setEditName(node.payload.name);
                    },
                  },
                  {
                    label: "New Subfolder",
                    icon: <FolderPlus className="w-3.5 h-3.5" />,
                    onClick: () => onCreateSubfolder(node._id),
                  },
                  {
                    label: "Move Folder",
                    icon: <FolderInput className="w-3.5 h-3.5" />,
                    onClick: () => onMoveFolder(node._id),
                  },
                  {
                    label: "Delete",
                    icon: <Trash2 className="w-3.5 h-3.5" />,
                    onClick: () => onDelete(node._id),
                    danger: true,
                  },
                ]}
                onClose={() => setShowMenu(false)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && node.children.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <FolderNodeItem
                key={child._id}
                node={child}
                selectedId={selectedId}
                onSelect={onSelect}
                onRename={onRename}
                onDelete={onDelete}
                onCreateSubfolder={onCreateSubfolder}
                onMoveFolder={onMoveFolder}
                depth={depth + 1}
                dragOverFolderId={dragOverFolderId}
                onDragOverFolder={onDragOverFolder}
                onDropOnFolder={onDropOnFolder}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Folder Panel ────────────────────────────────────────────────────────────

interface FolderPanelProps {
  folderTree: FolderNode[];
  selectedFolderId: string | null;
  allBillCount: number;
  onSelect: (id: string | null) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onCreateSubfolder: (parentId: string) => void;
  onMoveFolder: (folderId: string) => void;
  showNewFolderInput: boolean;
  newFolderName: string;
  onNewFolderNameChange: (v: string) => void;
  onShowNewFolder: () => void;
  onCreateFolder: () => void;
  onCancelNewFolder: () => void;
  creatingFolder: boolean;
  dragOverFolderId: string | null;
  onDragOverFolder: (id: string | null) => void;
  onDropOnFolder: (folderId: string) => void;
  onDropOnRoot: () => void;
}

export default function FolderPanel({
  folderTree,
  selectedFolderId,
  allBillCount,
  onSelect,
  onRename,
  onDelete,
  onCreateSubfolder,
  onMoveFolder,
  showNewFolderInput,
  newFolderName,
  onNewFolderNameChange,
  onShowNewFolder,
  onCreateFolder,
  onCancelNewFolder,
  creatingFolder,
  dragOverFolderId,
  onDragOverFolder,
  onDropOnFolder,
  onDropOnRoot,
}: FolderPanelProps) {
  const isDragOverRoot = dragOverFolderId === "__root__";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 space-y-1">
      <button
        onClick={() => onSelect(null)}
        onDragOver={(e) => {
          e.preventDefault();
          onDragOverFolder("__root__");
        }}
        onDragLeave={() => onDragOverFolder(null)}
        onDrop={(e) => {
          e.preventDefault();
          onDropOnRoot();
        }}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors",
          selectedFolderId === null
            ? "bg-accent/10 text-accent"
            : isDragOverRoot
              ? "bg-accent/5 text-accent ring-1 ring-accent/30"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800",
        )}
      >
        <Receipt className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 text-left">All Bills</span>
        <span className="text-[10px] text-zinc-600 tabular-nums">
          {allBillCount}
        </span>
      </button>

      <div className="py-0.5">
        {folderTree.map((node) => (
          <FolderNodeItem
            key={node._id}
            node={node}
            selectedId={selectedFolderId}
            onSelect={onSelect}
            onRename={onRename}
            onDelete={onDelete}
            onCreateSubfolder={onCreateSubfolder}
            onMoveFolder={onMoveFolder}
            depth={0}
            dragOverFolderId={dragOverFolderId}
            onDragOverFolder={onDragOverFolder}
            onDropOnFolder={onDropOnFolder}
          />
        ))}
      </div>

      {showNewFolderInput && (
        <div className="px-2 py-1">
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type="text"
              value={newFolderName}
              onChange={(e) => onNewFolderNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCreateFolder();
                if (e.key === "Escape") onCancelNewFolder();
              }}
              placeholder="Folder name"
              className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-accent/50"
            />
            <button
              onClick={onCreateFolder}
              disabled={creatingFolder || !newFolderName.trim()}
              className="p-1 text-zinc-400 hover:text-success disabled:opacity-50 rounded transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onCancelNewFolder}
              className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {!showNewFolderInput && (
        <button
          onClick={onShowNewFolder}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          New Folder
        </button>
      )}
    </div>
  );
}
