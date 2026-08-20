"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AdminModuleSkeleton } from "@/components/ui/Skeletons";
import {
  getBillsForFolder,
  getSubfolders,
  getBreadcrumbPath,
  getAllDescendantFolderIds,
} from "./helpers";

// Extracted Components
import BillsHeader from "./components/BillsHeader";
import BillsMetrics from "./components/BillsMetrics";
import BillCard from "./components/BillCard";
import BillListRow from "./components/BillListRow";
import FolderCard from "./components/FolderCard";
import NewFolderInlineCard from "./components/NewFolderInlineCard";
import EmptyState from "./components/EmptyState";
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

// ─── Main AdminView ──────────────────────────────────────────────────────────

export default function BillsAdminView() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [folders, setFolders] = useState<BillFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
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
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const { toast, show: showToast } = useToast();

  // ─── Load data ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [billsRes, foldersRes] = await Promise.all([
        fetch("/api/bills?compact=true").then((r) => r.json()),
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

  const fetchFullBill = useCallback(
    async (bill: Bill) => {
      try {
        const res = await fetch(`/api/bills/${bill._id}`);
        if (!res.ok) {
          showToast("Failed to load bill", "error");
          return null;
        }
        const data = await res.json();
        return (data.data as Bill | undefined) ?? bill;
      } catch {
        showToast("Failed to load bill", "error");
        return null;
      }
    },
    [showToast],
  );

  const handleOpenBill = useCallback(
    async (bill: Bill) => {
      const fullBill = await fetchFullBill(bill);
      if (fullBill) setDetailBill(fullBill);
    },
    [fetchFullBill],
  );

  const handleEditBill = useCallback(
    async (bill: Bill) => {
      const fullBill = await fetchFullBill(bill);
      if (fullBill) setBillModal({ open: true, bill: fullBill });
    },
    [fetchFullBill],
  );

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
          b.payload.description?.toLowerCase().includes(q) ||
          b.payload.tags?.some((tag) => tag.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [bills, currentFolderId, searchQuery]);

  const hasContent =
    currentSubfolders.length > 0 || displayedBills.length > 0 || showNewFolder;

  // ─── Actions ────────────────────────────────────────────────────

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
    if (
      !confirm(
        "Are you sure? This will delete the folder and all nested content.",
      )
    )
      return;
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

  const handleDeleteBill = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bill?")) return;
    try {
      const res = await fetch(`/api/bills/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBills((prev) => prev.filter((b) => b._id !== id));
        setDetailBill(null);
        showToast("Bill deleted", "success");
      }
    } catch {
      showToast("Failed to delete bill", "error");
    }
  };

  const handleMove = async (targetId: string | null) => {
    if (!moveModal) return;
    try {
      const endpoint =
        moveModal.type === "bill"
          ? `/api/bills/${moveModal.id}`
          : `/api/bills/folders/${moveModal.id}`;

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload:
            moveModal.type === "bill"
              ? {
                  ...bills.find((b) => b._id === moveModal.id)!.payload,
                  folder_id: targetId || undefined,
                }
              : {
                  ...folders.find((f) => f._id === moveModal.id)!.payload,
                  parent_id: targetId || undefined,
                },
        }),
      });

      if (res.ok) {
        if (moveModal.type === "bill") {
          setBills((prev) =>
            prev.map((b) =>
              b._id === moveModal.id
                ? {
                    ...b,
                    payload: { ...b.payload, folder_id: targetId || undefined },
                  }
                : b,
            ),
          );
        } else {
          setFolders((prev) =>
            prev.map((f) =>
              f._id === moveModal.id
                ? {
                    ...f,
                    payload: { ...f.payload, parent_id: targetId || undefined },
                  }
                : f,
            ),
          );
        }
        showToast("Item moved", "success");
        setMoveModal(null);
      }
    } catch {
      showToast("Failed to move item", "error");
    }
  };

  const handleDropOnFolder = async (billId: string, folderId: string) => {
    try {
      const bill = bills.find((b) => b._id === billId);
      if (!bill || bill.payload.folder_id === folderId) return;

      const res = await fetch(`/api/bills/${billId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: { ...bill.payload, folder_id: folderId },
        }),
      });
      if (res.ok) {
        setBills((prev) =>
          prev.map((b) =>
            b._id === billId
              ? { ...b, payload: { ...b.payload, folder_id: folderId } }
              : b,
          ),
        );
        showToast(`Moved to folder`, "success");
      }
    } catch {
      showToast("Failed to move bill", "error");
    }
  };

  if (loading) return <AdminModuleSkeleton />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-dvh">
      <BillsHeader
        breadcrumb={breadcrumb}
        onNavigate={setCurrentFolderId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddBill={() => setBillModal({ open: true, bill: null })}
        onAddFolder={() => setShowNewFolder(true)}
      />

      {bills.length > 0 && !currentFolderId && !searchQuery && (
        <BillsMetrics bills={bills} />
      )}

      {!hasContent ? (
        <EmptyState
          isFolder={!!currentFolderId}
          onAddBill={() => setBillModal({ open: true, bill: null })}
          onAddFolder={() => setShowNewFolder(true)}
        />
      ) : (
        <div className="space-y-10">
          {/* Folders Section */}
          {(currentSubfolders.length > 0 || showNewFolder) && (
            <section>
              <h3 className="text-xs font-black text-zinc-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                <span>Folders</span>
                <div className="h-px bg-zinc-800/50 flex-1" />
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {showNewFolder && (
                    <NewFolderInlineCard
                      key="new-folder"
                      creating={creatingFolder}
                      onCancel={() => setShowNewFolder(false)}
                      onSubmit={handleCreateFolder}
                    />
                  )}
                  {currentSubfolders.map((folder) => (
                    <FolderCard
                      key={folder._id}
                      folder={folder}
                      billCount={
                        bills.filter((b) => b.payload.folder_id === folder._id)
                          .length
                      }
                      subfolderCount={
                        folders.filter(
                          (f) => f.payload.parent_id === folder._id,
                        ).length
                      }
                      onClick={() => setCurrentFolderId(folder._id)}
                      onRename={(name) => handleRenameFolder(folder._id, name)}
                      onMove={() =>
                        setMoveModal({
                          open: true,
                          type: "folder",
                          id: folder._id,
                          currentFolderId: folder.payload.parent_id,
                          excludeIds: [
                            folder._id,
                            ...getAllDescendantFolderIds(folders, folder._id),
                          ],
                        })
                      }
                      onDelete={() => handleDeleteFolder(folder._id)}
                      isDragOver={dragOverFolderId === folder._id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverFolderId(folder._id);
                      }}
                      onDragLeave={() => setDragOverFolderId(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverFolderId(null);
                        const billId = e.dataTransfer.getData("billId");
                        if (billId) handleDropOnFolder(billId, folder._id);
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* Bills Section */}
          {displayedBills.length > 0 && (
            <section>
              <h3 className="text-xs font-black text-zinc-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                <span>Documents</span>
                <div className="h-px bg-zinc-800/50 flex-1" />
              </h3>

              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  <AnimatePresence mode="popLayout">
                    {displayedBills.map((bill) => (
                      <BillCard
                        key={bill._id}
                        bill={bill}
                        folder={folders.find(
                          (f) => f._id === bill.payload.folder_id,
                        )}
                        onClick={() => handleOpenBill(bill)}
                        onEdit={handleEditBill}
                        onDragStart={() => {}}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <AnimatePresence mode="popLayout">
                    {displayedBills.map((bill) => (
                      <BillListRow
                        key={bill._id}
                        bill={bill}
                        folder={folders.find(
                          (f) => f._id === bill.payload.folder_id,
                        )}
                        onClick={() => handleOpenBill(bill)}
                        onEdit={handleEditBill}
                        onDragStart={() => {}}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {billModal.open && (
          <BillModal
            folders={folders}
            bill={billModal.bill}
            defaultFolderId={currentFolderId || undefined}
            onClose={() => setBillModal({ open: false, bill: null })}
            onSaved={handleBillSaved}
          />
        )}
        {detailBill && (
          <BillDetail
            bill={detailBill}
            folder={folders.find((f) => f._id === detailBill.payload.folder_id)}
            onClose={() => setDetailBill(null)}
            onEdit={(b) => {
              setDetailBill(null);
              setBillModal({ open: true, bill: b });
            }}
            onDelete={() => handleDeleteBill(detailBill._id)}
            onBillUpdated={handleBillSaved}
          />
        )}
        {moveModal && (
          <MoveFolderModal
            folders={folders}
            title={moveModal.type === "bill" ? "Move Bill" : "Move Folder"}
            currentFolderId={moveModal.currentFolderId}
            excludeFolderIds={moveModal.excludeIds}
            onClose={() => setMoveModal(null)}
            onMove={handleMove}
          />
        )}
      </AnimatePresence>

      {/* Toasts */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "fixed bottom-4 left-4 right-4 sm:left-auto sm:bottom-8 sm:right-8 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-3 backdrop-blur-md border",
              toast.type === "success"
                ? "bg-success/10 border-success/20 text-success"
                : "bg-danger/10 border-danger/20 text-danger",
            )}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                toast.type === "success" ? "bg-success" : "bg-danger",
              )}
            />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
