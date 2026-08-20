"use client";

import { Plus, Pill, Edit3, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MEDICATION_STATUS_CONFIG } from "./constants";
import { dueBadge } from "./DueBadge";
import type { HealthPayload, Medication, MedicationStatus } from "./types";

interface MedicationsTabProps {
  payload: HealthPayload;
  onAdd: () => void;
  onEdit: (m: Medication) => void;
  onDelete: (id: string) => void;
  renderModal: React.ReactNode;
}

export default function MedicationsTab({
  payload,
  onAdd,
  onEdit,
  onDelete,
  renderModal,
}: MedicationsTabProps) {
  const p = payload;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {p.medications.length} medication
          {p.medications.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {p.medications.length === 0 ? (
        <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
          <Pill className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 font-medium">No medications tracked</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...p.medications]
            .sort((a, b) => {
              const order: Record<MedicationStatus, number> = {
                active: 0,
                completed: 1,
                discontinued: 2,
              };
              return order[a.status] - order[b.status];
            })
            .map((med) => {
              const sConfig = MEDICATION_STATUS_CONFIG[med.status];
              const isActive = med.status === "active";
              return (
                <motion.div
                  key={med.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "bg-zinc-900 border rounded-2xl p-4 hover:border-zinc-700 transition-colors group",
                    isActive ? "border-accent/20" : "border-zinc-800",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                          isActive ? "bg-accent/10" : "bg-zinc-800",
                        )}
                      >
                        <Pill className={cn("w-4 h-4", sConfig.color)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-200 truncate">
                          {med.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span
                            className={cn(
                              "text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                              sConfig.bg,
                              sConfig.color,
                            )}
                          >
                            {sConfig.label}
                          </span>
                          {med.dosage && (
                            <span className="text-xs text-zinc-500">
                              {med.dosage}
                            </span>
                          )}
                          {med.prescribed_by && (
                            <span className="text-xs text-zinc-600">
                              by {med.prescribed_by}
                            </span>
                          )}
                        </div>
                        {med.refill_date && med.status === "active" && (
                          <div className="mt-1.5">
                            {dueBadge(med.refill_date, "Refill")}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => onEdit(med)}
                        className="p-1.5 rounded-lg hover:bg-zinc-800"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
                      </button>
                      <button
                        onClick={() => onDelete(med.id)}
                        className="p-1.5 rounded-lg hover:bg-danger/50"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-danger" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </div>
      )}

      {renderModal}
    </motion.div>
  );
}
