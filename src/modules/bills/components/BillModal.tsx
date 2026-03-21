"use client";

import { useState, useMemo } from "react";
import { X, Calendar, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { Bill, BillFolder, BillPayload } from "../types";

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
  const [billDate, setBillDate] = useState(
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

      const saved: Bill = bill
        ? { ...bill, payload }
        : {
            _id: data.data._id?.toString() ?? data.data.insertedId?.toString(),
            module_type: "bill",
            is_public: false,
            payload,
            created_at: data.data.created_at,
            updated_at: data.data.updated_at,
          };
      onSaved(saved);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">
            {bill ? "Edit Bill" : "New Bill"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 overflow-y-auto flex-1"
        >
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Bill Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electricity Bill January"
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Bill Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Folder
            </label>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
            >
              <option value="">Root (no folder)</option>
              {flatFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {"—".repeat(f.depth)} {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional short description"
              rows={2}
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={2}
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-medium hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-zinc-950 text-sm font-bold hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : bill ? "Save Changes" : "Create Bill"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
