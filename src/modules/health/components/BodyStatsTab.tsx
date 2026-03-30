"use client";

import { Plus, Ruler, Edit3, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDate, calculateBMI, bmiCategory } from "./helpers";
import type { HealthPayload, Measurement } from "./types";

const labelCls =
  "text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5";

interface BodyStatsTabProps {
  payload: HealthPayload;
  onAdd: () => void;
  onEdit: (m: Measurement) => void;
  onDelete: (id: string) => void;
  renderModal: React.ReactNode;
}

export default function BodyStatsTab({
  payload,
  onAdd,
  onEdit,
  onDelete,
  renderModal,
}: BodyStatsTabProps) {
  const p = payload;

  const sortedMeasurements = [...p.measurements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const latestMeasurement = sortedMeasurements[0];
  const latestBMI = latestMeasurement
    ? calculateBMI(latestMeasurement.height_cm, latestMeasurement.weight_kg)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {p.measurements.length} measurement
          {p.measurements.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {/* Latest reading card */}
      {latestMeasurement && (
        <div className="bg-gradient-to-r from-accent/5 to-transparent border border-accent/10 rounded-2xl p-5">
          <p className={cn(labelCls, "mb-3")}>Latest Reading</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {latestMeasurement.height_cm && (
              <div>
                <p className="text-2xl font-bold text-zinc-50">
                  {latestMeasurement.height_cm}
                </p>
                <p className="text-xs text-zinc-500">cm height</p>
              </div>
            )}
            {latestMeasurement.weight_kg && (
              <div>
                <p className="text-2xl font-bold text-zinc-50">
                  {latestMeasurement.weight_kg}
                </p>
                <p className="text-xs text-zinc-500">kg weight</p>
              </div>
            )}
            {latestBMI && (
              <div>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    bmiCategory(latestBMI).color,
                  )}
                >
                  {latestBMI.toFixed(1)}
                </p>
                <p className={cn("text-xs", bmiCategory(latestBMI).color)}>
                  {bmiCategory(latestBMI).label}
                </p>
              </div>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">
            {formatDate(latestMeasurement.date)}
          </p>
        </div>
      )}

      {/* Weight trend chart */}
      {sortedMeasurements.length > 1 && (() => {
        const weightMeasurements = [...sortedMeasurements].reverse().filter((m) => m.weight_kg);
        const weights = weightMeasurements.map((m) => m.weight_kg!);
        const wMin = Math.min(...weights);
        const wMax = Math.max(...weights);
        const wRange = wMax - wMin || 1;
        return (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className={cn(labelCls, "mb-3")}>Weight Trend</p>
            <div className="flex items-end gap-1 h-20">
              {weightMeasurements.map((m) => {
                const height = ((m.weight_kg! - wMin) / wRange) * 80 + 20;
                return (
                  <div
                    key={m.id}
                    className="flex-1 bg-accent/20 rounded-t-sm hover:bg-accent/40 transition-colors"
                    style={{ height: `${height}%` }}
                    title={`${m.weight_kg} kg (${formatDate(m.date)})`}
                  />
                );
              })}
            </div>
          </div>
        );
      })()}

      {p.measurements.length === 0 ? (
        <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
          <Ruler className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 font-medium">No measurements recorded</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedMeasurements.map((m) => {
            const bmi = calculateBMI(m.height_cm, m.weight_kg);
            return (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-colors group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-[11px] text-zinc-500 w-20 sm:w-24">
                      {formatDate(m.date)}
                    </span>
                    {m.height_cm && (
                      <span className="text-sm text-zinc-300">
                        {m.height_cm} cm
                      </span>
                    )}
                    {m.weight_kg && (
                      <span className="text-sm text-zinc-300">
                        {m.weight_kg} kg
                      </span>
                    )}
                    {bmi && (
                      <span
                        className={cn(
                          "text-xs font-medium",
                          bmiCategory(bmi).color,
                        )}
                      >
                        BMI {bmi.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(m)}
                      className="p-1.5 rounded-lg hover:bg-zinc-800"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                    <button
                      onClick={() => onDelete(m.id)}
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
