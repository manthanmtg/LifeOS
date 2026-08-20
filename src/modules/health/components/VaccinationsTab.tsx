"use client";

import {
  CalendarCheck2,
  ChevronDown,
  Edit3,
  FileText,
  Plus,
  Syringe,
  Trash2,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { dueBadge } from "./DueBadge";
import { formatDate, getDueStatus } from "./helpers";
import { getVaccinationGroups } from "./selectors";
import type { HealthPayload, Vaccination } from "./types";

interface VaccinationsTabProps {
  payload: HealthPayload;
  onAdd: () => void;
  onEdit: (v: Vaccination) => void;
  onRepeat: (v: Vaccination) => void;
  onDelete: (id: string) => void;
  deletingId?: string | null;
  renderModal: React.ReactNode;
}

function VaccineRow({
  vaccination,
  onEdit,
  onRepeat,
  onDelete,
  deletingId,
}: {
  vaccination: Vaccination;
  onEdit: (v: Vaccination) => void;
  onRepeat: (v: Vaccination) => void;
  onDelete: (id: string) => void;
  deletingId?: string | null;
}) {
  const dueStatus = getDueStatus(vaccination.next_due);
  const iconClass =
    dueStatus === "overdue"
      ? "bg-danger/10 text-danger"
      : dueStatus === "warning"
        ? "bg-warning/10 text-warning"
        : "bg-success/10 text-success";
  const hasDetails = Boolean(
    vaccination.dose_label ||
    vaccination.batch_number ||
    vaccination.notes ||
    vaccination.attachments?.length,
  );

  return (
    <motion.details
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group rounded-2xl border border-zinc-800 bg-zinc-900 transition-colors open:border-zinc-700"
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            iconClass,
          )}
        >
          <Syringe className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-zinc-200">
              {vaccination.name}
            </p>
            {vaccination.dose_label && (
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {vaccination.dose_label}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Given {formatDate(vaccination.date_administered)}
            {vaccination.provider ? ` · ${vaccination.provider}` : ""}
          </p>
          <div className="mt-2">
            {vaccination.next_due ? (
              dueBadge(vaccination.next_due, "Next due")
            ) : (
              <span className="text-xs text-zinc-500">No repeat scheduled</span>
            )}
          </div>
        </div>
        <ChevronDown
          className="mt-1 size-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>

      <div className="border-t border-zinc-800 px-4 pb-4 pt-3">
        {hasDetails && (
          <div className="mb-4 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">
            {vaccination.batch_number && (
              <p>Batch: {vaccination.batch_number}</p>
            )}
            {vaccination.repeat_interval_months && (
              <p>
                Repeats every {vaccination.repeat_interval_months} month
                {vaccination.repeat_interval_months === 1 ? "" : "s"}
              </p>
            )}
            {vaccination.notes && (
              <p className="sm:col-span-2">{vaccination.notes}</p>
            )}
            {!!vaccination.attachments?.length && (
              <p className="flex items-center gap-1.5 sm:col-span-2">
                <FileText className="size-3.5" aria-hidden="true" />
                {vaccination.attachments.length} certificate
                {vaccination.attachments.length === 1 ? "" : "s"} attached
              </p>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onRepeat(vaccination)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-3 text-xs font-bold text-zinc-50 transition-colors hover:bg-accent-hover active:scale-95"
          >
            <CalendarCheck2 className="size-4" aria-hidden="true" /> Mark repeat
            done
          </button>
          <button
            type="button"
            onClick={() => onEdit(vaccination)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-700 px-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
          >
            <Edit3 className="size-3.5" aria-hidden="true" /> Edit
          </button>
          <button
            type="button"
            aria-label={`Delete ${vaccination.name} vaccination`}
            onClick={() => onDelete(vaccination.id)}
            disabled={deletingId === vaccination.id}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-danger hover:bg-danger/10"
          >
            {deletingId === vaccination.id ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="size-3.5" aria-hidden="true" />
            )}
            {deletingId === vaccination.id ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </motion.details>
  );
}

export default function VaccinationsTab({
  payload,
  onAdd,
  onEdit,
  onRepeat,
  onDelete,
  deletingId,
  renderModal,
}: VaccinationsTabProps) {
  const groups = getVaccinationGroups(payload.vaccinations);
  const sections = [
    {
      title: "Needs attention",
      description: "Overdue or due within 30 days",
      vaccinations: groups.needsAttention,
    },
    {
      title: "Upcoming",
      description: "Scheduled future repeats",
      vaccinations: groups.upcoming,
    },
    {
      title: "History",
      description: "Completed doses without a scheduled repeat",
      vaccinations: groups.history,
    },
  ].filter((section) => section.vaccinations.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-400">
            {payload.vaccinations.length} vaccination
            {payload.vaccinations.length === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Track completed doses and what is due next.
          </p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-zinc-50 px-4 text-xs font-bold uppercase tracking-wider text-zinc-950 transition-all hover:bg-zinc-200 active:scale-95"
        >
          <Plus className="size-3.5" aria-hidden="true" /> Add vaccine
        </button>
      </div>
      {sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900 p-12 text-center">
          <Syringe className="mx-auto mb-3 size-8 text-zinc-700" />
          <p className="font-medium text-zinc-500">No vaccinations recorded</p>
          <p className="mt-1 text-xs text-zinc-600">
            Add a completed dose or a future schedule to begin.
          </p>
        </div>
      ) : (
        sections.map((section) => (
          <section
            key={section.title}
            aria-labelledby={`vaccination-${section.title.toLowerCase().replace(" ", "-")}`}
            className="space-y-3"
          >
            <div>
              <h3
                id={`vaccination-${section.title.toLowerCase().replace(" ", "-")}`}
                className="text-sm font-semibold text-zinc-200"
              >
                {section.title}
              </h3>
              <p className="text-xs text-zinc-500">{section.description}</p>
            </div>
            <div className="space-y-3">
              {section.vaccinations.map((vaccination) => (
                <VaccineRow
                  key={vaccination.id}
                  vaccination={vaccination}
                  onEdit={onEdit}
                  onRepeat={onRepeat}
                  onDelete={onDelete}
                  deletingId={deletingId}
                />
              ))}
            </div>
          </section>
        ))
      )}
      {renderModal}
    </motion.div>
  );
}
