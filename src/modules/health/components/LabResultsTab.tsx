"use client";

import { Plus, Activity, Edit3, Trash2, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LAB_STATUS_CONFIG } from "./constants";
import { formatDate } from "./helpers";
import type { HealthPayload, LabResult } from "./types";

interface LabResultsTabProps {
  payload: HealthPayload;
  onAdd: () => void;
  onEdit: (r: LabResult) => void;
  onDelete: (id: string) => void;
  renderModal: React.ReactNode;
}

export default function LabResultsTab({
  payload,
  onAdd,
  onEdit,
  onDelete,
  renderModal,
}: LabResultsTabProps) {
  const p = payload;

  // Group by test_name
  const grouped: Record<string, LabResult[]> = {};
  for (const r of p.lab_results) {
    if (!grouped[r.test_name]) grouped[r.test_name] = [];
    grouped[r.test_name].push(r);
  }
  for (const key of Object.keys(grouped)) {
    grouped[key].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {p.lab_results.length} result
          {p.lab_results.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" /> Add Result
        </button>
      </div>

      {p.lab_results.length === 0 ? (
        <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
          <Activity className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 font-medium">No lab results recorded</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([testName, results]) => {
            const latest = results[0];
            const lsConfig = LAB_STATUS_CONFIG[latest.status];
            const hasTrend = results.length > 1;
            return (
              <div
                key={testName}
                className={cn(
                  "bg-zinc-900 border rounded-2xl p-4",
                  lsConfig.border,
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">
                      {testName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn("text-lg font-bold", lsConfig.color)}>
                        {latest.value}
                      </span>
                      {latest.unit && (
                        <span className="text-xs text-zinc-500">
                          {latest.unit}
                        </span>
                      )}
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                          lsConfig.bg,
                          lsConfig.color,
                        )}
                      >
                        {lsConfig.label}
                      </span>
                    </div>
                    {latest.reference_range && (
                      <p className="text-[11px] text-zinc-600 mt-0.5">
                        Ref: {latest.reference_range}
                      </p>
                    )}
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {formatDate(latest.date)}
                    </p>
                  </div>
                  {hasTrend && (
                    <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                      <TrendingUp className="w-3 h-3" />
                      {results.length} readings
                    </div>
                  )}
                </div>

                {/* Mini trend bar */}
                {hasTrend && (
                  <div className="flex items-end gap-0.5 h-6 mt-2 mb-2">
                    {[...results].reverse().map((r) => {
                      const numVal = parseFloat(r.value);
                      const allVals = results
                        .map((x) => parseFloat(x.value))
                        .filter((x) => !isNaN(x));
                      const max = Math.max(...allVals);
                      const height =
                        !isNaN(numVal) && max > 0 ? (numVal / max) * 100 : 50;
                      const statusColor = LAB_STATUS_CONFIG[r.status];
                      return (
                        <div
                          key={r.id}
                          className={cn(
                            "flex-1 rounded-t-sm transition-colors",
                            statusColor.bg,
                          )}
                          style={{ height: `${Math.max(height, 12)}%` }}
                          title={`${r.value} ${r.unit || ""} (${formatDate(r.date)})`}
                        />
                      );
                    })}
                  </div>
                )}

                {/* All results for this test */}
                <div className="space-y-1 mt-2">
                  {results.map((r) => {
                    const rsConfig = LAB_STATUS_CONFIG[r.status];
                    return (
                      <div
                        key={r.id}
                        className="flex items-center justify-between py-1 group/item"
                      >
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-zinc-500 w-16 sm:w-20 shrink-0">
                            {formatDate(r.date)}
                          </span>
                          <span className={cn("font-medium", rsConfig.color)}>
                            {r.value} {r.unit || ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEdit(r)}
                            className="p-1 rounded hover:bg-zinc-800"
                          >
                            <Edit3 className="w-3 h-3 text-zinc-500" />
                          </button>
                          <button
                            onClick={() => onDelete(r.id)}
                            className="p-1 rounded hover:bg-danger/50"
                          >
                            <Trash2 className="w-3 h-3 text-danger" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {renderModal}
    </motion.div>
  );
}
