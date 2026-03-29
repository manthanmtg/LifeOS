"use client";

import {
  AlertCircle,
  Pill,
  Stethoscope,
  TrendingUp,
  Plus,
  Edit3,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CONDITION_STATUS_CONFIG } from "./constants";
import { formatDate, calculateBMI, bmiCategory } from "./helpers";
import type { HealthProfile, Condition } from "./types";

const labelCls =
  "text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5";

interface OverviewTabProps {
  profile: HealthProfile;
  onAddCondition: () => void;
  onEditCondition: (c: Condition) => void;
  onDeleteCondition: (id: string) => void;
}

export default function OverviewTab({
  profile,
  onAddCondition,
  onEditCondition,
  onDeleteCondition,
}: OverviewTabProps) {
  const p = profile.payload;
  const activeMeds = p.medications.filter((m) => m.status === "active");
  const activeConditions = p.conditions.filter((c) => c.status !== "resolved");

  const sortedMeasurements = [...p.measurements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const latestMeasurement = sortedMeasurements[0];
  const latestBMI = latestMeasurement
    ? calculateBMI(latestMeasurement.height_cm, latestMeasurement.weight_kg)
    : null;

  const totalVisitCost = p.visits.reduce((sum, v) => {
    if (v.cost != null && v.currency === "INR") return sum + v.cost;
    return sum;
  }, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {/* Active Conditions */}
        <div className="bg-zinc-900 border border-warning/20 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4 text-warning" />
          </div>
          <div>
            <p className="text-xl font-bold text-zinc-50">
              {activeConditions.length}
            </p>
            <p className={cn(labelCls, "mb-0")}>Conditions</p>
          </div>
        </div>

        {/* Active Meds */}
        <div className="bg-zinc-900 border border-accent/20 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <Pill className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="text-xl font-bold text-zinc-50">
              {activeMeds.length}
            </p>
            <p className={cn(labelCls, "mb-0")}>Active Meds</p>
          </div>
        </div>

        {/* Total Visits */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
            <Stethoscope className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-zinc-50">{p.visits.length}</p>
            <p className={cn(labelCls, "mb-0")}>Visits</p>
            {totalVisitCost > 0 && (
              <p className="text-[10px] text-zinc-600 mt-0.5">
                ₹{totalVisitCost.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Latest BMI */}
        <div
          className={cn(
            "bg-zinc-900 border rounded-2xl p-4 flex items-start gap-3",
            latestBMI ? "border-zinc-800" : "border-zinc-800",
          )}
        >
          <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
            <TrendingUp
              className={cn(
                "w-4 h-4",
                latestBMI ? bmiCategory(latestBMI).color : "text-zinc-600",
              )}
            />
          </div>
          <div>
            {latestBMI ? (
              <>
                <p
                  className={cn(
                    "text-xl font-bold",
                    bmiCategory(latestBMI).color,
                  )}
                >
                  {latestBMI.toFixed(1)}
                </p>
                <p
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider mt-0.5",
                    bmiCategory(latestBMI).color,
                  )}
                >
                  {bmiCategory(latestBMI).label}
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-zinc-600">—</p>
                <p className={cn(labelCls, "mb-0")}>BMI</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Allergies */}
      {p.allergies.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className={cn(labelCls, "mb-3")}>Allergies</p>
          <div className="flex flex-wrap gap-2">
            {p.allergies.map((a, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full text-xs font-medium bg-danger/10 border border-danger/20 text-danger"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Conditions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className={labelCls}>Conditions</p>
          <button
            onClick={onAddCondition}
            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        {p.conditions.length === 0 ? (
          <p className="text-xs text-zinc-600 italic">No conditions tracked</p>
        ) : (
          <div className="space-y-2">
            {p.conditions.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0 group"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-200">{c.name}</p>
                  {c.diagnosed_date && (
                    <p className="text-[11px] text-zinc-500">
                      Since {formatDate(c.diagnosed_date)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                      CONDITION_STATUS_CONFIG[c.status].bg,
                      CONDITION_STATUS_CONFIG[c.status].color,
                    )}
                  >
                    {CONDITION_STATUS_CONFIG[c.status].label}
                  </span>
                  <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEditCondition(c)}
                      className="p-1 rounded hover:bg-zinc-800"
                    >
                      <Edit3 className="w-3 h-3 text-zinc-500" />
                    </button>
                    <button
                      onClick={() => onDeleteCondition(c.id)}
                      className="p-1 rounded hover:bg-danger/50"
                    >
                      <Trash2 className="w-3 h-3 text-danger" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Identity details */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
        <p className={labelCls}>Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {p.date_of_birth && (
            <div>
              <span className="text-zinc-500">Date of Birth</span>
              <p className="text-zinc-200 font-medium">
                {formatDate(p.date_of_birth)}
              </p>
            </div>
          )}
          {p.gender && (
            <div>
              <span className="text-zinc-500">Gender</span>
              <p className="text-zinc-200 font-medium capitalize">{p.gender}</p>
            </div>
          )}
          {p.emergency_contact && (
            <div>
              <span className="text-zinc-500">Emergency Contact</span>
              <p className="text-zinc-200 font-medium">{p.emergency_contact}</p>
            </div>
          )}
          {p.insurance_info && (
            <div>
              <span className="text-zinc-500">Insurance</span>
              <p className="text-zinc-200 font-medium">{p.insurance_info}</p>
            </div>
          )}
        </div>
        {p.notes && (
          <div className="pt-2 border-t border-zinc-800">
            <p className="text-sm text-zinc-400 whitespace-pre-wrap">
              {p.notes}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
