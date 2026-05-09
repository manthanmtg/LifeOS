"use client";

import { useEffect, useState } from "react";
import { FileStack, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResumeData {
  _id: string;
  payload: {
    filename: string;
    content: string;
    is_active: boolean;
    uploaded_at: string;
  };
}

function formatUploadDate(iso: string) {
  return iso.split("T")[0] || "Unknown date";
}

export function ResumeManager({
  setStatus,
}: {
  setStatus: (s: { kind: "success" | "error"; text: string } | null) => void;
}) {
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const fetchResumes = async () => {
    try {
      const r = await fetch("/api/content?module_type=portfolio_resume");
      const d = await r.json();
      if (r.ok) setResumes(d.data || []);
    } catch {
      console.error("fetchResumes failed");
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setStatus({ kind: "error", text: "Please upload a PDF file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatus({ kind: "error", text: "Resume file too large (max 5MB)." });
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            module_type: "portfolio_resume",
            is_public: true,
            payload: {
              filename: file.name,
              content: base64,
              is_active: resumes.length === 0,
              uploaded_at: new Date().toISOString(),
            },
          }),
        });
        if (!res.ok) throw new Error("Upload failed");
        await fetchResumes();
        setStatus({ kind: "success", text: "Resume uploaded." });
      } catch {
        setStatus({ kind: "error", text: "Failed to upload resume." });
      } finally {
        setUploading(false);
        if (e.target) e.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const confirmDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await fetchResumes();
      setStatus({ kind: "success", text: "Resume deleted." });
    } catch {
      setStatus({ kind: "error", text: "Failed to delete resume." });
    } finally {
      setPendingDeleteId(null);
    }
  };

  const toggleActive = async (id: string, currentlyActive: boolean) => {
    if (currentlyActive) return;
    try {
      setUploading(true);
      const others = resumes.filter((r) => r._id !== id && r.payload.is_active);
      for (const r of others) {
        await fetch(`/api/content/${r._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload: { ...r.payload, is_active: false } }),
        });
      }
      const target = resumes.find((r) => r._id === id);
      if (target) {
        await fetch(`/api/content/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payload: { ...target.payload, is_active: true },
          }),
        });
      }
      await fetchResumes();
      setStatus({ kind: "success", text: "Active resume updated." });
    } catch {
      setStatus({ kind: "error", text: "Failed to update active resume." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileStack className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-zinc-300">
            Resume Manager
          </h3>
        </div>
        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors text-xs cursor-pointer border border-zinc-700/50">
          {uploading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          Upload PDF
          <input
            type="file"
            accept=".pdf"
            disabled={uploading}
            onChange={handleUpload}
            className="hidden"
          />
        </label>
      </div>

      {resumes.length === 0 ? (
        <div className="py-8 text-center border-2 border-dashed border-zinc-800 rounded-xl">
          <FileStack className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-xs text-zinc-500">
            No resumes uploaded yet. (PDF only)
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {resumes.map((res) => (
            <div
              key={res._id}
              className={cn(
                "flex items-center justify-between p-3 rounded-xl border transition-all",
                res.payload.is_active
                  ? "bg-accent/5 border-accent/30"
                  : "bg-zinc-800/40 border-zinc-800 hover:border-zinc-700",
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    res.payload.is_active
                      ? "bg-accent/20 text-accent"
                      : "bg-zinc-900 text-zinc-500",
                  )}
                >
                  <FileStack className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-300 truncate">
                    {res.payload.filename}
                  </p>
                  <time
                    dateTime={res.payload.uploaded_at}
                    className="text-[10px] text-zinc-500"
                  >
                    {formatUploadDate(res.payload.uploaded_at)}
                  </time>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleActive(res._id, res.payload.is_active)}
                  disabled={uploading || res.payload.is_active}
                  aria-pressed={res.payload.is_active}
                  aria-label={
                    res.payload.is_active
                      ? `${res.payload.filename} is the active resume`
                      : `Set ${res.payload.filename} as the active resume`
                  }
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                    res.payload.is_active
                      ? "bg-accent text-zinc-50"
                      : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-700/50",
                  )}
                >
                  {res.payload.is_active ? "Active" : "Set Active"}
                </button>
                {pendingDeleteId === res._id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => confirmDelete(res._id)}
                      aria-label={`Confirm deletion of ${res.payload.filename}`}
                      className="px-2 py-1 rounded-md text-[10px] font-bold bg-danger/15 text-danger border border-danger/25 hover:bg-danger/25 transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setPendingDeleteId(null)}
                      className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                      aria-label={`Cancel deletion of ${res.payload.filename}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setPendingDeleteId(res._id)}
                    disabled={uploading}
                    className="p-1.5 text-zinc-500 hover:text-danger transition-colors disabled:opacity-50"
                    aria-label={`Delete ${res.payload.filename}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-zinc-500 italic">
        Only one resume can be active. This will appear on your public
        portfolio.
      </p>
    </div>
  );
}
