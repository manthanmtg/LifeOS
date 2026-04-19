"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  FileText,
  UploadCloud,
  Link as LinkIcon,
} from "lucide-react";
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    if (!docTitle) setDocTitle(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setDocUrl(reader.result as string);
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert("Failed to read file");
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
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-zinc-300 mb-4">
          Attach Documents
        </h3>
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 px-0.5">
              Document Title
            </label>
            <input
              placeholder="e.g. Sanction Letter / NOC / Certificate"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all shadow-inner"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 px-0.5">
              Type
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocType)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all font-mono"
            >
              <option value="sanction_letter">Sanction Letter</option>
              <option value="noc">NOC</option>
              <option value="interest_certificate">Interest Certificate</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 px-0.5">
              Upload File
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-zinc-800 hover:border-accent/40 hover:bg-zinc-900/50 rounded-xl p-2.5 cursor-pointer transition-all group">
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
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting || !docUrl || !docTitle}
              className="w-full bg-accent hover:bg-accent-hover text-zinc-50 font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-accent/10 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Save Document
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.length === 0 ? (
          <div className="md:col-span-2 bg-zinc-950/20 border border-zinc-800/50 rounded-2xl p-8 text-center shadow-lg">
            <p className="text-zinc-500 text-sm italic font-medium">
              No documents attached yet.
            </p>
          </div>
        ) : (
          documents.map((doc, idx) => (
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
                  <p className="text-[10px] text-zinc-500 mt-1 font-black uppercase tracking-widest">
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
                  title="View Document"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => onDelete(idx)}
                  className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-zinc-50 transition-all opacity-0 group-hover:opacity-100 shadow-md"
                  title="Delete Document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
