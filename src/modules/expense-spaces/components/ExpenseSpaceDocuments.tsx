"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Eye, FileText, Search, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DocPreview from "@/components/ui/DocPreview";
import DocumentUpload from "@/components/ui/DocumentUpload";
import { expenseSpacesApi } from "../api";
import type { ExpenseSpaceDetail, ExpenseSpaceStoredDocument } from "../types";

const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function ExpenseSpaceDocuments({
  space,
}: {
  space: ExpenseSpaceDetail;
}) {
  const [documents, setDocuments] = useState<ExpenseSpaceStoredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<ExpenseSpaceStoredDocument | null>(
    null,
  );
  const [preview, setPreview] = useState<{
    document: ExpenseSpaceStoredDocument;
    src: string;
  } | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await expenseSpacesApi.listDocuments(
        space._id,
        page,
        search,
      );
      setDocuments(result.documents);
      setTotalPages(result.totalPages);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to load documents",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, space._id]);
  useEffect(() => {
    void load();
  }, [load]);
  const previewDocument = async (document: ExpenseSpaceStoredDocument) => {
    try {
      const response = await fetch(
        `/api/expense-spaces/${space._id}/docs/${document._id}`,
      );
      if (!response.ok) throw new Error("Failed to open document");
      setPreview({ document, src: URL.createObjectURL(await response.blob()) });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to open document",
      );
    }
  };
  const closePreview = () => {
    if (preview) URL.revokeObjectURL(preview.src);
    setPreview(null);
  };
  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
        <h2 className="text-xl font-black text-zinc-50">Space documents</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Store files for {space.payload.name}. Files are private to this space.
        </p>
        {space.payload.status === "active" ? (
          <div className="mt-5">
            <DocumentUpload
              onUpload={async (file) => {
                await expenseSpacesApi.uploadDocument(space._id, file);
                await load();
              }}
            />
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-warning/30 bg-warning-muted/15 p-3 text-sm text-warning">
            Restore this space in Settings before uploading or deleting
            documents.
          </p>
        )}
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
        <label className="relative block">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-500"
          />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search documents"
            className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950/50 pl-10 pr-3 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        {error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        )}
        {loading ? (
          <div
            role="status"
            aria-label="Loading documents"
            className="mt-5 space-y-3 animate-pulse"
          >
            <div className="h-16 rounded-xl bg-zinc-800" />
            <div className="h-16 rounded-xl bg-zinc-800" />
          </div>
        ) : documents.length === 0 ? (
          <div className="py-12 text-center">
            <FileText
              aria-hidden="true"
              className="mx-auto h-9 w-9 text-zinc-600"
            />
            <p className="mt-3 font-semibold text-zinc-300">No documents yet</p>
            <p className="mt-1 text-sm text-zinc-500">
              Upload a PDF, image, spreadsheet, or any other file.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-800">
            {documents.map((document) => (
              <li key={document._id} className="flex items-center gap-3 py-3">
                <FileText
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-accent"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-100">
                    {document.payload.filename}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {formatBytes(document.payload.size)} ·{" "}
                    {new Date(document.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => void previewDocument(document)}
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50"
                    aria-label={`Preview ${document.payload.filename}`}
                  >
                    <Eye aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <a
                    href={`/api/expense-spaces/${space._id}/docs/${document._id}`}
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50"
                    aria-label={`Download ${document.payload.filename}`}
                  >
                    <Download aria-hidden="true" className="h-4 w-4" />
                  </a>
                  {space.payload.status === "active" && (
                    <button
                      type="button"
                      onClick={() => setDeleting(document)}
                      className="flex h-11 w-11 items-center justify-center rounded-lg text-danger hover:bg-danger-muted/20"
                      aria-label={`Delete ${document.payload.filename}`}
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="h-10 rounded-lg border border-zinc-700 px-3 text-sm text-zinc-300 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="h-10 rounded-lg border border-zinc-700 px-3 text-sm text-zinc-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete document?"
        description={`Delete ${deleting?.payload.filename ?? "this document"}? This cannot be undone.`}
        confirmLabel="Delete"
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting)
            void expenseSpacesApi
              .deleteDocument(space._id, deleting._id)
              .then(load)
              .catch((cause) =>
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Failed to delete document",
                ),
              );
        }}
      />
      {preview && (
        <DocPreview
          src={preview.src}
          contentType={preview.document.payload.content_type}
          filename={preview.document.payload.filename}
          size={preview.document.payload.size}
          onClose={closePreview}
        />
      )}
    </section>
  );
}
