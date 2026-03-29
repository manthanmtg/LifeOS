"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Calendar,
  Folder,
  Paperclip,
  Edit3,
  FolderInput,
  Trash2,
  Eye,
  Download,
  ImageIcon,
  FileText,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate, formatBytes } from "../helpers";
import AttachmentUpload from "./AttachmentUpload";
import type { Bill, BillFolder } from "../types";

interface BillDetailProps {
  bill: Bill;
  folder?: BillFolder;
  onClose: () => void;
  onEdit: (bill: Bill) => void;
  onDelete: () => void;
  onBillUpdated: (bill: Bill) => void;
}

export default function BillDetail({
  bill,
  folder,
  onClose,
  onEdit,
  onDelete,
  onBillUpdated,
}: BillDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<
    string | null
  >(null);
  const [previewAttachment, setPreviewAttachment] = useState<
    Bill["payload"]["attachments"][0] | null
  >(null);

  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewAttachment) {
          setPreviewAttachment(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [previewAttachment, onClose]);

  const handleDeleteBill = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/bills/${bill._id}`, { method: "DELETE" });
      onDelete();
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
          onBillUpdated(data.data);
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
    if (
      attachment.content_type.startsWith("image/") ||
      attachment.content_type === "application/pdf"
    ) {
      setPreviewAttachment(attachment);
    } else {
      const blob = new Blob(
        [Uint8Array.from(atob(attachment.data), (c) => c.charCodeAt(0))],
        { type: attachment.content_type },
      );
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", damping: 28, stiffness: 350 }}
          className={cn(
            "flex flex-col bg-zinc-900 shadow-2xl shadow-black/40",
            "fixed inset-0 z-10",
            "sm:absolute sm:inset-auto sm:top-[6vh] sm:left-1/2 sm:-translate-x-1/2",
            "sm:w-full sm:max-w-xl sm:max-h-[88vh]",
            "sm:rounded-2xl sm:border sm:border-zinc-700/80",
          )}
        >
          {/* Header */}
          <div className="shrink-0 flex items-start gap-3 px-5 py-4 border-b border-zinc-800">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-zinc-100 leading-tight">
                {bill.payload.name}
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
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
                <span className="text-xs text-zinc-600 flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  {bill.payload.attachments?.length ?? 0} file
                  {(bill.payload.attachments?.length ?? 0) !== 1 ? "s" : ""}
                </span>
                {bill.payload.amount !== undefined && (
                  <span className="text-xs font-bold text-success-muted bg-success/5 px-2 py-0.5 rounded-lg border border-success/10 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {bill.payload.currency}{" "}
                    {bill.payload.amount.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEdit(bill)}
                title="Edit"
                className="p-2 text-zinc-500 hover:text-accent rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-5">
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

              {/* Image thumbnails grid */}
              {(bill.payload.attachments ?? []).some((a) =>
                a.content_type.startsWith("image/"),
              ) && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {(bill.payload.attachments ?? [])
                    .filter((a) => a.content_type.startsWith("image/"))
                    .map((att) => (
                      <button
                        key={att.id}
                        onClick={() => handlePreview(att)}
                        className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700 hover:border-zinc-500 transition-colors group"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`data:${att.content_type};base64,${att.data}`}
                          alt={att.filename}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <Eye className="w-5 h-5 text-zinc-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))}
                </div>
              )}

              {/* File list */}
              <div className="space-y-1.5">
                {(bill.payload.attachments ?? []).map((att) => {
                  const isImage = att.content_type.startsWith("image/");
                  return (
                    <div
                      key={att.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-800 group hover:border-zinc-700 transition-colors"
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          isImage ? "bg-accent/10" : "bg-danger/10",
                        )}
                      >
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
                        <p className="text-[10px] text-zinc-600">
                          {formatBytes(att.size)}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 sm:opacity-100 opacity-0 group-hover:opacity-100 transition-opacity">
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
                <AttachmentUpload
                  billId={bill._id}
                  onUploaded={onBillUpdated}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3 border-t border-zinc-800">
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
                  className="px-3 py-1.5 text-xs font-bold text-zinc-50 bg-danger hover:bg-danger/80 rounded-lg transition-colors disabled:opacity-50"
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

      {/* Image lightbox */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {previewAttachment && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md"
                onClick={() => setPreviewAttachment(null)}
              >
                {/* Fixed top bar */}
                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3">
                  <p className="text-sm text-zinc-300 font-medium truncate">
                    {previewAttachment.filename}
                    <span className="text-zinc-500 ml-2 text-xs">
                      {formatBytes(previewAttachment.size)}
                    </span>
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(previewAttachment);
                      }}
                      className="p-2.5 bg-zinc-800/80 text-zinc-300 hover:text-zinc-50 rounded-xl hover:bg-zinc-700 transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPreviewAttachment(null)}
                      className="p-2.5 bg-zinc-800/80 text-zinc-300 hover:text-zinc-50 rounded-xl hover:bg-zinc-700 transition-colors"
                      title="Close (Esc)"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Centered preview */}
                <div
                  className="w-full h-full p-6 pt-20 pb-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  {previewAttachment.content_type.startsWith("image/") ? (
                    <motion.img
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0.9 }}
                      src={`data:${previewAttachment.content_type};base64,${previewAttachment.data}`}
                      alt={previewAttachment.filename}
                      className="w-full h-full rounded-xl object-contain object-center shadow-2xl"
                      onClick={() => setPreviewAttachment(null)}
                    />
                  ) : (
                    <motion.iframe
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      src={`data:application/pdf;base64,${previewAttachment.data}#toolbar=0&view=Fit`}
                      title={previewAttachment.filename}
                      className="w-full h-full rounded-xl border border-zinc-800 shadow-2xl bg-white"
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
