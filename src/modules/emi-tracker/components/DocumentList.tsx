"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  FileText,
  UploadCloud,
  Link as LinkIcon,
} from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Toast from "@/components/ui/Toast";
import { EmiLoan, DocType } from "../types";

interface DocumentListProps {
  documents: EmiLoan["payload"]["documents"];
  onAdd: (doc: EmiLoan["payload"]["documents"][number]) => Promise<void>;
  onDelete: (index: number) => Promise<void>;
  isSubmitting: boolean;
}

export default function DocumentList({
  documents,
  onAdd,
  onDelete,
  isSubmitting,
}: DocumentListProps) {
  const [docType, setDocType] = useState<DocType>("sanction_letter");
  const [docTitle, setDocTitle] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docIssuedAt, setDocIssuedAt] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DocType | "all">("all");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    if (!docTitle) setDocTitle(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setDocUrl(reader.result as string);
      setIsUploading(false);
    };
    reader.onerror = () => {
      setUploadError("Failed to read file. Try another file or paste a URL.");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docUrl.trim()) return;

    await onAdd({
      type: docType,
      title: docTitle.trim(),
      url: docUrl.trim(),
      issued_at: docIssuedAt || undefined,
      added_at: new Date().toISOString(),
    });

    setDocTitle("");
    setDocUrl("");
    setDocIssuedAt("");
    setToast("Document saved");
  };

  const visibleDocuments =
    filter === "all"
      ? documents
      : documents.filter((document) => document.type === filter);

  return (
    <div className="space-y-6">
      <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5">
        <h3 className="text-xl font-black text-zinc-100 mb-2">Documents</h3>
        <p className="mb-5 text-sm text-zinc-500">
          Add sanction letters, certificates, receipts, or your NOC.
        </p>
        <div className="mb-5 flex flex-wrap gap-2">
          {[
            ["all", "All"],
            ["sanction_letter", "Sanction letters"],
            ["interest_certificate", "Certificates"],
            ["noc", "NOCs"],
            ["other", "Other"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id as DocType | "all")}
              className={`min-h-[44px] rounded-2xl border px-4 py-2 text-sm font-bold transition-colors ${
                filter === id
                  ? "border-accent/30 bg-accent/10 text-accent"
                  : "border-zinc-800 bg-zinc-950/35 text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <div className="lg:col-span-2">
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5 px-0.5">
              Document Title
            </label>
            <input
              placeholder="e.g. Sanction Letter / NOC / Certificate"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full min-h-[44px] bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-base text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all shadow-inner"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5 px-0.5">
              Type
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocType)}
              className="w-full min-h-[44px] bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-base text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all font-mono"
            >
              <option value="sanction_letter">Sanction Letter</option>
              <option value="noc">NOC</option>
              <option value="interest_certificate">Interest Certificate</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5 px-0.5">
              Upload File
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1 min-h-[44px] flex items-center justify-center gap-2 border-2 border-dashed border-zinc-800 hover:border-accent/40 hover:bg-zinc-900/50 rounded-xl p-3 cursor-pointer transition-all group">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <UploadCloud className="w-4 h-4 text-zinc-500 group-hover:text-accent transition-colors" />
                <span className="text-xs text-zinc-400 font-bold truncate">
                  {docUrl ? "File loaded" : "Drop file or click to upload"}
                </span>
                {isUploading && (
                  <div className="w-3 h-3 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                )}
              </label>
            </div>
            {uploadError && (
              <p
                role="alert"
                className="mt-2 text-sm font-semibold text-danger"
              >
                {uploadError}
              </p>
            )}
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting || !docUrl || !docTitle}
              className="w-full min-h-[44px] bg-accent hover:bg-accent-hover text-zinc-50 font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-accent/10 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Save Document
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleDocuments.length === 0 ? (
          <div className="md:col-span-2 bg-zinc-950/20 border border-zinc-800/50 rounded-2xl p-8 text-center shadow-lg">
            <h3 className="text-lg font-black text-zinc-100">
              Keep loan documents together
            </h3>
            <p className="mt-2 text-zinc-500 text-sm font-medium">
              Add sanction letters, certificates, receipts, or your NOC.
            </p>
          </div>
        ) : (
          visibleDocuments.map((doc) => {
            const idx = documents.indexOf(doc);
            return (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl hover:border-zinc-700/80 transition-all group shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-zinc-800 text-zinc-400 group-hover:text-accent transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-100 line-clamp-1">
                      {doc.title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 font-black uppercase tracking-widest">
                      {doc.type.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-1">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-50 transition-all shadow-md"
                    aria-label="Open document"
                    title="View Document"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => setDeleteIndex(idx)}
                    aria-label="Delete document"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-zinc-50 transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                    title="Delete Document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
      <ConfirmDialog
        isOpen={deleteIndex !== null}
        title="Delete document?"
        description="This document reference will be removed from the loan."
        confirmLabel="Delete"
        onClose={() => setDeleteIndex(null)}
        onConfirm={() => {
          if (deleteIndex !== null) {
            void onDelete(deleteIndex).then(() => setToast("Document deleted"));
          }
        }}
      />
      <Toast
        message={toast ?? ""}
        type="success"
        isVisible={!!toast}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
