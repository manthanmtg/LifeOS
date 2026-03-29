"use client";

import { Plus, Stethoscope, Edit3, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { VISIT_TYPE_CONFIG } from "./constants";
import { formatDate } from "./helpers";
import type { HealthPayload, Visit } from "./types";

interface VisitsTabProps {
  payload: HealthPayload;
  onAdd: () => void;
  onEdit: (v: Visit) => void;
  onDelete: (id: string) => void;
  renderModal: React.ReactNode;
}

export default function VisitsTab({
  payload,
  onAdd,
  onEdit,
  onDelete,
  renderModal,
}: VisitsTabProps) {
  const p = payload;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {p.visits.length} visit{p.visits.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" /> Add Visit
        </button>
      </div>

      {p.visits.length === 0 ? (
        <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
          <Stethoscope className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 font-medium">No visits recorded</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...p.visits]
            .sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            )
            .map((visit) => {
              const vtConfig = VISIT_TYPE_CONFIG[visit.type];
              return (
                <motion.div
                  key={visit.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                        <Stethoscope
                          className={cn("w-4 h-4", vtConfig.color)}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800",
                              vtConfig.color,
                            )}
                          >
                            {vtConfig.label}
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            {formatDate(visit.date)}
                          </span>
                        </div>
                        {visit.doctor && (
                          <p className="text-sm text-zinc-300 mt-1">
                            Dr. {visit.doctor}
                          </p>
                        )}
                        {visit.facility && (
                          <p className="text-[11px] text-zinc-600">
                            {visit.facility}
                          </p>
                        )}
                        {visit.diagnosis && (
                          <p className="text-xs text-zinc-400 mt-1">
                            {visit.diagnosis}
                          </p>
                        )}
                        {visit.notes && (
                          <p className="text-xs text-zinc-500 mt-1">
                            {visit.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {visit.cost != null && visit.cost > 0 && (
                        <span className="text-sm font-bold text-zinc-300">
                          {visit.currency === "INR" ? "₹" : visit.currency}{" "}
                          {visit.cost.toLocaleString()}
                        </span>
                      )}
                      <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEdit(visit)}
                          className="p-1.5 rounded-lg hover:bg-zinc-800"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
                        </button>
                        <button
                          onClick={() => onDelete(visit.id)}
                          className="p-1.5 rounded-lg hover:bg-danger/50"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-danger" />
                        </button>
                      </div>
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
