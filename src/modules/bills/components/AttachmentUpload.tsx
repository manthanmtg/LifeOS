"use client";

import { useState, useCallback, useRef, type DragEvent } from "react";
import { Upload, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Bill } from "../types";

interface AttachmentUploadProps {
  billId: string;
  onUploaded: (bill: Bill) => void;
}

export default function AttachmentUpload({
  billId,
  onUploaded,
}: AttachmentUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const validFiles = files.filter((f) => {
        if (!f.type.startsWith("image/") && f.type !== "application/pdf")
          return false;
        if (f.size > 5 * 1024 * 1024) return false;
        return true;
      });

      if (validFiles.length === 0) {
        setError("No valid files. Only images and PDFs under 5 MB.");
        return;
      }

      setError("");
      setUploading(true);

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setUploadProgress(
          `Uploading ${i + 1}/${validFiles.length}: ${file.name}`,
        );
        try {
          const raw = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
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
            setError(d.error ?? `Failed to upload ${file.name}`);
          }
        } catch {
          setError(`Failed to upload ${file.name}`);
        }
      }

      try {
        const billRes = await fetch(`/api/bills/${billId}`);
        if (billRes.ok) {
          const billData = await billRes.json();
          onUploaded(billData.data);
        }
      } catch {
        /* ignore */
      }

      setUploading(false);
      setUploadProgress("");
    },
    [billId, onUploaded],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) uploadFiles(files);
    },
    [uploadFiles],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) uploadFiles(files);
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
          "flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all",
          dragging
            ? "border-accent bg-accent/5 scale-[1.01]"
            : "border-zinc-700/60 hover:border-zinc-500 bg-zinc-800/20 hover:bg-zinc-800/40",
          uploading && "opacity-60 cursor-not-allowed pointer-events-none",
        )}
      >
        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
          <Upload className="w-5 h-5 text-zinc-400" />
        </div>
        <div className="text-center">
          <p className="text-xs text-zinc-300 font-medium">
            {uploading ? uploadProgress : "Drop files or click to browse"}
          </p>
          <p className="text-[10px] text-zinc-600 mt-0.5">
            Images & PDFs — max 5 MB each — multiple files supported
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>
    </div>
  );
}
