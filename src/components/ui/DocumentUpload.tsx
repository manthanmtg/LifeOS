"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { AlertCircle, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export const DOCUMENT_MAX_FILE_SIZE = 5 * 1024 * 1024;

interface DocumentUploadProps {
  onUpload: (file: {
    filename: string;
    content_type: string;
    data: string;
  }) => Promise<void>;
  accept?: string;
  validateFile?: (file: File) => string | null;
  helpText?: string;
  inputLabel?: string;
}

function readAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function DocumentUpload({
  onUpload,
  accept,
  validateFile,
  helpText = "Any file type — max 5 MB each — multiple files supported",
  inputLabel = "Upload document",
}: DocumentUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadFiles = useCallback(
    async (files: File[]) => {
      const rejected = files
        .map(
          (file) =>
            validateFile?.(file) ??
            (file.size > DOCUMENT_MAX_FILE_SIZE
              ? "File exceeds 5 MB limit"
              : null),
        )
        .find(Boolean);
      if (rejected) {
        setError(rejected);
        return;
      }
      setError("");
      setUploading(true);
      const failures: string[] = [];
      for (const [index, file] of files.entries()) {
        setProgress(`Uploading ${index + 1}/${files.length}: ${file.name}`);
        try {
          await onUpload({
            filename: file.name,
            content_type: file.type || "application/octet-stream",
            data: await readAsBase64(file),
          });
        } catch (cause) {
          failures.push(
            cause instanceof Error
              ? cause.message
              : `Failed to upload ${file.name}`,
          );
        }
      }
      setUploading(false);
      setProgress("");
      if (failures.length) setError(failures[0]);
    },
    [onUpload, validateFile],
  );
  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      void uploadFiles(Array.from(event.dataTransfer.files));
    },
    [uploadFiles],
  );
  return (
    <div className="space-y-2">
      {error && (
        <p role="alert" className="flex items-center gap-1 text-xs text-danger">
          <AlertCircle aria-hidden="true" className="h-3 w-3" /> {error}
        </p>
      )}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 transition-all",
          dragging
            ? "scale-[1.01] border-accent bg-accent/5"
            : "border-zinc-700/60 bg-zinc-800/20 hover:border-zinc-500 hover:bg-zinc-800/40",
          uploading && "pointer-events-none cursor-not-allowed opacity-60",
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800">
          <Upload aria-hidden="true" className="h-5 w-5 text-zinc-400" />
        </div>
        <div className="text-center">
          <p className="text-xs font-medium text-zinc-300">
            {uploading ? progress : "Drop files or click to browse"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-600">{helpText}</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          aria-label={inputLabel}
          accept={accept}
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length) void uploadFiles(files);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
