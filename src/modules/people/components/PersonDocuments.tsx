"use client";

import { useState, useRef, useCallback, useMemo, type DragEvent } from "react";
import {
  FileText,
  Upload,
  Trash2,
  Eye,
  Plus,
  X,
  ImageIcon,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Person, PersonDocument } from "../types";
import DocPreview from "@/components/ui/DocPreview";

interface PersonDocumentsProps {
  person: Person;
  onUpdate: (person: Person, docs: PersonDocument[]) => Promise<void>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_IMAGE_DIM = 1600; // compress images to max 1600px
const JPEG_QUALITY = 0.8;

/** Compress an image file via canvas resize + JPEG encode */
async function compressImage(
  file: File,
): Promise<{ data: string; size: number; content_type: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        let { width, height } = img;

        // Scale down if larger than max dimension
        if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
          const ratio = Math.min(MAX_IMAGE_DIM / width, MAX_IMAGE_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context failed"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        const base64 = dataUrl.split(",")[1];
        const estimatedSize = Math.floor((base64.length * 3) / 4);
        resolve({
          data: base64,
          size: estimatedSize,
          content_type: "image/jpeg",
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Read a non-image file as base64 */
async function readFileAsBase64(
  file: File,
): Promise<{ data: string; size: number; content_type: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const raw = reader.result as string;
      const data = raw.split(",")[1];
      resolve({ data, size: file.size, content_type: file.type });
    };
    reader.readAsDataURL(file);
  });
}

export default function PersonDocuments({
  person,
  onUpdate,
}: PersonDocumentsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [docName, setDocName] = useState("");
  const [pendingFile, setPendingFile] = useState<{
    data: string;
    filename: string;
    content_type: string;
    size: number;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{
    src: string;
    contentType: string;
    filename: string;
    size?: number;
  } | null>(null);

  const documents = useMemo(
    () => person.payload.documents ?? [],
    [person.payload.documents],
  );
  const documentRows = useMemo(
    () =>
      documents.map((doc) => ({
        ...doc,
        formattedAddedAt: new Date(doc.added_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      })),
    [documents],
  );

  const processFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        setError("File exceeds 5 MB limit");
        return;
      }

      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "application/pdf",
      ];
      if (
        !validTypes.some(
          (t) => file.type.startsWith(t.split("/")[0] + "/") || file.type === t,
        )
      ) {
        if (
          !file.type.startsWith("image/") &&
          file.type !== "application/pdf"
        ) {
          setError("Only images and PDFs are supported");
          return;
        }
      }

      setError("");
      setIsUploading(true);

      try {
        let result;
        if (file.type.startsWith("image/")) {
          result = await compressImage(file);
        } else {
          result = await readFileAsBase64(file);
        }

        setPendingFile({
          data: result.data,
          filename: file.name,
          content_type: result.content_type,
          size: result.size,
        });

        // Auto-fill doc name from filename (without extension)
        if (!docName) {
          const nameWithoutExt = file.name
            .replace(/\.[^.]+$/, "")
            .replace(/[-_]/g, " ");
          setDocName(nameWithoutExt);
        }
      } catch {
        setError("Failed to process file");
      } finally {
        setIsUploading(false);
      }
    },
    [docName],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleSave = async () => {
    if (!docName.trim()) {
      setError("Document name is required");
      return;
    }
    if (!pendingFile) {
      setError("Please upload a file");
      return;
    }

    setIsSaving(true);
    try {
      const newDoc: PersonDocument = {
        id: crypto.randomUUID(),
        name: docName.trim(),
        filename: pendingFile.filename,
        content_type: pendingFile.content_type,
        data: pendingFile.data,
        size: pendingFile.size,
        added_at: new Date().toISOString(),
      };
      await onUpdate(person, [...documents, newDoc]);
      setShowAddForm(false);
      setDocName("");
      setPendingFile(null);
      setError("");
    } catch {
      setError("Failed to save document");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    const updated = documents.filter((d) => d.id !== id);
    await onUpdate(person, updated);
  };

  const openPreview = (doc: PersonDocument) => {
    const prefix = doc.content_type.startsWith("image/")
      ? `data:${doc.content_type};base64,`
      : `data:${doc.content_type};base64,`;
    setPreview({
      src: prefix + doc.data,
      contentType: doc.content_type,
      filename: doc.filename,
      size: doc.size,
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const resetForm = () => {
    setShowAddForm(false);
    setDocName("");
    setPendingFile(null);
    setError("");
    setIsUploading(false);
  };

  return (
    <>
      <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
            <FolderOpen className="w-3.5 h-3.5" /> Documents
          </h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider rounded-lg border border-accent/20 hover:bg-accent/20 transition-all active:scale-95"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-xl p-4 mb-4 space-y-3">
                {error && (
                  <p className="text-xs text-danger flex items-center gap-1.5 bg-danger/5 border border-danger/10 px-3 py-2 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
                  </p>
                )}

                <div className="space-y-1.5">
                  <label
                    className="text-[9px] font-bold uppercase tracking-wider text-zinc-600"
                    htmlFor={`person-document-name-${person._id}`}
                  >
                    Document Name *
                  </label>
                  <input
                    id={`person-document-name-${person._id}`}
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="e.g. Passport, Aadhaar, PAN Card..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 outline-none focus:border-accent/40 transition-colors"
                  />
                </div>

                {/* Upload zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                    dragging
                      ? "border-accent bg-accent/5 scale-[1.01]"
                      : pendingFile
                        ? "border-success/40 bg-success/5"
                        : "border-zinc-700/60 hover:border-zinc-500 bg-zinc-800/20 hover:bg-zinc-800/40",
                    isUploading &&
                      "opacity-60 cursor-not-allowed pointer-events-none",
                  )}
                >
                  {pendingFile ? (
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-9 h-9 rounded-lg bg-success/10 border border-success/20 flex items-center justify-center shrink-0">
                        {pendingFile.content_type.startsWith("image/") ? (
                          <ImageIcon className="w-4 h-4 text-success" />
                        ) : (
                          <FileText className="w-4 h-4 text-success" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-zinc-200 font-medium truncate">
                          {pendingFile.filename}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {formatBytes(pendingFile.size)} · Click to change
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingFile(null);
                        }}
                        aria-label="Remove selected document"
                        className="p-1.5 text-zinc-500 hover:text-danger rounded-lg hover:bg-danger/10 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center">
                        <Upload className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] text-zinc-300 font-medium">
                          {isUploading
                            ? "Processing..."
                            : "Drop file or click to browse"}
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">
                          Images auto-compressed · PDFs supported · Max 5 MB
                        </p>
                      </div>
                      {isUploading && (
                        <div className="w-4 h-4 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                      )}
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !pendingFile || !docName.trim()}
                    className="flex-[2] bg-accent text-zinc-950 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-40 transition-all hover:bg-accent-hover active:scale-[0.98]"
                  >
                    {isSaving ? "Saving..." : "Save Document"}
                  </button>
                  <button
                    onClick={resetForm}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-zinc-500 text-xs font-medium border border-zinc-800 hover:text-zinc-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Document list */}
        <div className="space-y-2">
          {documentRows.length > 0
            ? documentRows.map((doc) => (
                <motion.div
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group flex items-center gap-3 p-3 bg-zinc-950/20 border border-zinc-900/40 rounded-xl transition-all hover:bg-zinc-900/40 hover:border-accent/10"
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 group-hover:border-accent/40 transition-all">
                    {doc.content_type.startsWith("image/") ? (
                      <ImageIcon className="w-3.5 h-3.5 text-zinc-500 group-hover:text-accent transition-colors" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-zinc-500 group-hover:text-accent transition-colors" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-accent transition-colors">
                      {doc.name}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      {formatBytes(doc.size)} · {doc.formattedAddedAt}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openPreview(doc)}
                      className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-50 transition-all"
                      title="Preview"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-zinc-50 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))
            : !showAddForm && (
                <div className="flex flex-col items-center rounded-xl border border-dashed border-zinc-800/60 bg-zinc-950/20 px-4 py-6 text-center">
                  <FolderOpen className="mb-2 h-8 w-8 text-zinc-700" />
                  <p className="text-xs font-medium text-zinc-500">
                    No documents yet
                  </p>
                </div>
              )}
        </div>
      </div>

      {/* DocPreview modal */}
      {preview && (
        <DocPreview
          src={preview.src}
          contentType={preview.contentType}
          filename={preview.filename}
          size={preview.size}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
