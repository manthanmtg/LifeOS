"use client";

import { AlertTriangle, AlertCircle, Pill, Syringe } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PROFILE_TYPE_CONFIG } from "./constants";
import { getInitials, formatDate } from "./helpers";
import {
  getLatestVisit,
  getMedicationCounts,
  getProfileAlerts,
} from "./selectors";
import type { HealthProfile } from "./types";

interface ProfileCardProps {
  profile: HealthProfile;
  onClick: () => void;
  onPreviewImage: (src: string, name: string) => void;
}

export default function ProfileCard({
  profile,
  onClick,
  onPreviewImage,
}: ProfileCardProps) {
  const pl = profile.payload;
  const typeConfig = PROFILE_TYPE_CONFIG[pl.type];
  const TypeIcon = typeConfig.icon;
  const activeCondCount = pl.conditions.filter(
    (c) => c.status !== "resolved",
  ).length;
  const medicationCounts = getMedicationCounts(profile);
  const alerts = getProfileAlerts(profile).length;
  const latestVisit = getLatestVisit(profile);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={cn(
        "bg-zinc-900 border rounded-2xl p-5 transition-all cursor-pointer group",
        "hover:border-zinc-600 hover:shadow-lg hover:shadow-accent/5",
        alerts > 0 ? "border-warning/20" : "border-zinc-800",
      )}
    >
      {/* Profile Header */}
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
            "w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden hover:scale-110 transition-transform",
            typeConfig.bg,
            typeConfig.color,
          )}
        >
          {pl.profile_pic ? (
            <div className="relative w-full h-full">
              <Image
                src={`data:${pl.profile_pic.content_type};base64,${pl.profile_pic.data}`}
                alt={pl.name}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          ) : (
            getInitials(pl.name)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-zinc-100 truncate group-hover:text-zinc-50 transition-colors">
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
              <span className="text-[11px] text-zinc-500">{pl.relation}</span>
            )}
          </div>
        </div>
        {pl.blood_group !== "unknown" && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger/10 border border-danger/20 text-danger shrink-0">
            {pl.blood_group}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center gap-3 text-xs text-zinc-500">
        {activeCondCount > 0 && (
          <span className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-warning" />
            {activeCondCount} condition{activeCondCount !== 1 ? "s" : ""}
          </span>
        )}
        {medicationCounts.active > 0 && (
          <span className="flex items-center gap-1">
            <Pill className="w-3 h-3 text-accent" />
            {medicationCounts.active} med
            {medicationCounts.active !== 1 ? "s" : ""}
          </span>
        )}
        {pl.vaccinations.length > 0 && (
          <span className="flex items-center gap-1">
            <Syringe className="w-3 h-3 text-success" />
            {pl.vaccinations.length}
          </span>
        )}
        {latestVisit && (
          <span className="ml-auto text-zinc-600 text-[10px]">
            Last visit: {formatDate(latestVisit.date)}
          </span>
        )}
      </div>

      {/* Alerts badge */}
      {alerts > 0 && (
        <div className="mt-3 p-2 rounded-xl border border-warning/20 bg-warning/5 flex items-center gap-2">
          <AlertTriangle className="w-3 h-3 text-warning shrink-0" />
          <span className="text-[11px] text-warning font-medium">
            {alerts} alert{alerts !== 1 ? "s" : ""} need attention
          </span>
        </div>
      )}

      {/* Visit count footer */}
      {pl.visits.length > 0 && (
        <p className="text-[10px] text-zinc-600 mt-2">
          {pl.visits.length} total visit{pl.visits.length !== 1 ? "s" : ""}
        </p>
      )}
    </motion.div>
  );
}
