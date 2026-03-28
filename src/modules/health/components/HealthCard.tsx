"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  AlertCircle,
  Pill,
  Syringe,
  Droplets,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { HealthProfile } from "./types";
import {
  PROFILE_TYPE_CONFIG,
  getDueStatus,
  getInitials,
} from "./types";

interface HealthCardProps {
  profile: HealthProfile;
  onSelect: (profile: HealthProfile) => void;
  onPreviewImage: (src: string, name: string) => void;
}

export default function HealthCard({
  profile,
  onSelect,
  onPreviewImage,
}: HealthCardProps) {
  const pl = profile.payload;
  const typeConfig = PROFILE_TYPE_CONFIG[pl.type];
  const TypeIcon = typeConfig.icon;
  const activeCondCount = pl.conditions.filter(
    (c) => c.status !== "resolved",
  ).length;
  const activeMedCount = pl.medications.filter(
    (m) => m.status === "active",
  ).length;

  let alerts = 0;
  for (const med of pl.medications || []) {
    if (med.status === "active" && med.refill_date) {
      const s = getDueStatus(med.refill_date);
      if (s === "overdue" || s === "warning") alerts++;
    }
  }
  for (const vac of pl.vaccinations || []) {
    if (vac.next_due) {
      const s = getDueStatus(vac.next_due);
      if (s === "overdue" || s === "warning") alerts++;
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onSelect(profile)}
      className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 hover:shadow-lg hover:shadow-accent/5 transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        <div
          onClick={(e) => {
            if (pl.profile_pic) {
              e.stopPropagation();
              onPreviewImage(
                `data:${pl.profile_pic.content_type};base64,${pl.profile_pic.data}`,
                pl.name,
              );
            }
          }}
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden cursor-pointer hover:scale-110 transition-transform bg-zinc-800 border border-zinc-700",
            typeConfig.bg,
            typeConfig.color,
          )}
        >
          {pl.profile_pic ? (
            <img
              src={`data:${pl.profile_pic.content_type};base64,${pl.profile_pic.data}`}
              alt={pl.name}
              className="w-full h-full object-cover"
            />
          ) : (
            getInitials(pl.name)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-zinc-100 truncate">
            {pl.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                typeConfig.bg,
                typeConfig.border,
                typeConfig.color,
              )}
            >
              <TypeIcon className="w-3 h-3 inline mr-0.5" />
              {typeConfig.label}
            </span>
            {pl.relation && (
              <span className="text-[11px] text-zinc-500">
                {pl.relation}
              </span>
            )}
          </div>
        </div>
        {pl.blood_group !== "unknown" && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger/10 border border-danger/20 text-danger shrink-0">
            <Droplets className="w-3 h-3 inline mr-0.5" />
            {pl.blood_group}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500">
        {activeCondCount > 0 && (
          <span className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-warning" />{" "}
            {activeCondCount} condition
            {activeCondCount !== 1 ? "s" : ""}
          </span>
        )}
        {activeMedCount > 0 && (
          <span className="flex items-center gap-1">
            <Pill className="w-3 h-3 text-blue-400" />{" "}
            {activeMedCount} med{activeMedCount !== 1 ? "s" : ""}
          </span>
        )}
        {pl.vaccinations.length > 0 && (
          <span className="flex items-center gap-1">
            <Syringe className="w-3 h-3 text-teal-400" />{" "}
            {pl.vaccinations.length}
          </span>
        )}
      </div>

      {alerts > 0 && (
        <div className="mt-3 p-2 rounded-xl border border-warning/20 bg-warning/5 flex items-center gap-2">
          <AlertTriangle className="w-3 h-3 text-warning shrink-0" />
          <span className="text-[11px] text-warning font-medium">
            {alerts} alert{alerts !== 1 ? "s" : ""} need attention
          </span>
        </div>
      )}
    </motion.div>
  );
}
