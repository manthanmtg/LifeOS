"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  FileText,
  Pencil,
  Plus,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";

import DocPreview from "@/components/ui/DocPreview";
import DocumentUpload from "@/components/ui/DocumentUpload";
import { AdminModuleSkeleton } from "@/components/ui/Skeletons";
import {
  splitDocumentFilename,
  validateDocumentFilename,
} from "@/lib/expense-spaces/document-filename";

type Coverage = {
  id: string;
  label: string;
  start_date?: string;
  end_date?: string;
  archived?: boolean;
};
type CoverageStatus = {
  label: string;
  className: string;
};
type Service = {
  id: string;
  date: string;
  description: string;
  type: string;
  archived?: boolean;
};
type WarrantyItem = {
  _id: string;
  payload: {
    warranty_key: string;
    name: string;
    category: string;
    brand?: string;
    model?: string;
    location?: string;
    purchase_date?: string;
    currency: string;
    ownership_status: "owned" | "sold" | "retired";
    archived: boolean;
    revision: number;
    coverages: Coverage[];
    service_history: Service[];
    linked_bills?: unknown[];
  };
};
type WarrantyDocument = {
  _id: string;
  payload: {
    filename: string;
    content_type: string;
    size: number;
    kind: string;
  };
};
type EditableWarrantyDetails = Pick<
  WarrantyItem["payload"],
  | "name"
  | "category"
  | "brand"
  | "model"
  | "location"
  | "purchase_date"
  | "currency"
  | "ownership_status"
  | "coverages"
>;

function makeId() {
  return crypto.randomUUID();
}

function calendarDay(value: Date) {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
}

function dateOnlyDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function dayLabel(days: number) {
  return `${days} day${days === 1 ? "" : "s"}`;
}

function getCoverageStatus(
  coverage: Coverage,
  now = new Date(),
): CoverageStatus {
  const today = calendarDay(now);
  const startDay = coverage.start_date
    ? dateOnlyDay(coverage.start_date)
    : null;
  const endDay = coverage.end_date ? dateOnlyDay(coverage.end_date) : null;

  if (startDay !== null && startDay > today) {
    return {
      label: `Starts in ${dayLabel((startDay - today) / 86_400_000)}`,
      className: "border border-accent/25 bg-accent/10 text-accent",
    };
  }

  if (endDay === null) {
    return {
      label: "No expiry date",
      className: "border border-zinc-700 bg-zinc-800/70 text-zinc-300",
    };
  }

  const daysRemaining = (endDay - today) / 86_400_000;
  if (daysRemaining < 0) {
    return {
      label: `Expired ${dayLabel(Math.abs(daysRemaining))} ago`,
      className: "border border-danger/25 bg-danger/10 text-danger",
    };
  }

  if (daysRemaining === 0) {
    return {
      label: "Expires today",
      className: "border border-warning/25 bg-warning/10 text-warning",
    };
  }

  if (daysRemaining <= 30) {
    return {
      label: `Expires in ${dayLabel(daysRemaining)}`,
      className: "border border-warning/25 bg-warning/10 text-warning",
    };
  }

  return {
    label: `Expires in ${dayLabel(daysRemaining)}`,
    className: "border border-success/25 bg-success/10 text-success",
  };
}

function payloadForUpdate(
  item: WarrantyItem,
  patch: Partial<WarrantyItem["payload"]>,
) {
  const next = { ...item.payload, ...patch };
  const {
    warranty_key: _warrantyKey,
    revision: _revision,
    archived: _archived,
    linked_bills: _linkedBills,
    ...editable
  } = next;
  void _warrantyKey;
  void _revision;
  void _archived;
  void _linkedBills;
  return { ...editable, linked_bill_ids: [], removed_bill_link_ids: [] };
}

export default function WarrantyAdminView() {
  const [items, setItems] = useState<WarrantyItem[]>([]);
  const [selected, setSelected] = useState<WarrantyItem | null>(null);
  const [documents, setDocuments] = useState<WarrantyDocument[]>([]);
  const [preview, setPreview] = useState<{
    document: WarrantyDocument;
    src: string | null;
    loading: boolean;
    error: string;
  } | null>(null);
  const previewRequestRef = useRef(0);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(
    null,
  );
  const [draftDocumentName, setDraftDocumentName] = useState("");
  const [renameError, setRenameError] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<EditableWarrantyDetails | null>(
    null,
  );
  const [name, setName] = useState("");
  const [coverageLabel, setCoverageLabel] = useState("");
  const [coverageStart, setCoverageStart] = useState("");
  const [coverageEnd, setCoverageEnd] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceDate, setServiceDate] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/warranty");
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Failed to load warranty items");
      setItems(body.data.items || []);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Failed to load warranty items",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDocuments = useCallback(async (item: WarrantyItem) => {
    const response = await fetch(`/api/warranty/${item._id}/documents`);
    const body = await response.json();
    if (response.ok) setDocuments(body.data.documents || []);
  }, []);

  useEffect(() => {
    const src = preview?.src;
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [preview?.src]);

  const previewDocument = async (
    item: WarrantyItem,
    document: WarrantyDocument,
  ) => {
    const requestId = ++previewRequestRef.current;
    setPreview({ document, src: null, loading: true, error: "" });
    try {
      const response = await fetch(
        `/api/warranty/${item._id}/documents/${document._id}`,
      );
      if (!response.ok) throw new Error("Failed to open document");
      const src = URL.createObjectURL(await response.blob());
      if (requestId !== previewRequestRef.current) {
        URL.revokeObjectURL(src);
        return;
      }
      setPreview({ document, src, loading: false, error: "" });
    } catch (cause) {
      if (requestId === previewRequestRef.current) {
        setPreview({
          document,
          src: null,
          loading: false,
          error:
            cause instanceof Error ? cause.message : "Failed to open document",
        });
      }
    }
  };

  const closePreview = () => {
    previewRequestRef.current += 1;
    setPreview(null);
  };

  const beginRenameDocument = (document: WarrantyDocument) => {
    setEditingDocumentId(document._id);
    setDraftDocumentName(
      splitDocumentFilename(document.payload.filename).basename,
    );
    setRenameError("");
  };

  const cancelRenameDocument = () => {
    setEditingDocumentId(null);
    setDraftDocumentName("");
    setRenameError("");
  };

  const saveRenameDocument = async (
    item: WarrantyItem,
    document: WarrantyDocument,
  ) => {
    const { extension } = splitDocumentFilename(document.payload.filename);
    const filename = `${draftDocumentName.trim()}${extension}`;
    const validationError = validateDocumentFilename(filename);
    if (validationError) {
      setRenameError(validationError);
      return;
    }
    if (filename === document.payload.filename) {
      cancelRenameDocument();
      return;
    }

    setRenaming(true);
    setRenameError("");
    try {
      const response = await fetch(
        `/api/warranty/${item._id}/documents/${document._id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: draftDocumentName.trim() }),
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Failed to rename document");
      const renamed = body.data as WarrantyDocument;
      setDocuments((current) =>
        current.map((entry) => (entry._id === renamed._id ? renamed : entry)),
      );
      if (preview?.document._id === renamed._id) {
        setPreview({ ...preview, document: renamed });
      }
      cancelRenameDocument();
    } catch (cause) {
      setRenameError(
        cause instanceof Error ? cause.message : "Failed to rename document",
      );
    } finally {
      setRenaming(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, [loadItems]);
  useEffect(() => {
    if (selected) void loadDocuments(selected);
  }, [selected, loadDocuments]);

  const createItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const coverages = coverageLabel.trim()
        ? [
            {
              id: makeId(),
              label: coverageLabel.trim(),
              start_date: coverageStart || undefined,
              end_date: coverageEnd || undefined,
            },
          ]
        : [];
      const response = await fetch("/api/warranty", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payload: { name: name.trim(), coverages } }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Failed to create warranty item");
      setCreating(false);
      setName("");
      setCoverageLabel("");
      setCoverageStart("");
      setCoverageEnd("");
      const created = body.data as WarrantyItem;
      setSelected(created);
      await loadItems();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Failed to create warranty item",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveItem = async (
    item: WarrantyItem,
    patch: Partial<WarrantyItem["payload"]>,
  ): Promise<boolean> => {
    setSaving(true);
    try {
      const response = await fetch(`/api/warranty/${item._id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          revision: item.payload.revision,
          payload: payloadForUpdate(item, patch),
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Failed to save warranty item");
      const updated = body.data as WarrantyItem;
      setSelected(updated);
      setItems((current) =>
        current.map((entry) => (entry._id === updated._id ? updated : entry)),
      );
      setError("");
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to save warranty item",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const beginEditing = () => {
    if (!selected) return;
    const {
      name: draftName,
      category,
      brand,
      model,
      location,
      purchase_date,
      currency,
      ownership_status,
      coverages,
    } = selected.payload;
    setEditDraft({
      name: draftName,
      category,
      brand,
      model,
      location,
      purchase_date,
      currency,
      ownership_status,
      coverages: coverages.map((coverage) => ({ ...coverage })),
    });
    setEditing(true);
  };

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !editDraft || !editDraft.name.trim()) return;

    const saved = await saveItem(selected, {
      ...editDraft,
      name: editDraft.name.trim(),
      purchase_date: editDraft.purchase_date || undefined,
      coverages: editDraft.coverages
        .filter((coverage) => coverage.label.trim())
        .map((coverage) => ({
          ...coverage,
          label: coverage.label.trim(),
          start_date: coverage.start_date || undefined,
          end_date: coverage.end_date || undefined,
        })),
    });
    if (saved) {
      setEditing(false);
      setEditDraft(null);
    }
  };

  if (loading) return <AdminModuleSkeleton />;

  return (
    <section className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-accent">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-bold uppercase tracking-widest">
              Private records
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-black text-zinc-50">Warranty</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Keep coverage, receipts, manuals, and service history together.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Plus className="h-4 w-4" /> Add warranty item
        </button>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger-muted/15 p-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
      {creating && (
        <form
          onSubmit={createItem}
          className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:grid-cols-2"
        >
          <label className="text-sm text-zinc-300">
            Item name
            <input
              autoFocus
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-zinc-50"
            />
          </label>
          <label className="text-sm text-zinc-300">
            Coverage label (optional)
            <input
              value={coverageLabel}
              onChange={(event) => setCoverageLabel(event.target.value)}
              placeholder="Manufacturer warranty"
              className="mt-1 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-zinc-50"
            />
          </label>
          <label className="text-sm text-zinc-300">
            Coverage start
            <input
              type="date"
              value={coverageStart}
              onChange={(event) => setCoverageStart(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-zinc-50"
            />
          </label>
          <label className="text-sm text-zinc-300">
            Coverage end
            <input
              type="date"
              value={coverageEnd}
              onChange={(event) => setCoverageEnd(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-zinc-50"
            />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button
              disabled={saving}
              className="min-h-11 rounded-lg bg-accent px-4 text-sm font-bold text-zinc-50 disabled:opacity-50"
            >
              Save item
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="min-h-11 rounded-lg border border-zinc-700 px-4 text-sm text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
          {items.length === 0 ? (
            <p className="p-5 text-sm text-zinc-400">No warranty items yet</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item._id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(item);
                      setEditing(false);
                      setEditDraft(null);
                    }}
                    className="w-full rounded-xl border border-zinc-800 p-4 text-left hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <p className="font-bold text-zinc-100">
                      {item.payload.name}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {item.payload.coverages.length} coverage
                      {item.payload.coverages.length === 1 ? "" : "s"} ·{" "}
                      {item.payload.service_history.length} service record
                      {item.payload.service_history.length === 1 ? "" : "s"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {selected ? (
          <div className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-zinc-50">
                    {selected.payload.name}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Coverage and documents for this item.
                  </p>
                </div>
                {!editing && (
                  <button
                    type="button"
                    onClick={beginEditing}
                    className="min-h-11 rounded-lg border border-accent/50 px-3 text-sm font-bold text-accent"
                  >
                    Edit details
                  </button>
                )}
              </div>
            </div>
            {editing && editDraft ? (
              <form
                onSubmit={submitEdit}
                className="space-y-4 rounded-xl border border-accent/30 bg-accent/5 p-4"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-zinc-300">
                    Item name
                    <input
                      required
                      value={editDraft.name}
                      onChange={(event) =>
                        setEditDraft({ ...editDraft, name: event.target.value })
                      }
                      className="mt-1 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-zinc-50"
                    />
                  </label>
                  <label className="text-sm text-zinc-300">
                    Category
                    <select
                      value={editDraft.category}
                      onChange={(event) =>
                        setEditDraft({
                          ...editDraft,
                          category: event.target.value,
                        })
                      }
                      className="mt-1 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-zinc-50"
                    >
                      {[
                        "appliance",
                        "electronics",
                        "computer",
                        "mobile",
                        "home",
                        "other",
                      ].map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-zinc-300">
                    Brand
                    <input
                      value={editDraft.brand || ""}
                      onChange={(event) =>
                        setEditDraft({
                          ...editDraft,
                          brand: event.target.value,
                        })
                      }
                      className="mt-1 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-zinc-50"
                    />
                  </label>
                  <label className="text-sm text-zinc-300">
                    Model
                    <input
                      value={editDraft.model || ""}
                      onChange={(event) =>
                        setEditDraft({
                          ...editDraft,
                          model: event.target.value,
                        })
                      }
                      className="mt-1 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-zinc-50"
                    />
                  </label>
                  <label className="text-sm text-zinc-300">
                    Location
                    <input
                      value={editDraft.location || ""}
                      onChange={(event) =>
                        setEditDraft({
                          ...editDraft,
                          location: event.target.value,
                        })
                      }
                      className="mt-1 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-zinc-50"
                    />
                  </label>
                  <label className="text-sm text-zinc-300">
                    Purchase date
                    <input
                      type="date"
                      value={editDraft.purchase_date || ""}
                      onChange={(event) =>
                        setEditDraft({
                          ...editDraft,
                          purchase_date: event.target.value,
                        })
                      }
                      className="mt-1 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-zinc-50"
                    />
                  </label>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-zinc-200">
                      Coverage
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        setEditDraft({
                          ...editDraft,
                          coverages: [
                            ...editDraft.coverages,
                            { id: makeId(), label: "" },
                          ],
                        })
                      }
                      className="min-h-11 rounded-lg border border-zinc-700 px-3 text-sm font-bold text-zinc-300"
                    >
                      Add coverage
                    </button>
                  </div>
                  <div className="mt-2 space-y-3">
                    {editDraft.coverages.map((coverage, index) => (
                      <div
                        key={coverage.id}
                        className="grid gap-2 rounded-lg border border-zinc-800 p-3 sm:grid-cols-3"
                      >
                        <input
                          aria-label={`Coverage ${index + 1} label`}
                          value={coverage.label}
                          placeholder="Coverage label"
                          onChange={(event) =>
                            setEditDraft({
                              ...editDraft,
                              coverages: editDraft.coverages.map((entry) =>
                                entry.id === coverage.id
                                  ? { ...entry, label: event.target.value }
                                  : entry,
                              ),
                            })
                          }
                          className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-zinc-50"
                        />
                        <input
                          type="date"
                          aria-label={`Coverage ${index + 1} start`}
                          value={coverage.start_date || ""}
                          onChange={(event) =>
                            setEditDraft({
                              ...editDraft,
                              coverages: editDraft.coverages.map((entry) =>
                                entry.id === coverage.id
                                  ? {
                                      ...entry,
                                      start_date: event.target.value,
                                    }
                                  : entry,
                              ),
                            })
                          }
                          className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-zinc-50"
                        />
                        <input
                          type="date"
                          aria-label={`Coverage ${index + 1} end`}
                          value={coverage.end_date || ""}
                          onChange={(event) =>
                            setEditDraft({
                              ...editDraft,
                              coverages: editDraft.coverages.map((entry) =>
                                entry.id === coverage.id
                                  ? { ...entry, end_date: event.target.value }
                                  : entry,
                              ),
                            })
                          }
                          className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-zinc-50"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={saving}
                    className="min-h-11 rounded-lg bg-accent px-4 text-sm font-bold text-zinc-50 disabled:opacity-50"
                  >
                    Save changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setEditDraft(null);
                    }}
                    className="min-h-11 rounded-lg border border-zinc-700 px-4 text-sm text-zinc-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <section>
                <h3 className="text-sm font-bold text-zinc-200">Coverage</h3>
                {selected.payload.coverages.length ? (
                  <ul className="mt-2 space-y-2">
                    {selected.payload.coverages.map((coverage) => {
                      const status = getCoverageStatus(coverage);

                      return (
                        <li
                          key={coverage.id}
                          className="rounded-lg border border-zinc-800 p-3 text-sm text-zinc-300"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <strong>{coverage.label}</strong>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-zinc-500">
                            {coverage.start_date || "Unknown start"} —{" "}
                            {coverage.end_date || "Unknown end"}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500">
                    No coverage period recorded.
                  </p>
                )}
              </section>
            )}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-200">
                <Wrench className="h-4 w-4" />
                Service history
              </h3>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (serviceDescription.trim() && serviceDate)
                    void saveItem(selected, {
                      service_history: [
                        ...selected.payload.service_history,
                        {
                          id: makeId(),
                          date: serviceDate,
                          description: serviceDescription.trim(),
                          type: "repair",
                        },
                      ],
                    });
                  setServiceDescription("");
                  setServiceDate("");
                }}
                className="mt-2 flex flex-col gap-2 sm:flex-row"
              >
                <input
                  type="date"
                  aria-label="Service date"
                  value={serviceDate}
                  onChange={(event) => setServiceDate(event.target.value)}
                  className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-zinc-50"
                />
                <input
                  aria-label="Service description"
                  value={serviceDescription}
                  onChange={(event) =>
                    setServiceDescription(event.target.value)
                  }
                  placeholder="Service or repair"
                  className="min-h-11 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-zinc-50"
                />
                <button
                  disabled={saving}
                  className="min-h-11 rounded-lg border border-accent/50 px-3 text-sm font-bold text-accent"
                >
                  Add service
                </button>
              </form>
              {selected.payload.service_history.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                  {selected.payload.service_history.map((service) => (
                    <li key={service.id}>
                      {service.date} · {service.description}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-200">
                <FileText className="h-4 w-4" />
                Documents
              </h3>
              <div className="mt-2">
                <DocumentUpload
                  variant="compact"
                  inputLabel="Upload warranty document"
                  validateFile={(file) =>
                    file.size === 0 ? "Empty files cannot be uploaded" : null
                  }
                  onUpload={async (file) => {
                    const response = await fetch(
                      `/api/warranty/${selected._id}/documents`,
                      {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify(file),
                      },
                    );
                    const body = await response.json();
                    if (!response.ok)
                      throw new Error(body.error || "Upload failed");
                    await loadDocuments(selected);
                  }}
                />
              </div>
              {documents.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {documents.map((document) => (
                    <li
                      key={document._id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 p-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        {editingDocumentId === document._id ? (
                          <>
                            <div className="flex min-w-0 items-center gap-1">
                              <input
                                autoFocus
                                aria-label={`File name for ${document.payload.filename}`}
                                value={draftDocumentName}
                                onChange={(event) =>
                                  setDraftDocumentName(event.target.value)
                                }
                                disabled={renaming}
                                className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent"
                              />
                              <span className="text-sm text-zinc-500">
                                {
                                  splitDocumentFilename(
                                    document.payload.filename,
                                  ).extension
                                }
                              </span>
                              <button
                                type="button"
                                disabled={renaming}
                                onClick={() =>
                                  void saveRenameDocument(selected, document)
                                }
                                aria-label={`Save file name for ${document.payload.filename}`}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-success hover:bg-success-muted/20 disabled:opacity-50"
                              >
                                <Check aria-hidden="true" className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={renaming}
                                onClick={cancelRenameDocument}
                                aria-label="Discard file name"
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-danger hover:bg-danger-muted/20 disabled:opacity-50"
                              >
                                <X aria-hidden="true" className="h-4 w-4" />
                              </button>
                            </div>
                            {renameError && (
                              <p
                                role="alert"
                                className="mt-1 text-xs text-danger"
                              >
                                {renameError}
                              </p>
                            )}
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={Boolean(editingDocumentId)}
                            onClick={() => beginRenameDocument(document)}
                            title={document.payload.filename}
                            aria-label={`Rename ${document.payload.filename}`}
                            className="flex max-w-full items-center gap-1 truncate text-left text-sm font-semibold text-zinc-300 hover:text-accent disabled:opacity-50"
                          >
                            <span className="truncate">
                              {document.payload.filename}
                            </span>
                            <Pencil
                              aria-hidden="true"
                              className="h-3.5 w-3.5 shrink-0"
                            />
                          </button>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            void previewDocument(selected, document)
                          }
                          disabled={Boolean(editingDocumentId)}
                          className="text-accent disabled:opacity-50"
                          aria-label={`View ${document.payload.filename}`}
                        >
                          View
                        </button>
                        <a
                          href={`/api/warranty/${selected._id}/documents/${document._id}`}
                          className="text-accent"
                        >
                          Download
                        </a>
                        <button
                          type="button"
                          disabled={Boolean(editingDocumentId)}
                          className="text-danger disabled:opacity-50"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete ${document.payload.filename}? This can only be recovered from a backup.`,
                              )
                            )
                              void fetch(
                                `/api/warranty/${selected._id}/documents/${document._id}`,
                                { method: "DELETE" },
                              )
                                .then(async (response) => {
                                  if (!response.ok) {
                                    const body = await response.json();
                                    throw new Error(
                                      body.error || "Delete failed",
                                    );
                                  }
                                  await loadDocuments(selected);
                                })
                                .catch((cause) =>
                                  setError(
                                    cause instanceof Error
                                      ? cause.message
                                      : "Delete failed",
                                  ),
                                );
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-sm text-zinc-500">
            Select an item to see coverage, files, and service history.
          </div>
        )}
      </div>
      {preview && (
        <DocPreview
          src={preview.src}
          contentType={preview.document.payload.content_type}
          filename={preview.document.payload.filename}
          size={preview.document.payload.size}
          loading={preview.loading}
          error={preview.error}
          onRetry={() =>
            selected && void previewDocument(selected, preview.document)
          }
          onClose={closePreview}
        />
      )}
    </section>
  );
}
