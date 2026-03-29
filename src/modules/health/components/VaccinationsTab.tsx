"use client";

import { Plus, Syringe, Edit3, Trash2, Copy, CalendarX2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatDate } from "./helpers";
import { dueBadge } from "./DueBadge";
import type { HealthPayload, Vaccination } from "./types";

interface VaccinationsTabProps {
  payload: HealthPayload;
  onAdd: () => void;
  onEdit: (v: Vaccination) => void;
  onDelete: (id: string) => void;
  onDuplicate: (v: Vaccination) => void;
  onRemoveDueDate: (v: Vaccination) => void;
  renderModal: React.ReactNode;
}

export default function VaccinationsTab({
  payload,
  onAdd,
  onEdit,
  onDelete,
  onDuplicate,
  onRemoveDueDate,
  renderModal,
}: VaccinationsTabProps) {
  const p = payload;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {p.vaccinations.length} vaccination
          {p.vaccinations.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {p.vaccinations.length === 0 ? (
        <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
          <Syringe className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 font-medium">No vaccinations recorded</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...p.vaccinations]
            .sort(
              (a, b) =>
                new Date(b.date_administered).getTime() -
                new Date(a.date_administered).getTime(),
            )
            .map((vac) => (
              <motion.div
                key={vac.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                      <Syringe className="w-4 h-4 text-success" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-200 truncate">
                        {vac.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[11px] text-zinc-500">
                          {formatDate(vac.date_administered)}
                        </span>
                        {vac.provider && (
                          <span className="text-[11px] text-zinc-600">
                            by {vac.provider}
                          </span>
                        )}
                      </div>
                      {vac.next_due && (
                        <div className="mt-1.5">
                          {dueBadge(vac.next_due, "Next due")}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => onEdit(vac)}
                      className="p-1.5 rounded-lg hover:bg-zinc-800"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                    <button
                      onClick={() => onDuplicate(vac)}
                      className="p-1.5 rounded-lg hover:bg-zinc-800"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                    {vac.next_due && (
                      <button
                        onClick={() => onRemoveDueDate(vac)}
                        className="p-1.5 rounded-lg hover:bg-warning/20"
                        title="Remove due date"
                      >
                        <CalendarX2 className="w-3.5 h-3.5 text-warning" />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(vac.id)}
                      className="p-1.5 rounded-lg hover:bg-danger/50"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-danger" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
        </div>
      )}

      {renderModal}
    </motion.div>
  );
}
