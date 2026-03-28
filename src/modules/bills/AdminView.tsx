"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus,
  Receipt,
  Folder,
  FolderOpen,
  FolderPlus,
  Paperclip,
  ChevronRight,
  Search,
  Calendar,
  Edit3,
  Home,
  Trash2,
  FolderInput,
  MoreHorizontal,
  Check,
  X,
  LayoutGrid,
  List,
  UploadCloud,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { AdminModuleSkeleton } from "@/components/ui/Skeletons";
import {
  getBillsForFolder,
  getSubfolders,
  getBreadcrumbPath,
  getAllDescendantFolderIds,
  formatDate,
} from "./helpers";
import BillDetail from "./components/BillDetail";
import BillModal from "./components/BillModal";
import MoveFolderModal from "./components/MoveFolderModal";
import PdfThumbnail from "./components/PdfThumbnail";
import type { Bill, BillFolder, BillAttachment } from "./types";

// ─── Toast ───────────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const show = useCallback((msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return { toast, show };
}

// ─── Breadcrumb ──────────────────────────────────────────────────────────────

function Breadcrumb({
  path,
  onNavigate,
}: {
  path: { id: string | null; name: string }[];
  onNavigate: (id: string | null) => void;
}) {
  return (
    <nav className="flex items-center gap-0.5 min-w-0 overflow-x-auto no-scrollbar">
      {path.map((crumb, i) => (
        <div
          key={crumb.id ?? "root"}
          className="flex items-center gap-0.5 shrink-0"
        >
          {i > 0 && (
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
          )}
          {i === path.length - 1 ? (
            <span className="text-sm font-semibold text-zinc-100 px-2 py-1">
              {crumb.name}
            </span>
          ) : (
            <button
              onClick={() => onNavigate(crumb.id)}
              className="text-sm text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded-lg hover:bg-zinc-800 transition-colors font-medium"
            >
              {crumb.id === null ? <Home className="w-4 h-4" /> : crumb.name}
            </button>
          )}
        </div>
      ))}
    </nav>
  );
}

// ─── Folder Context Menu ─────────────────────────────────────────────────────

function FolderContextMenu({
  onRename,
  onMove,
  onDelete,
  onClose,
}: {
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const items = [
    {
      label: "Rename",
      icon: <Edit3 className="w-3.5 h-3.5" />,
      onClick: onRename,
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
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.1 }}
      className="absolute right-2 top-full mt-1 z-50 min-w-[160px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/50 py-1 overflow-hidden"
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            item.onClick();
            onClose();
          }}
          className={cn(
            "w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors",
            item.danger
              ? "text-danger hover:bg-danger/10"
              : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100",
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </motion.div>
  );
}

// ─── Folder Card ─────────────────────────────────────────────────────────────

function FolderCard({
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
}: {
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
}) {
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
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative group rounded-2xl border transition-all cursor-pointer",
        isDragOver
          ? "border-accent bg-accent/5 ring-2 ring-accent/20 scale-[1.02]"
          : "border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800/60",
      )}
      onClick={() => {
        if (!editing) onClick();
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="p-4 flex items-center gap-3">
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors",
            isDragOver
              ? "bg-accent/15"
              : "bg-accent/10 group-hover:bg-accent/15",
          )}
        >
          <FolderOpen className="w-5 h-5 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit();
                  if (e.key === "Escape") {
                    setEditName(folder.payload.name);
                    setEditing(false);
                  }
                }}
                className="flex-1 min-w-0 bg-zinc-800 border border-accent/40 rounded-lg px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:border-accent/60"
              />
              <button
                onClick={handleRenameSubmit}
                className="p-1 text-zinc-400 hover:text-success rounded transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-zinc-200 truncate">
                {folder.payload.name}
              </p>
              <p className="text-[11px] text-zinc-600 mt-0.5">
                {billCount} bill{billCount !== 1 ? "s" : ""}
                {subfolderCount > 0 &&
                  ` · ${subfolderCount} folder${subfolderCount !== 1 ? "s" : ""}`}
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
              className="p-1.5 rounded-lg text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-zinc-300 hover:bg-zinc-700 transition-all"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showMenu && (
                <FolderContextMenu
                  onRename={() => {
                    setEditing(true);
                    setEditName(folder.payload.name);
                  }}
                  onMove={onMove}
                  onDelete={onDelete}
                  onClose={() => setShowMenu(false)}
                />
              )}
            </AnimatePresence>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Inline New Folder Card ──────────────────────────────────────────────────

function NewFolderInlineCard({
  onSubmit,
  onCancel,
  creating,
}: {
  onSubmit: (name: string) => void;
  onCancel: () => void;
  creating: boolean;
}) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border-2 border-dashed border-accent/30 bg-accent/5 p-4 flex items-center gap-3"
    >
      <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
        <FolderPlus className="w-5 h-5 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onCancel();
          }}
          placeholder="Folder name…"
          disabled={creating}
          className="w-full bg-transparent border-b border-accent/30 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-accent/60 pb-1 disabled:opacity-50"
        />
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleSubmit}
          disabled={creating || !name.trim()}
          className="p-1.5 text-accent hover:text-accent-hover disabled:opacity-40 rounded-lg hover:bg-accent/10 transition-colors"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={onCancel}
          className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Bill Card ───────────────────────────────────────────────────────────────

function BillCard({
  bill,
  folder,
  onClick,
  onEdit,
  onDragStart,
}: {
  bill: Bill;
  folder?: BillFolder;
  onClick: () => void;
  onEdit: (bill: Bill) => void;
  onDragStart: () => void;
}) {
  const attachCount = bill.payload.attachments?.length ?? 0;
  const firstImage = bill.payload.attachments?.find((a) =>
    a.content_type.startsWith("image/"),
  );
  const firstPDF = bill.payload.attachments?.find(
    (a) => a.content_type === "application/pdf",
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      draggable
      onDragStart={onDragStart}
      className="group bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden cursor-pointer hover:border-zinc-600 hover:shadow-lg hover:shadow-black/20 transition-all flex flex-col h-full"
      onClick={onClick}
    >
      {firstImage ? (
        <div className="h-28 sm:h-32 w-full bg-zinc-800 overflow-hidden shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:${firstImage.content_type};base64,${firstImage.data}`}
            alt=""
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
        </div>
      ) : firstPDF ? (
        <PdfThumbnail
          base64Data={firstPDF.data}
          className="h-28 sm:h-32 w-full shrink-0 border-b border-zinc-800"
        />
      ) : (
        <div className="h-20 sm:h-24 w-full bg-zinc-800/30 flex items-center justify-center shrink-0 border-b border-zinc-800/50">
          <Receipt className="w-8 h-8 text-zinc-600/50" />
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-100 truncate">
              {bill.payload.name}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(bill.payload.bill_date)}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(bill);
            }}
            className="p-1.5 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-accent rounded-lg hover:bg-zinc-800 transition-all shrink-0"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>

        {bill.payload.description && (
          <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed flex-1">
            {bill.payload.description}
          </p>
        )}

        <div className="flex items-center gap-3 pt-3 mt-auto border-t border-zinc-800/60">
          {folder && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-600">
              <Folder className="w-3 h-3" />
              {folder.payload.name}
            </span>
          )}
          {attachCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-500 ml-auto font-medium">
              <Paperclip className="w-3 h-3" />
              {attachCount}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function BillListRow({
  bill,
  folder,
  onClick,
  onEdit,
  onDragStart,
}: {
  bill: Bill;
  folder?: BillFolder;
  onClick: () => void;
  onEdit: (bill: Bill) => void;
  onDragStart: () => void;
}) {
  const attachCount = bill.payload.attachments?.length ?? 0;
  const hasPDF = bill.payload.attachments?.some(
    (a) => a.content_type === "application/pdf",
  );
  const hasImg = bill.payload.attachments?.some((a) =>
    a.content_type.startsWith("image/"),
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="group flex items-center justify-between px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-600 hover:bg-zinc-800/60 transition-all gap-4"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {hasImg ? (
          <div className="w-9 h-9 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center shrink-0">
            <ImageIcon className="w-4 h-4 text-accent/80" />
          </div>
        ) : hasPDF ? (
          <PdfThumbnail
            base64Data={
              bill.payload.attachments!.find(
                (a) => a.content_type === "application/pdf",
              )!.data
            }
            className="w-9 h-9 rounded-lg shrink-0 pointer-events-none"
            isListRow
          />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4 text-zinc-500" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-100 truncate">
            {bill.payload.name}
          </p>
          <p className="text-[11px] text-zinc-500 truncate flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />{" "}
              {formatDate(bill.payload.bill_date)}
            </span>
            {folder && (
              <>
                <span className="text-zinc-700">&bull;</span>
                <span className="flex items-center gap-1">
                  <Folder className="w-3 h-3" /> {folder.payload.name}
                </span>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {attachCount > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <Paperclip className="w-3.5 h-3.5" /> {attachCount}
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(bill);
          }}
          className="p-1.5 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-accent rounded-lg hover:bg-zinc-800 transition-all"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({
  isFolder,
  onAddBill,
  onAddFolder,
}: {
  isFolder: boolean;
  onAddBill: () => void;
  onAddFolder: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
        {isFolder ? (
          <FolderOpen className="w-7 h-7 text-zinc-600" />
        ) : (
          <Receipt className="w-7 h-7 text-zinc-600" />
        )}
      </div>
      <p className="text-base font-medium text-zinc-300 mb-1">
        {isFolder ? "This folder is empty" : "No bills yet"}
      </p>
      <p className="text-sm text-zinc-600 mb-6 max-w-xs">
        {isFolder
          ? "Add bills or create subfolders to organize your documents"
          : "Create a folder to organize your bills, or add your first bill"}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={onAddFolder}
          className="flex items-center gap-2 px-4 py-2.5 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-xl hover:bg-zinc-800 transition-colors"
        >
          <FolderPlus className="w-4 h-4" /> New Folder
        </button>
        <button
          onClick={onAddBill}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-zinc-950 text-sm font-bold rounded-xl hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Bill
        </button>
      </div>
    </div>
  );
}

// ─── Main AdminView ──────────────────────────────────────────────────────────

export default function BillsAdminView() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [folders, setFolders] = useState<BillFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [globalUploading, setGlobalUploading] = useState(false);

  // Inline folder creation
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Modals
  const [billModal, setBillModal] = useState<{
    open: boolean;
    bill: Bill | null;
  }>({ open: false, bill: null });
  const [detailBill, setDetailBill] = useState<Bill | null>(null);
  const [moveModal, setMoveModal] = useState<{
    open: boolean;
    type: "bill" | "folder";
    id: string;
    currentFolderId?: string;
    excludeIds?: string[];
  } | null>(null);

  // Drag & drop
  const [draggedBillId, setDraggedBillId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const { toast, show: showToast } = useToast();

  // ─── Load data ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [billsRes, foldersRes] = await Promise.all([
        fetch("/api/bills").then((r) => r.json()),
        fetch("/api/bills/folders").then((r) => r.json()),
      ]);
      setBills(billsRes.data || []);
      setFolders(foldersRes.data || []);
    } catch {
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Derived state ─────────────────────────────────────────────────────

  const breadcrumb = useMemo(
    () => getBreadcrumbPath(folders, currentFolderId),
    [folders, currentFolderId],
  );

  const currentSubfolders = useMemo(
    () => getSubfolders(folders, currentFolderId),
    [folders, currentFolderId],
  );

  const displayedBills = useMemo(() => {
    let list = getBillsForFolder(bills, currentFolderId);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.payload.name.toLowerCase().includes(q) ||
          b.payload.description?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [bills, currentFolderId, searchQuery]);

  const hasContent =
    currentSubfolders.length > 0 || displayedBills.length > 0 || showNewFolder;

  // ─── Folder actions ────────────────────────────────────────────────────

  const handleCreateFolder = async (name: string) => {
    setCreatingFolder(true);
    try {
      const payload: { name: string; parent_id?: string } = { name };
      if (currentFolderId) payload.parent_id = currentFolderId;

      const res = await fetch("/api/bills/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      const data = await res.json();
      if (res.ok) {
        const newFolder: BillFolder = {
          _id: data.data._id?.toString() ?? data.data.insertedId?.toString(),
          module_type: "bill_folder",
          is_public: false,
          payload,
          created_at: data.data.created_at,
          updated_at: data.data.updated_at,
        };
        setFolders((prev) => [...prev, newFolder]);
        setShowNewFolder(false);
        showToast("Folder created", "success");
      } else {
        showToast(data.error ?? "Failed to create folder", "error");
      }
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleRenameFolder = async (id: string, name: string) => {
    const folder = folders.find((f) => f._id === id);
    if (!folder) return;
    try {
      const res = await fetch(`/api/bills/folders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: { ...folder.payload, name } }),
      });
      if (res.ok) {
        setFolders((prev) =>
          prev.map((f) =>
            f._id === id ? { ...f, payload: { ...f.payload, name } } : f,
          ),
        );
        showToast("Folder renamed", "success");
      }
    } catch {
      showToast("Failed to rename folder", "error");
    }
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      const res = await fetch(`/api/bills/folders/${id}`, { method: "DELETE" });
      if (res.ok) {
        const descendantIds = getAllDescendantFolderIds(folders, id);
        const allDeletedIds = [id, ...descendantIds];
        setFolders((prev) =>
          prev.filter((f) => !allDeletedIds.includes(f._id)),
        );
        setBills((prev) =>
          prev.map((b) =>
            b.payload.folder_id && allDeletedIds.includes(b.payload.folder_id)
              ? { ...b, payload: { ...b.payload, folder_id: undefined } }
              : b,
          ),
        );
        if (currentFolderId && allDeletedIds.includes(currentFolderId)) {
          setCurrentFolderId(null);
        }
        showToast("Folder deleted", "success");
      }
    } catch {
      showToast("Failed to delete folder", "error");
    }
  };

  const handleMoveFolder = (folderId: string) => {
    const folder = folders.find((f) => f._id === folderId);
    const excludeIds = [
      folderId,
      ...getAllDescendantFolderIds(folders, folderId),
    ];
    setMoveModal({
      open: true,
      type: "folder",
      id: folderId,
      currentFolderId: folder?.payload.parent_id,
      excludeIds,
    });
  };

  // ─── Bill actions ──────────────────────────────────────────────────────

  const handleBillSaved = (saved: Bill) => {
    setBills((prev) => {
      const idx = prev.findIndex((b) => b._id === saved._id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [saved, ...prev];
    });
    setBillModal({ open: false, bill: null });
    showToast(billModal.bill ? "Bill updated" : "Bill created", "success");
  };

  const handleBillDeleted = (id: string) => {
    setBills((prev) => prev.filter((b) => b._id !== id));
    setDetailBill(null);
    showToast("Bill deleted", "success");
  };

  const handleBillUpdated = (updated: Bill) => {
    setBills((prev) => prev.map((b) => (b._id === updated._id ? updated : b)));
    if (detailBill?._id === updated._id) setDetailBill(updated);
  };

  const handleMoveBill = (bill: Bill) => {
    setMoveModal({
      open: true,
      type: "bill",
      id: bill._id,
      currentFolderId: bill.payload.folder_id,
    });
  };

  const handleMoveConfirmed = async (targetFolderId: string | null) => {
    if (!moveModal) return;
    try {
      if (moveModal.type === "bill") {
        const res = await fetch(`/api/bills/${moveModal.id}/move`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder_id: targetFolderId }),
        });
        if (res.ok) {
          setBills((prev) =>
            prev.map((b) =>
              b._id === moveModal.id
                ? {
                    ...b,
                    payload: {
                      ...b.payload,
                      folder_id: targetFolderId ?? undefined,
                    },
                  }
                : b,
            ),
          );
          if (detailBill?._id === moveModal.id) {
            setDetailBill((prev) =>
              prev
                ? {
                    ...prev,
                    payload: {
                      ...prev.payload,
                      folder_id: targetFolderId ?? undefined,
                    },
                  }
                : null,
            );
          }
          showToast("Bill moved", "success");
        }
      } else {
        const res = await fetch(`/api/bills/folders/${moveModal.id}/move`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parent_id: targetFolderId }),
        });
        if (res.ok) {
          setFolders((prev) =>
            prev.map((f) =>
              f._id === moveModal.id
                ? {
                    ...f,
                    payload: {
                      ...f.payload,
                      parent_id: targetFolderId ?? undefined,
                    },
                  }
                : f,
            ),
          );
          showToast("Folder moved", "success");
        }
      }
    } catch {
      showToast("Move failed", "error");
    }
    setMoveModal(null);
  };

  // ─── Drag & drop ───────────────────────────────────────────────────────

  const handleDropOnFolder = async (folderId: string) => {
    if (!draggedBillId) return;
    setDragOverFolderId(null);
    try {
      const res = await fetch(`/api/bills/${draggedBillId}/move`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: folderId }),
      });
      if (res.ok) {
        setBills((prev) =>
          prev.map((b) =>
            b._id === draggedBillId
              ? { ...b, payload: { ...b.payload, folder_id: folderId } }
              : b,
          ),
        );
        showToast("Bill moved", "success");
      }
    } catch {
      showToast("Move failed", "error");
    }
    setDraggedBillId(null);
  };

  const handleGlobalDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropTarget(false);

    if (draggedBillId) return; // internal drag

    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;

    setGlobalUploading(true);
    let successCount = 0;

    await Promise.all(
      files.map(async (file) => {
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const base64Data = dataUrl.split(",")[1];
          if (!base64Data) return;

          const baseFileName = file.name.replace(/\.[^/.]+$/, "");

          const attachment: BillAttachment = {
            id: crypto.randomUUID(),
            filename: file.name,
            content_type: file.type || "application/octet-stream",
            data: base64Data,
            size: file.size,
            uploaded_at: new Date().toISOString(),
          };

          const payload = {
            name: baseFileName,
            bill_date: new Date().toISOString(),
            folder_id: currentFolderId || undefined,
            attachments: [attachment],
          };

          const res = await fetch("/api/bills", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payload }),
          });

          if (res.ok) {
            successCount++;
            const { data } = await res.json();
            setBills((prev) => [data, ...prev]);
          }
        } catch (e) {
          console.error("Upload failed", e);
        }
      }),
    );

    setGlobalUploading(false);
    if (successCount > 0) {
      showToast(
        `Uploaded ${successCount} document${successCount !== 1 ? "s" : ""}`,
        "success",
      );
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────

  if (loading) return <AdminModuleSkeleton />;

  return (
    <div
      className="animate-fade-in-up h-full relative"
      onDragOver={(e) => {
        if (!draggedBillId && e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setIsDropTarget(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDropTarget(false);
        }
      }}
      onDrop={handleGlobalDrop}
    >
      <AnimatePresence>
        {isDropTarget && !draggedBillId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-accent m-2"
          >
            <UploadCloud className="w-16 h-16 text-accent mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Drop files to upload
            </h2>
            <p className="text-zinc-400 mt-2">
              Instantly create bills from documents
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {globalUploading && (
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-zinc-900 border border-zinc-700 shadow-2xl rounded-2xl p-4 flex items-center gap-4"
          >
            <div className="w-5 h-5 border-2 border-zinc-600 border-t-accent rounded-full animate-spin shrink-0" />
            <p className="text-sm font-medium text-zinc-200">
              Processing documents...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={cn(
              "fixed top-4 right-4 z-[100] px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl border",
              toast.type === "success"
                ? "bg-success/10 border-success/20 text-success"
                : "bg-danger/10 border-danger/20 text-danger",
            )}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h1 className="text-2xl font-bold text-zinc-50 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-accent" />
            Bills
          </h1>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 shrink-0 mr-1">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  viewMode === "grid"
                    ? "bg-zinc-800 text-zinc-200"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  viewMode === "list"
                    ? "bg-zinc-800 text-zinc-200"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-2 px-3 py-2 border border-zinc-700 text-zinc-400 text-sm font-medium rounded-xl hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              <span className="hidden sm:inline">New Folder</span>
            </button>
            <button
              onClick={() => setBillModal({ open: true, bill: null })}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-zinc-950 text-sm font-bold rounded-xl hover:bg-accent-hover transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Bill</span>
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-3">
          <Breadcrumb path={breadcrumb} onNavigate={setCurrentFolderId} />
          <div className="ml-auto text-xs text-zinc-600 tabular-nums shrink-0">
            {currentSubfolders.length > 0 && (
              <span>
                {currentSubfolders.length} folder
                {currentSubfolders.length !== 1 ? "s" : ""} ·{" "}
              </span>
            )}
            {displayedBills.length} bill{displayedBills.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────── */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          placeholder={
            currentFolderId ? "Search in this folder…" : "Search all bills…"
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
        />
      </div>

      {/* ── Content: Folders + Bills ───────────────────────────────────── */}
      {!hasContent && !searchQuery ? (
        <EmptyState
          isFolder={!!currentFolderId}
          onAddBill={() => setBillModal({ open: true, bill: null })}
          onAddFolder={() => setShowNewFolder(true)}
        />
      ) : (
        <div className="space-y-5">
          {/* Folders section */}
          {!searchQuery && (currentSubfolders.length > 0 || showNewFolder) && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Folder className="w-3.5 h-3.5 text-zinc-600" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Folders
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {currentSubfolders.map((sf) => {
                  const allFolderIds = [
                    sf._id,
                    ...getAllDescendantFolderIds(folders, sf._id),
                  ];
                  const directBills = bills.filter(
                    (b) =>
                      b.payload.folder_id &&
                      allFolderIds.includes(b.payload.folder_id),
                  ).length;
                  const subCount = folders.filter(
                    (f) => f.payload.parent_id === sf._id,
                  ).length;
                  return (
                    <FolderCard
                      key={sf._id}
                      folder={sf}
                      billCount={directBills}
                      subfolderCount={subCount}
                      onClick={() => {
                        setCurrentFolderId(sf._id);
                        setSearchQuery("");
                      }}
                      onRename={(name) => handleRenameFolder(sf._id, name)}
                      onMove={() => handleMoveFolder(sf._id)}
                      onDelete={() => handleDeleteFolder(sf._id)}
                      isDragOver={dragOverFolderId === sf._id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverFolderId(sf._id);
                      }}
                      onDragLeave={() => setDragOverFolderId(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDropOnFolder(sf._id);
                      }}
                    />
                  );
                })}
                <AnimatePresence>
                  {showNewFolder && (
                    <NewFolderInlineCard
                      onSubmit={handleCreateFolder}
                      onCancel={() => setShowNewFolder(false)}
                      creating={creatingFolder}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Bills section */}
          {displayedBills.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Receipt className="w-3.5 h-3.5 text-zinc-600" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Bills
                </span>
              </div>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {displayedBills.map((bill) => (
                    <BillCard
                      key={bill._id}
                      bill={bill}
                      folder={
                        currentFolderId
                          ? undefined
                          : folders.find(
                              (f) => f._id === bill.payload.folder_id,
                            )
                      }
                      onClick={() => setDetailBill(bill)}
                      onEdit={(b) => setBillModal({ open: true, bill: b })}
                      onDragStart={() => setDraggedBillId(bill._id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedBills.map((bill) => (
                    <BillListRow
                      key={bill._id}
                      bill={bill}
                      folder={
                        currentFolderId
                          ? undefined
                          : folders.find(
                              (f) => f._id === bill.payload.folder_id,
                            )
                      }
                      onClick={() => setDetailBill(bill)}
                      onEdit={(b) => setBillModal({ open: true, bill: b })}
                      onDragStart={() => setDraggedBillId(bill._id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search yielded no results */}
          {searchQuery && displayedBills.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">
                No bills matching &ldquo;{searchQuery}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {billModal.open && (
          <BillModal
            folders={folders}
            bill={billModal.bill}
            defaultFolderId={currentFolderId ?? undefined}
            onClose={() => setBillModal({ open: false, bill: null })}
            onSaved={handleBillSaved}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailBill && (
          <BillDetail
            bill={detailBill}
            folders={folders}
            onClose={() => setDetailBill(null)}
            onEdit={(b) => {
              setDetailBill(null);
              setBillModal({ open: true, bill: b });
            }}
            onDeleted={handleBillDeleted}
            onUpdated={handleBillUpdated}
            onMoveBill={handleMoveBill}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {moveModal?.open && (
          <MoveFolderModal
            folders={folders}
            currentFolderId={moveModal.currentFolderId}
            title={
              moveModal.type === "bill" ? "Move Bill to…" : "Move Folder to…"
            }
            excludeFolderIds={moveModal.excludeIds}
            onMove={handleMoveConfirmed}
            onClose={() => setMoveModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
