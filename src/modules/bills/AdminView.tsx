"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type DragEvent,
} from "react";
import {
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  Receipt,
  Folder,
  FolderOpen,
  FolderPlus,
  Paperclip,
  ChevronRight,
  ChevronDown,
  Upload,
  FileText,
  ImageIcon,
  Search,
  Calendar,
  ArrowLeft,
  AlertCircle,
  Download,
  Eye,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { AdminModuleSkeleton } from "@/components/ui/Skeletons";
import type { Bill, BillFolder, BillPayload, FolderNode } from "./types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildFolderTree(
  folders: BillFolder[],
  bills: Bill[],
  parentId?: string,
): FolderNode[] {
  return folders
    .filter((f) => (f.payload.parent_id ?? undefined) === parentId)
    .map((f) => {
      const children = buildFolderTree(folders, bills, f._id);
      const directCount = bills.filter(
        (b) => b.payload.folder_id === f._id,
      ).length;
      const descendantCount = countDescendantBills(children);
      return {
        ...f,
        children,
        billCount: directCount + descendantCount,
      };
    });
}

function countDescendantBills(nodes: FolderNode[]): number {
  return nodes.reduce((sum, n) => sum + n.billCount, 0);
}

function getBillsForFolder(bills: Bill[], folderId: string | null): Bill[] {
  if (folderId === null) return bills;
  return bills.filter((b) => b.payload.folder_id === folderId);
}

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

// ─── Bill Modal ──────────────────────────────────────────────────────────────

interface BillModalProps {
  folders: BillFolder[];
  bill: Bill | null; // null = create
  defaultFolderId?: string;
  onClose: () => void;
  onSaved: (bill: Bill) => void;
}

function BillModal({
  folders,
  bill,
  defaultFolderId,
  onClose,
  onSaved,
}: BillModalProps) {
  const [name, setName] = useState(bill?.payload.name ?? "");
  const [billDate, setBillDate] = useState(
    bill?.payload.bill_date
      ? bill.payload.bill_date.substring(0, 10)
      : new Date().toISOString().substring(0, 10),
  );
  const [description, setDescription] = useState(
    bill?.payload.description ?? "",
  );
  const [notes, setNotes] = useState(bill?.payload.notes ?? "");
  const [folderId, setFolderId] = useState<string>(
    bill?.payload.folder_id ?? defaultFolderId ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Bill name is required");
      return;
    }
    setSaving(true);
    setError("");

    const payload: BillPayload = {
      name: name.trim(),
      bill_date: new Date(billDate).toISOString(),
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      folder_id: folderId || undefined,
      attachments: bill?.payload.attachments ?? [],
    };

    try {
      let res: Response;
      if (bill) {
        res = await fetch(`/api/bills/${bill._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload }),
        });
      } else {
        res = await fetch("/api/bills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save bill");
        return;
      }

      // Return a properly shaped bill object
      const saved: Bill = bill
        ? { ...bill, payload }
        : {
            _id: data.data._id?.toString() ?? data.data.insertedId?.toString(),
            module_type: "bill",
            is_public: false,
            payload,
            created_at: data.data.created_at,
            updated_at: data.data.updated_at,
          };
      onSaved(saved);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">
            {bill ? "Edit Bill" : "New Bill"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Bill Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electricity Bill January"
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Bill Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Folder
            </label>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
            >
              <option value="">Root (no folder)</option>
              {folders.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.payload.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional short description"
              rows={2}
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={2}
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-medium hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-zinc-950 text-sm font-bold hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : bill ? "Save Changes" : "Create Bill"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Attachment Upload Area ───────────────────────────────────────────────────

interface AttachmentUploadProps {
  billId: string;
  onUploaded: (bill: Bill) => void;
}

function AttachmentUpload({ billId, onUploaded }: AttachmentUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (
        !file.type.startsWith("image/") &&
        file.type !== "application/pdf"
      ) {
        setError("Only images and PDFs are accepted.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("File exceeds the 5 MB limit.");
        return;
      }

      setError("");
      setUploading(true);

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          // Strip the data URL prefix (e.g. "data:image/png;base64,")
          const raw = reader.result as string;
          const data = raw.split(",")[1];

          const res = await fetch(`/api/bills/${billId}/attachments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              content_type: file.type,
              data,
            }),
          });

          if (!res.ok) {
            const d = await res.json();
            setError(d.error ?? "Upload failed");
            return;
          }

          // Reload the bill to get updated attachments
          const billRes = await fetch(`/api/bills/${billId}`);
          if (billRes.ok) {
            const billData = await billRes.json();
            onUploaded(billData.data);
          }
        } catch {
          setError("Upload failed. Please try again.");
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    },
    [billId, onUploaded],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files[0]) uploadFile(files[0]);
    },
    [uploadFile],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-danger flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
          dragging
            ? "border-accent bg-accent/10"
            : "border-zinc-700 hover:border-zinc-600 bg-zinc-800/30 hover:bg-zinc-800/50",
          uploading && "opacity-50 cursor-not-allowed",
        )}
      >
        <Upload className="w-5 h-5 text-zinc-500" />
        <div className="text-center">
          <p className="text-xs text-zinc-400 font-medium">
            {uploading ? "Uploading..." : "Drop file or click to browse"}
          </p>
          <p className="text-[10px] text-zinc-600 mt-0.5">
            Images & PDFs — max 5 MB
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>
    </div>
  );
}

// ─── Bill Detail Panel ────────────────────────────────────────────────────────

interface BillDetailProps {
  bill: Bill;
  folders: BillFolder[];
  onClose: () => void;
  onEdit: (bill: Bill) => void;
  onDeleted: (id: string) => void;
  onUpdated: (bill: Bill) => void;
}

function BillDetail({
  bill,
  folders,
  onClose,
  onEdit,
  onDeleted,
  onUpdated,
}: BillDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<
    string | null
  >(null);

  const folder = folders.find((f) => f._id === bill.payload.folder_id);

  const handleDeleteBill = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/bills/${bill._id}`, { method: "DELETE" });
      onDeleted(bill._id);
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    setDeletingAttachmentId(attachmentId);
    try {
      const res = await fetch(
        `/api/bills/${bill._id}/attachments/${attachmentId}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        const billRes = await fetch(`/api/bills/${bill._id}`);
        if (billRes.ok) {
          const data = await billRes.json();
          onUpdated(data.data);
        }
      }
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const handleDownload = (attachment: Bill["payload"]["attachments"][0]) => {
    const a = document.createElement("a");
    a.href = `data:${attachment.content_type};base64,${attachment.data}`;
    a.download = attachment.filename;
    a.click();
  };

  const handlePreview = (attachment: Bill["payload"]["attachments"][0]) => {
    const blob = new Blob(
      [Uint8Array.from(atob(attachment.data), (c) => c.charCodeAt(0))],
      { type: attachment.content_type },
    );
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-xl bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-zinc-800">
          <div className="min-w-0 flex-1 pr-4">
            <h2 className="text-base font-bold text-zinc-100 truncate">
              {bill.payload.name}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(bill.payload.bill_date)}
              </span>
              {folder && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Folder className="w-3 h-3" />
                  {folder.payload.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onEdit(bill)}
              className="p-1.5 text-zinc-500 hover:text-accent rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Description */}
          {bill.payload.description && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
                Description
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {bill.payload.description}
              </p>
            </div>
          )}

          {/* Notes */}
          {bill.payload.notes && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
                Notes
              </p>
              <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">
                {bill.payload.notes}
              </p>
            </div>
          )}

          {/* Attachments */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
              Attachments ({bill.payload.attachments?.length ?? 0})
            </p>

            <div className="space-y-2">
              {(bill.payload.attachments ?? []).map((att) => {
                const isImage = att.content_type.startsWith("image/");
                return (
                  <div
                    key={att.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800 border border-zinc-700 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0">
                      {isImage ? (
                        <ImageIcon className="w-4 h-4 text-accent" />
                      ) : (
                        <FileText className="w-4 h-4 text-danger" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-zinc-200 truncate">
                        {att.filename}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {formatBytes(att.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handlePreview(att)}
                        title="Preview"
                        className="p-1.5 text-zinc-500 hover:text-zinc-200 rounded-lg hover:bg-zinc-700 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDownload(att)}
                        title="Download"
                        className="p-1.5 text-zinc-500 hover:text-zinc-200 rounded-lg hover:bg-zinc-700 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAttachment(att.id)}
                        disabled={deletingAttachmentId === att.id}
                        title="Delete"
                        className="p-1.5 text-zinc-500 hover:text-danger rounded-lg hover:bg-danger/10 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3">
              <AttachmentUpload billId={bill._id} onUploaded={onUpdated} />
            </div>
          </div>
        </div>

        {/* Footer - delete */}
        <div className="px-6 py-4 border-t border-zinc-800">
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <p className="text-xs text-zinc-400 flex-1">
                Delete this bill permanently?
              </p>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBill}
                disabled={deleting}
                className="px-3 py-1.5 text-xs font-bold text-white bg-danger hover:bg-danger/80 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 text-xs text-zinc-500 hover:text-danger transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete bill
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Folder Tree Node ─────────────────────────────────────────────────────────

interface FolderNodeItemProps {
  node: FolderNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  depth: number;
}

function FolderNodeItem({
  node,
  selectedId,
  onSelect,
  onRename,
  onDelete,
  depth,
}: FolderNodeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.payload.name);
  const isSelected = selectedId === node._id;

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
          "group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-sm",
          isSelected
            ? "bg-accent/10 text-accent"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800",
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => {
          if (!editing) onSelect(node._id);
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

        <span className="text-[10px] text-zinc-600 shrink-0">
          {node.billCount}
        </span>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
              setEditName(node.payload.name);
            }}
            className="p-0.5 hover:text-accent rounded transition-colors"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node._id);
            }}
            className="p-0.5 hover:text-danger rounded transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {expanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <FolderNodeItem
              key={child._id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main AdminView ───────────────────────────────────────────────────────────

export default function BillsAdminView() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [folders, setFolders] = useState<BillFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Folder management
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Modals
  const [billModal, setBillModal] = useState<{
    open: boolean;
    bill: Bill | null;
  }>({ open: false, bill: null });
  const [detailBill, setDetailBill] = useState<Bill | null>(null);

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

  // ─── Derived state ──────────────────────────────────────────────────────

  const folderTree = useMemo(
    () => buildFolderTree(folders, bills, undefined),
    [folders, bills],
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

  // ─── Folder actions ─────────────────────────────────────────────────────

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const res = await fetch("/api/bills/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: { name: newFolderName.trim() },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const newFolder: BillFolder = {
          _id: data.data._id?.toString() ?? data.data.insertedId?.toString(),
          module_type: "bill_folder",
          is_public: false,
          payload: { name: newFolderName.trim() },
          created_at: data.data.created_at,
          updated_at: data.data.updated_at,
        };
        setFolders((prev) => [...prev, newFolder]);
        setNewFolderName("");
        setShowNewFolderInput(false);
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
      const res = await fetch(`/api/bills/folders/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFolders((prev) => prev.filter((f) => f._id !== id));
        // Move bills from that folder to root in local state
        setBills((prev) =>
          prev.map((b) =>
            b.payload.folder_id === id
              ? { ...b, payload: { ...b.payload, folder_id: undefined } }
              : b,
          ),
        );
        if (selectedFolderId === id) setSelectedFolderId(null);
        showToast("Folder deleted", "success");
      }
    } catch {
      showToast("Failed to delete folder", "error");
    }
  };

  // ─── Bill actions ────────────────────────────────────────────────────────

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
    setBills((prev) =>
      prev.map((b) => (b._id === updated._id ? updated : b)),
    );
    if (detailBill?._id === updated._id) {
      setDetailBill(updated);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) return <AdminModuleSkeleton />;

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
      <div className="mb-6 flex items-center justify-between gap-4">
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
        <button
          onClick={() => setBillModal({ open: true, bill: null })}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-zinc-950 text-sm font-bold rounded-xl hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Bill
        </button>
      </div>

      {/* Mobile: folder selector toggle */}
      <div className="lg:hidden mb-3">
        <button
          onClick={() => setMobileFolderOpen((v) => !v)}
          className="flex items-center gap-2 w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-300 font-medium"
        >
          <FolderOpen className="w-4 h-4 text-accent" />
          <span className="flex-1 text-left">
            {selectedFolder ? selectedFolder.payload.name : "All Bills"}
          </span>
          {mobileFolderOpen ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
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
              <div className="pt-1">
                <FolderPanel
                  folderTree={folderTree}
                  selectedFolderId={selectedFolderId}
                  allBillCount={bills.length}
                  onSelect={(id) => {
                    setSelectedFolderId(id);
                    setMobileFolderOpen(false);
                  }}
                  onRename={handleRenameFolder}
                  onDelete={handleDeleteFolder}
                  showNewFolderInput={showNewFolderInput}
                  newFolderName={newFolderName}
                  onNewFolderNameChange={setNewFolderName}
                  onShowNewFolder={() => setShowNewFolderInput(true)}
                  onCreateFolder={handleCreateFolder}
                  onCancelNewFolder={() => {
                    setShowNewFolderInput(false);
                    setNewFolderName("");
                  }}
                  creatingFolder={creatingFolder}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main content: 2-column on desktop */}
      <div className="flex gap-5">
        {/* Desktop Folder Panel */}
        <div className="hidden lg:block w-56 shrink-0">
          <FolderPanel
            folderTree={folderTree}
            selectedFolderId={selectedFolderId}
            allBillCount={bills.length}
            onSelect={setSelectedFolderId}
            onRename={handleRenameFolder}
            onDelete={handleDeleteFolder}
            showNewFolderInput={showNewFolderInput}
            newFolderName={newFolderName}
            onNewFolderNameChange={setNewFolderName}
            onShowNewFolder={() => setShowNewFolderInput(true)}
            onCreateFolder={handleCreateFolder}
            onCancelNewFolder={() => {
              setShowNewFolderInput(false);
              setNewFolderName("");
            }}
            creatingFolder={creatingFolder}
          />
        </div>

        {/* Bills List */}
        <div className="flex-1 min-w-0">
          {/* Search + folder breadcrumb */}
          <div className="flex items-center gap-3 mb-4">
            {selectedFolderId && (
              <button
                onClick={() => setSelectedFolderId(null)}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                All
              </button>
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

          {displayedBills.length === 0 ? (
            <EmptyState
              hasBills={bills.length > 0}
              onAdd={() => setBillModal({ open: true, bill: null })}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {displayedBills.map((bill) => (
                <BillCard
                  key={bill._id}
                  bill={bill}
                  folder={folders.find((f) => f._id === bill.payload.folder_id)}
                  onClick={() => setDetailBill(bill)}
                  onEdit={(b) => setBillModal({ open: true, bill: b })}
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

      {/* Bill Detail */}
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
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Folder Panel ─────────────────────────────────────────────────────────────

interface FolderPanelProps {
  folderTree: FolderNode[];
  selectedFolderId: string | null;
  allBillCount: number;
  onSelect: (id: string | null) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  showNewFolderInput: boolean;
  newFolderName: string;
  onNewFolderNameChange: (v: string) => void;
  onShowNewFolder: () => void;
  onCreateFolder: () => void;
  onCancelNewFolder: () => void;
  creatingFolder: boolean;
}

function FolderPanel({
  folderTree,
  selectedFolderId,
  allBillCount,
  onSelect,
  onRename,
  onDelete,
  showNewFolderInput,
  newFolderName,
  onNewFolderNameChange,
  onShowNewFolder,
  onCreateFolder,
  onCancelNewFolder,
  creatingFolder,
}: FolderPanelProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 space-y-1">
      {/* All Bills */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors",
          selectedFolderId === null
            ? "bg-accent/10 text-accent"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800",
        )}
      >
        <Receipt className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 text-left">All Bills</span>
        <span className="text-[10px] text-zinc-600">{allBillCount}</span>
      </button>

      {/* Folder tree */}
      <div className="py-0.5">
        {folderTree.map((node) => (
          <FolderNodeItem
            key={node._id}
            node={node}
            selectedId={selectedFolderId}
            onSelect={onSelect}
            onRename={onRename}
            onDelete={onDelete}
            depth={0}
          />
        ))}
      </div>

      {/* New folder input */}
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

      {/* Add folder button */}
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

// ─── Bill Card ────────────────────────────────────────────────────────────────

interface BillCardProps {
  bill: Bill;
  folder?: BillFolder;
  onClick: () => void;
  onEdit: (bill: Bill) => void;
}

function BillCard({ bill, folder, onClick, onEdit }: BillCardProps) {
  const attachCount = bill.payload.attachments?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-zinc-900 border border-zinc-800 rounded-2xl p-4 cursor-pointer hover:border-zinc-600 hover:shadow-lg hover:shadow-black/20 transition-all"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
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

      <div className="flex items-center gap-3 mt-auto pt-2 border-t border-zinc-800">
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
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

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
