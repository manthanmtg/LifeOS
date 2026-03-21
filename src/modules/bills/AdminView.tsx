"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Receipt,
  Folder,
  FolderOpen,
  FolderPlus,
  Paperclip,
  ChevronRight,
  ChevronDown,
  Search,
  Calendar,
  Edit3,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { AdminModuleSkeleton } from "@/components/ui/Skeletons";
import {
  buildFolderTree,
  getBillsForFolder,
  getSubfolders,
  getBreadcrumbPath,
  getAllDescendantFolderIds,
  formatDate,
} from "./helpers";
import FolderPanel from "./components/FolderPanel";
import BillDetail from "./components/BillDetail";
import BillModal from "./components/BillModal";
import MoveFolderModal from "./components/MoveFolderModal";
import type { Bill, BillFolder } from "./types";

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
    <nav className="flex items-center gap-1 text-xs min-w-0 overflow-x-auto no-scrollbar py-1">
      {path.map((crumb, i) => (
        <div
          key={crumb.id ?? "root"}
          className="flex items-center gap-1 shrink-0"
        >
          {i > 0 && <ChevronRight className="w-3 h-3 text-zinc-600" />}
          {i === path.length - 1 ? (
            <span className="text-zinc-200 font-medium px-1.5 py-0.5">
              {crumb.name}
            </span>
          ) : (
            <button
              onClick={() => onNavigate(crumb.id)}
              className="text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded-md hover:bg-zinc-800 transition-colors"
            >
              {crumb.id === null ? (
                <Home className="w-3.5 h-3.5" />
              ) : (
                crumb.name
              )}
            </button>
          )}
        </div>
      ))}
    </nav>
  );
}

// ─── Subfolder Card ──────────────────────────────────────────────────────────

function SubfolderCard({
  folder,
  billCount,
  subfolderCount,
  onClick,
}: {
  folder: BillFolder;
  billCount: number;
  subfolderCount: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-600 hover:bg-zinc-800/50 transition-all text-left w-full group"
    >
      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
        <FolderOpen className="w-4.5 h-4.5 text-accent" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-200 truncate">
          {folder.payload.name}
        </p>
        <p className="text-[10px] text-zinc-600 mt-0.5">
          {billCount} bill{billCount !== 1 ? "s" : ""}
          {subfolderCount > 0 &&
            ` · ${subfolderCount} subfolder${subfolderCount !== 1 ? "s" : ""}`}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors shrink-0" />
    </motion.button>
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      draggable
      onDragStart={onDragStart}
      className="group bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden cursor-pointer hover:border-zinc-600 hover:shadow-lg hover:shadow-black/20 transition-all"
      onClick={onClick}
    >
      {/* Thumbnail preview for first image attachment */}
      {firstImage && (
        <div className="h-28 sm:h-32 w-full bg-zinc-800 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:${firstImage.content_type};base64,${firstImage.data}`}
            alt=""
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
        </div>
      )}

      <div className="p-4">
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
            className="p-1.5 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-accent rounded-lg hover:bg-zinc-800 transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>

        {bill.payload.description && (
          <p className="text-xs text-zinc-500 line-clamp-2 mb-2 leading-relaxed">
            {bill.payload.description}
          </p>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-zinc-800">
          {folder && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-600">
              <Folder className="w-3 h-3" />
              {folder.payload.name}
            </span>
          )}
          {attachCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-500 ml-auto">
              <Paperclip className="w-3 h-3" />
              {attachCount}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({
  hasBills,
  onAdd,
}: {
  hasBills: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
        <Receipt className="w-6 h-6 text-zinc-600" />
      </div>
      <p className="text-sm font-medium text-zinc-400 mb-1">
        {hasBills ? "No bills in this folder" : "No bills yet"}
      </p>
      <p className="text-xs text-zinc-600 mb-5">
        {hasBills
          ? "Add a bill to this folder or switch to All Bills"
          : "Upload your first bill to get started"}
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent text-sm font-medium rounded-xl hover:bg-accent/20 border border-accent/20 transition-colors"
      >
        <Plus className="w-4 h-4" /> Add Bill
      </button>
    </div>
  );
}

// ─── Main AdminView ──────────────────────────────────────────────────────────

export default function BillsAdminView() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [folders, setFolders] = useState<BillFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Folder management
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderParentId, setNewFolderParentId] = useState<
    string | undefined
  >(undefined);
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Modals
  const [billModal, setBillModal] = useState<{
    open: boolean;
    bill: Bill | null;
  }>({ open: false, bill: null });
  const [detailBill, setDetailBill] = useState<Bill | null>(null);

  // Move modal
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

  // Mobile folder panel
  const [mobileFolderOpen, setMobileFolderOpen] = useState(false);

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

  const folderTree = useMemo(
    () => buildFolderTree(folders, bills, undefined),
    [folders, bills],
  );

  const breadcrumb = useMemo(
    () => getBreadcrumbPath(folders, selectedFolderId),
    [folders, selectedFolderId],
  );

  const currentSubfolders = useMemo(
    () => getSubfolders(folders, selectedFolderId),
    [folders, selectedFolderId],
  );

  const displayedBills = useMemo(() => {
    let list = getBillsForFolder(bills, selectedFolderId);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.payload.name.toLowerCase().includes(q) ||
          b.payload.description?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [bills, selectedFolderId, searchQuery]);

  const selectedFolder = useMemo(
    () => folders.find((f) => f._id === selectedFolderId) ?? null,
    [folders, selectedFolderId],
  );

  // ─── Folder actions ────────────────────────────────────────────────────

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const payload: { name: string; parent_id?: string } = {
        name: newFolderName.trim(),
      };
      if (newFolderParentId) payload.parent_id = newFolderParentId;

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
        setNewFolderName("");
        setShowNewFolderInput(false);
        setNewFolderParentId(undefined);
        showToast("Folder created", "success");
      } else {
        showToast(data.error ?? "Failed to create folder", "error");
      }
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleCreateSubfolder = (parentId: string) => {
    setNewFolderParentId(parentId);
    setShowNewFolderInput(true);
    setNewFolderName("");
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
      const res = await fetch(`/api/bills/folders/${id}`, {
        method: "DELETE",
      });
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
        if (selectedFolderId && allDeletedIds.includes(selectedFolderId)) {
          setSelectedFolderId(null);
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
    if (detailBill?._id === updated._id) {
      setDetailBill(updated);
    }
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

  // ─── Drag & drop handlers ──────────────────────────────────────────────

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

  const handleDropOnRoot = async () => {
    if (!draggedBillId) return;
    setDragOverFolderId(null);

    try {
      const res = await fetch(`/api/bills/${draggedBillId}/move`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: null }),
      });
      if (res.ok) {
        setBills((prev) =>
          prev.map((b) =>
            b._id === draggedBillId
              ? { ...b, payload: { ...b.payload, folder_id: undefined } }
              : b,
          ),
        );
        showToast("Bill moved to root", "success");
      }
    } catch {
      showToast("Move failed", "error");
    }
    setDraggedBillId(null);
  };

  // ─── Render ────────────────────────────────────────────────────────────

  if (loading) return <AdminModuleSkeleton />;

  const folderPanelProps = {
    folderTree,
    selectedFolderId,
    allBillCount: bills.length,
    onSelect: setSelectedFolderId,
    onRename: handleRenameFolder,
    onDelete: handleDeleteFolder,
    onCreateSubfolder: handleCreateSubfolder,
    onMoveFolder: handleMoveFolder,
    showNewFolderInput,
    newFolderName,
    onNewFolderNameChange: setNewFolderName,
    onShowNewFolder: () => {
      setNewFolderParentId(selectedFolderId ?? undefined);
      setShowNewFolderInput(true);
    },
    onCreateFolder: handleCreateFolder,
    onCancelNewFolder: () => {
      setShowNewFolderInput(false);
      setNewFolderName("");
      setNewFolderParentId(undefined);
    },
    creatingFolder,
    dragOverFolderId,
    onDragOverFolder: setDragOverFolderId,
    onDropOnFolder: handleDropOnFolder,
    onDropOnRoot: handleDropOnRoot,
  };

  return (
    <div className="animate-fade-in-up h-full">
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

      {/* Page Header */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-accent" />
            Bills
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {bills.length} bill{bills.length !== 1 ? "s" : ""} ·{" "}
            {folders.length} folder{folders.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setNewFolderParentId(selectedFolderId ?? undefined);
              setShowNewFolderInput(true);
            }}
            className="hidden sm:flex items-center gap-2 px-3 py-2 border border-zinc-700 text-zinc-400 text-sm font-medium rounded-xl hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <FolderPlus className="w-4 h-4" /> Folder
          </button>
          <button
            onClick={() => setBillModal({ open: true, bill: null })}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-zinc-950 text-sm font-bold rounded-xl hover:bg-accent-hover transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Bill
          </button>
        </div>
      </div>

      {/* Mobile: folder selector toggle */}
      <div className="lg:hidden mb-3">
        <button
          onClick={() => setMobileFolderOpen((v) => !v)}
          className="flex items-center gap-2 w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-300 font-medium"
        >
          <FolderOpen className="w-4 h-4 text-accent" />
          <span className="flex-1 text-left truncate">
            {selectedFolder ? selectedFolder.payload.name : "All Bills"}
          </span>
          <span className="text-[10px] text-zinc-600 tabular-nums">
            {displayedBills.length}
          </span>
          {mobileFolderOpen ? (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          )}
        </button>
        <AnimatePresence>
          {mobileFolderOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-2">
                <FolderPanel
                  {...folderPanelProps}
                  onSelect={(id) => {
                    setSelectedFolderId(id);
                    setMobileFolderOpen(false);
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main content: 2-column on desktop */}
      <div className="flex gap-5">
        {/* Desktop Folder Panel */}
        <div className="hidden lg:block w-60 shrink-0">
          <div className="sticky top-4">
            <FolderPanel {...folderPanelProps} />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* Breadcrumb + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
            {selectedFolderId && (
              <Breadcrumb path={breadcrumb} onNavigate={setSelectedFolderId} />
            )}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search bills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>
          </div>

          {/* Subfolders in current view + inline New Subfolder */}
          {!searchQuery && selectedFolderId && (
            <div className="mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                {currentSubfolders.map((sf) => {
                  const directBills = bills.filter(
                    (b) => b.payload.folder_id === sf._id,
                  ).length;
                  const subCount = folders.filter(
                    (f) => f.payload.parent_id === sf._id,
                  ).length;
                  return (
                    <SubfolderCard
                      key={sf._id}
                      folder={sf}
                      billCount={directBills}
                      subfolderCount={subCount}
                      onClick={() => setSelectedFolderId(sf._id)}
                    />
                  );
                })}
                {/* Inline New Subfolder button */}
                <button
                  onClick={() => handleCreateSubfolder(selectedFolderId!)}
                  className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-zinc-800 rounded-xl hover:border-zinc-600 hover:bg-zinc-800/30 transition-all text-left w-full group"
                >
                  <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 group-hover:bg-zinc-700 transition-colors">
                    <FolderPlus className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
                  </div>
                  <span className="text-sm text-zinc-500 font-medium group-hover:text-zinc-300 transition-colors">
                    New Subfolder
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Bills grid */}
          {displayedBills.length === 0 ? (
            !selectedFolderId || searchQuery ? (
              <EmptyState
                hasBills={bills.length > 0}
                onAdd={() => setBillModal({ open: true, bill: null })}
              />
            ) : null
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {displayedBills.map((bill) => (
                <BillCard
                  key={bill._id}
                  bill={bill}
                  folder={folders.find((f) => f._id === bill.payload.folder_id)}
                  onClick={() => setDetailBill(bill)}
                  onEdit={(b) => setBillModal({ open: true, bill: b })}
                  onDragStart={() => setDraggedBillId(bill._id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bill Modal */}
      <AnimatePresence>
        {billModal.open && (
          <BillModal
            folders={folders}
            bill={billModal.bill}
            defaultFolderId={selectedFolderId ?? undefined}
            onClose={() => setBillModal({ open: false, bill: null })}
            onSaved={handleBillSaved}
          />
        )}
      </AnimatePresence>

      {/* Bill Detail Slide-Over */}
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

      {/* Move Modal */}
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
