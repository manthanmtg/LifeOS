"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate, formatBytes } from "../helpers";
import AttachmentUpload from "./AttachmentUpload";
import type { Bill, BillFolder } from "../types";

interface BillDetailProps {
  bill: Bill;
  folders: BillFolder[];
  onClose: () => void;
  onEdit: (bill: Bill) => void;
  onDeleted: (id: string) => void;
  onUpdated: (bill: Bill) => void;
  onMoveBill: (bill: Bill) => void;
}

export default function BillDetail({
  bill,
  folders,
  onClose,
  onEdit,
  onDeleted,
  onUpdated,
  onMoveBill,
}: BillDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<
    string | null
  >(null);
  const [previewAttachment, setPreviewAttachment] = useState<
    Bill["payload"]["attachments"][0] | null
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
    if (attachment.content_type.startsWith("image/")) {
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
      <div className="fixed inset-0 z-50 flex justify-end">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="relative w-full max-w-md sm:max-w-lg bg-zinc-900 border-l border-zinc-700 shadow-2xl flex flex-col h-full"
        >
          {/* Header */}
          <div className="flex items-start gap-3 px-5 py-4 border-b border-zinc-800">
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
                onClick={() => onMoveBill(bill)}
                title="Move to folder"
                className="p-2 text-zinc-500 hover:text-accent rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <FolderInput className="w-4 h-4" />
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
          <div className="overflow-y-auto flex-1 p-5 space-y-5">
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
                          <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
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
                <AttachmentUpload billId={bill._id} onUploaded={onUpdated} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-zinc-800">
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

      {/* Image lightbox */}
      <AnimatePresence>
        {previewAttachment && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setPreviewAttachment(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-3xl max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${previewAttachment.content_type};base64,${previewAttachment.data}`}
                alt={previewAttachment.filename}
                className="max-w-full max-h-[85vh] rounded-xl object-contain"
              />
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  onClick={() => handleDownload(previewAttachment)}
                  className="p-2 bg-black/60 text-white rounded-lg hover:bg-black/80 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewAttachment(null)}
                  className="p-2 bg-black/60 text-white rounded-lg hover:bg-black/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-center text-xs text-zinc-400 mt-2">
                {previewAttachment.filename} ·{" "}
                {formatBytes(previewAttachment.size)}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
