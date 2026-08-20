"use client";

import {
  useState,
  useMemo,
  useRef,
  useCallback,
  useId,
  type DragEvent,
} from "react";
import {
  X,
  AlertCircle,
  Upload,
  FileText,
  ImageIcon,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { formatBytes } from "../helpers";
import type { Bill, BillFolder, BillPayload } from "../types";
import { useDialogAccessibility } from "@/components/ui/Dialog";
import { Field, FieldLabel } from "@/components/ui/Field";

interface BillModalProps {
  folders: BillFolder[];
  bill: Bill | null;
  defaultFolderId?: string;
  onClose: () => void;
  onSaved: (bill: Bill) => void;
}

export default function BillModal({
  folders,
  bill,
  defaultFolderId,
  onClose,
  onSaved,
}: BillModalProps) {
  const [name, setName] = useState(bill?.payload.name ?? "");
  const [billDate, setBillDate] = useState(() =>
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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState<string>(
    bill?.payload.amount !== undefined ? bill.payload.amount.toString() : "",
  );
  const [currency, setCurrency] = useState<string>(
    bill?.payload.currency ?? "INR",
  );
  const [dragging, setDragging] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const titleId = useId();
  const errorId = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogAccessibility({
    isOpen: true,
    onClose,
    initialFocusRef: nameInputRef,
  });

  const flatFolders = useMemo(() => {
    const result: { id: string; name: string; depth: number }[] = [];
    const addNodes = (parentId: string | undefined, depth: number) => {
      folders
        .filter((f) => (f.payload.parent_id ?? undefined) === parentId)
        .forEach((f) => {
          result.push({ id: f._id, name: f.payload.name, depth });
          addNodes(f._id, depth + 1);
        });
    };
    addNodes(undefined, 0);
    return result;
  }, [folders]);

  const compressImage = useCallback(
    async (file: File, maxSizeBytes = 1024 * 1024): Promise<File> => {
      if (file.size <= maxSizeBytes || !file.type.startsWith("image/"))
        return file;

      return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          const canvas = document.createElement("canvas");
          let { width, height } = img;

          // Scale down large images
          const maxDim = 2048;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, width, height);

          // Try decreasing quality until under maxSizeBytes
          let quality = 0.8;
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (blob && (blob.size <= maxSizeBytes || quality <= 0.2)) {
                  const compressed = new File([blob!], file.name, {
                    type: "image/jpeg",
                    lastModified: Date.now(),
                  });
                  resolve(compressed);
                } else {
                  quality -= 0.15;
                  tryCompress();
                }
              },
              "image/jpeg",
              quality,
            );
          };
          tryCompress();
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(file);
        };
        img.src = url;
      });
    },
    [],
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      const accepted = files.filter((f) => {
        if (!f.type.startsWith("image/") && f.type !== "application/pdf")
          return false;
        if (f.type === "application/pdf" && f.size > 5 * 1024 * 1024)
          return false;
        return true;
      });
      if (accepted.length === 0 && files.length > 0) {
        setError("Only images and PDFs are accepted (PDFs max 5 MB).");
        return;
      }

      setCompressing(true);
      try {
        const processed = await Promise.all(
          accepted.map((f) =>
            f.type.startsWith("image/") ? compressImage(f) : Promise.resolve(f),
          ),
        );
        setPendingFiles((prev) => [...prev, ...processed]);
      } finally {
        setCompressing(false);
      }
    },
    [compressImage],
  );

  const removeFile = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const uploadPendingFiles = async (billId: string) => {
    for (const file of pendingFiles) {
      try {
        const raw = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const data = raw.split(",")[1];
        await fetch(`/api/bills/${billId}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            content_type: file.type,
            data,
          }),
        });
      } catch {
        /* continue uploading others */
      }
    }
  };

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
      amount: amount.trim() ? parseFloat(amount) : undefined,
      currency: currency,
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

      const savedId =
        bill?._id ??
        data.data._id?.toString() ??
        data.data.insertedId?.toString();

      // Upload pending files if any
      if (pendingFiles.length > 0 && savedId) {
        await uploadPendingFiles(savedId);
      }

      // Re-fetch the bill to get updated attachments
      let finalBill: Bill;
      if (pendingFiles.length > 0 && savedId) {
        try {
          const freshRes = await fetch(`/api/bills/${savedId}`);
          if (freshRes.ok) {
            const freshData = await freshRes.json();
            finalBill = freshData.data;
          } else {
            finalBill = bill
              ? { ...bill, payload }
              : {
                  _id: savedId,
                  module_type: "bill",
                  is_public: false,
                  payload,
                  created_at: data.data.created_at,
                  updated_at: data.data.updated_at,
                };
          }
        } catch {
          finalBill = bill
            ? { ...bill, payload }
            : {
                _id: savedId,
                module_type: "bill",
                is_public: false,
                payload,
                created_at: data.data.created_at,
                updated_at: data.data.updated_at,
              };
        }
      } else {
        finalBill = bill
          ? { ...bill, payload }
          : {
              _id: savedId,
              module_type: "bill",
              is_public: false,
              payload,
              created_at: data.data.created_at,
              updated_at: data.data.updated_at,
            };
      }

      onSaved(finalBill);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const formId = "bill-modal-form";

  const inputClass =
    "w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors";

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal — fixed fullscreen on mobile, centered card on desktop */}
      <motion.div
        ref={dialogRef}
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: "spring", damping: 28, stiffness: 350 }}
        className={cn(
          "flex flex-col bg-zinc-900 shadow-2xl shadow-black/40",
          // Mobile: fixed fullscreen — gives flex container definite height
          "fixed inset-0 z-10",
          // Desktop: centered card with max-height
          "sm:absolute sm:inset-auto sm:top-[8vh] sm:left-1/2 sm:-translate-x-1/2",
          "sm:w-full sm:max-w-lg sm:max-h-[84vh]",
          "sm:rounded-2xl sm:border sm:border-zinc-700/80",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={error ? errorId : undefined}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 [padding-top:max(0.875rem,env(safe-area-inset-top))] border-b border-zinc-800">
          <h2
            id={titleId}
            className="text-sm font-bold text-zinc-100 uppercase tracking-widest"
          >
            {bill ? "Edit Bill" : "New Bill"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bill editor"
            className="min-h-11 min-w-11 p-2 -mr-2 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form
          id={formId}
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
        >
          <div className="px-5 py-4 space-y-4">
            {error && (
              <div
                id={errorId}
                role="alert"
                className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Name */}
            <Field>
              <FieldLabel htmlFor="bill-name" required>
                Name
              </FieldLabel>
              <input
                ref={nameInputRef}
                id="bill-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Electricity Bill"
                className={cn(inputClass, "placeholder-zinc-600")}
                required
              />
            </Field>

            {/* Date */}
            <Field>
              <FieldLabel htmlFor="bill-date" required>
                Date
              </FieldLabel>
              <input
                id="bill-date"
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className={inputClass}
                required
              />
            </Field>

            <div className="flex gap-4">
              {/* Currency */}
              <Field className="w-24 shrink-0">
                <FieldLabel htmlFor="bill-currency">Currency</FieldLabel>
                <input
                  id="bill-currency"
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="INR"
                  className={cn(inputClass, "uppercase")}
                />
              </Field>

              {/* Amount */}
              <Field className="flex-1">
                <FieldLabel htmlFor="bill-amount">Amount</FieldLabel>
                <input
                  id="bill-amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={inputClass}
                />
              </Field>
            </div>

            {/* Folder */}
            <Field>
              <FieldLabel htmlFor="bill-folder">Folder</FieldLabel>
              <select
                id="bill-folder"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className={inputClass}
              >
                <option value="">Root</option>
                {flatFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {"\u2014".repeat(f.depth)} {f.name}
                  </option>
                ))}
              </select>
            </Field>

            {/* Description */}
            <Field>
              <FieldLabel htmlFor="bill-description">Description</FieldLabel>
              <textarea
                id="bill-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional short description"
                rows={2}
                className={cn(inputClass, "placeholder-zinc-600 resize-none")}
              />
            </Field>

            {/* Notes */}
            <Field>
              <FieldLabel htmlFor="bill-notes">Notes</FieldLabel>
              <textarea
                id="bill-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                rows={2}
                className={cn(inputClass, "placeholder-zinc-600 resize-none")}
              />
            </Field>

            {/* Attachments */}
            <Field>
              <FieldLabel htmlFor="bill-attachments">Attachments</FieldLabel>
              <label
                htmlFor="bill-attachments"
                onDragOver={(e: DragEvent<HTMLLabelElement>) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e: DragEvent<HTMLLabelElement>) => {
                  e.preventDefault();
                  setDragging(false);
                  addFiles(Array.from(e.dataTransfer.files));
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                  dragging
                    ? "border-accent bg-accent/5"
                    : "border-zinc-700/60 hover:border-zinc-500 bg-zinc-800/20 hover:bg-zinc-800/40",
                )}
              >
                <Upload className="w-5 h-5 text-zinc-500" />
                <p className="text-xs text-zinc-400 font-medium">
                  {compressing
                    ? "Compressing\u2026"
                    : "Drop files or click to browse"}
                </p>
                <p className="text-xs text-zinc-600">
                  Images auto-compressed &middot; PDFs max 5 MB
                </p>
                <input
                  ref={fileInputRef}
                  id="bill-attachments"
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(Array.from(e.target.files ?? []));
                    e.target.value = "";
                  }}
                />
              </label>

              {pendingFiles.length > 0 && (
                <div className="space-y-1 mt-2">
                  {pendingFiles.map((f, i) => {
                    const isImage = f.type.startsWith("image/");
                    return (
                      <div
                        key={`${f.name}-${i}`}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
                      >
                        <div
                          className={cn(
                            "w-6 h-6 rounded flex items-center justify-center shrink-0",
                            isImage ? "bg-accent/10" : "bg-danger/10",
                          )}
                        >
                          {isImage ? (
                            <ImageIcon className="w-3.5 h-3.5 text-accent" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-danger" />
                          )}
                        </div>
                        <span className="text-xs text-zinc-300 truncate flex-1 min-w-0">
                          {f.name}
                        </span>
                        <span className="text-xs text-zinc-600 shrink-0">
                          {formatBytes(f.size)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${f.name}`}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            removeFile(i);
                          }}
                          className="p-0.5 text-zinc-500 hover:text-danger rounded transition-colors shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {bill && (bill.payload.attachments?.length ?? 0) > 0 && (
                <p className="text-xs text-zinc-600 mt-1">
                  {bill.payload.attachments.length} existing attachment
                  {bill.payload.attachments.length !== 1 ? "s" : ""} (manage in
                  bill detail)
                </p>
              )}
            </Field>
          </div>
        </form>

        {/* Footer — always pinned at bottom */}
        <div className="shrink-0 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3 border-t border-zinc-800 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form={formId}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-zinc-950 text-sm font-bold hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : bill ? "Save Changes" : "Create Bill"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
