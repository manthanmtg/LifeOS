"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDate } from "./helpers";
import type { HealthProfile, Condition } from "./types";
import { getProfileOverviewSnapshot } from "./selectors";
import OverviewSummaryGrid from "./OverviewSummaryGrid";
import OverviewInsightsPanel from "./OverviewInsightsPanel";
import ConditionsPanel from "./ConditionsPanel";

const labelCls =
  "text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-1.5";

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
  const snapshot = useMemo(
    () => getProfileOverviewSnapshot(profile),
    [profile],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <OverviewSummaryGrid snapshot={snapshot} visitCount={p.visits.length} />
      <OverviewInsightsPanel payload={p} snapshot={snapshot} />

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

      <ConditionsPanel
        conditions={p.conditions}
        onAddCondition={onAddCondition}
        onEditCondition={onEditCondition}
        onDeleteCondition={onDeleteCondition}
      />

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
