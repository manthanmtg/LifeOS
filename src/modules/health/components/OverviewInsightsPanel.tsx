"use client";

import { cn } from "@/lib/utils";
import { LAB_STATUS_CONFIG } from "./constants";
import { formatDate } from "./helpers";
import type { HealthPayload } from "./types";
import type { ProfileOverviewSnapshot } from "./selectors";

const labelCls =
  "text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5";

interface OverviewInsightsPanelProps {
  payload: HealthPayload;
  snapshot: ProfileOverviewSnapshot;
}

export default function OverviewInsightsPanel({
  payload,
  snapshot,
}: OverviewInsightsPanelProps) {
  const latestLabStatus = snapshot.latestLabResult
    ? LAB_STATUS_CONFIG[snapshot.latestLabResult.status]
    : null;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 lg:col-span-2">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className={labelCls}>Attention & Timeline</p>
          {snapshot.nextTimelineItem && (
            <span
              className={cn(
                "rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
                snapshot.nextTimelineItem.status === "overdue"
                  ? "bg-danger/10 text-danger"
                  : snapshot.nextTimelineItem.status === "warning"
                    ? "bg-warning/10 text-warning"
                    : "bg-success/10 text-success",
              )}
            >
              {snapshot.nextTimelineItem.status === "overdue"
                ? "Overdue"
                : snapshot.nextTimelineItem.status === "warning"
                  ? "Due soon"
                  : "Scheduled"}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Next follow-up
            </p>
            {snapshot.nextTimelineItem ? (
              <>
                <p className="mt-2 text-sm font-semibold text-zinc-100">
                  {snapshot.nextTimelineItem.kind === "medication"
                    ? `Refill ${snapshot.nextTimelineItem.label}`
                    : `${snapshot.nextTimelineItem.label} booster`}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatDate(snapshot.nextTimelineItem.date)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">
                No upcoming refills or vaccinations.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Latest visit
            </p>
            {snapshot.latestVisit ? (
              <>
                <p className="mt-2 text-sm font-semibold text-zinc-100">
                  {formatDate(snapshot.latestVisit.date)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {snapshot.latestVisit.doctor
                    ? `Dr. ${snapshot.latestVisit.doctor}`
                    : snapshot.latestVisit.facility || "Visit logged"}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">
                No visits recorded yet.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Latest lab result
            </p>
            {snapshot.latestLabResult && latestLabStatus ? (
              <>
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-100">
                    {snapshot.latestLabResult.test_name}
                  </p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      latestLabStatus.bg,
                      latestLabStatus.color,
                    )}
                  >
                    {latestLabStatus.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {snapshot.latestLabResult.value}
                  {snapshot.latestLabResult.unit
                    ? ` ${snapshot.latestLabResult.unit}`
                    : ""}
                  {` · ${formatDate(snapshot.latestLabResult.date)}`}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">
                No lab results captured yet.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Records stored
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-100">
              {payload.documents.length} document
              {payload.documents.length !== 1 ? "s" : ""}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {snapshot.latestDocument?.date
                ? `Latest upload ${formatDate(snapshot.latestDocument.date)}`
                : "Keep reports, bills, and prescriptions in one place."}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <p className={cn(labelCls, "mb-3")}>Profile Snapshot</p>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-zinc-500">Allergies</span>
            <span className="font-semibold text-zinc-100">
              {payload.allergies.length}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-zinc-500">Vaccinations</span>
            <span className="font-semibold text-zinc-100">
              {payload.vaccinations.length}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-zinc-500">Lab results</span>
            <span className="font-semibold text-zinc-100">
              {payload.lab_results.length}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-zinc-500">Measurements</span>
            <span className="font-semibold text-zinc-100">
              {payload.measurements.length}
            </span>
          </div>
          {payload.tags.length > 0 && (
            <div className="border-t border-zinc-800 pt-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {payload.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] font-medium text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
