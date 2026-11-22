"use client";

import { useId, useRef, useState, type ReactNode, type RefObject } from "react";
import Dialog from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";
import type { RainArea, RainEntry, RainDisplayUnit, RainUnit } from "../types";
import {
  coerceRainSource,
  CONVERSION_TO_MM,
  getDefaultEntryDateTime,
  parseDateInputToISO,
  UNIT_LABELS,
  ENTRY_UNIT_OPTIONS,
} from "../utils";
import {
  actionClass,
  controlClass,
  primaryClass,
  secondaryClass,
} from "./styles";

export function RainEditorDialog({
  title,
  description,
  submitLabel,
  initialFocusRef,
  children,
  onClose,
  onSave,
  onDelete,
}: {
  title: string;
  description?: string;
  submitLabel: string;
  initialFocusRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  onClose: () => void;
  onSave: (formData: FormData) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function runAction(action: () => Promise<void>) {
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      isOpen
      onClose={() => {
        if (!busy) onClose();
      }}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      initialFocusRef={initialFocusRef}
      closeOnBackdrop={!busy}
      className="max-h-full overflow-y-auto rounded-2xl"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          if (!busy) void runAction(() => onSave(data));
        }}
        aria-busy={busy}
      >
        <div className="border-b border-zinc-800 px-5 py-4 sm:px-6">
          <h2
            id={titleId}
            className="text-lg font-semibold tracking-tight text-zinc-100"
          >
            {title}
          </h2>
          {description && (
            <p
              id={descriptionId}
              className="mt-1 break-words text-sm text-zinc-500"
            >
              {description}
            </p>
          )}
        </div>
        <fieldset disabled={busy} className="min-w-0 space-y-4 p-5 sm:px-6">
          {children}
        </fieldset>
        {error && (
          <p role="alert" className="px-5 pb-4 text-sm text-danger sm:px-6">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-800 px-5 py-4 sm:px-6">
          {onDelete && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction(onDelete)}
              className={cn(
                actionClass,
                "mr-auto pl-0 text-danger hover:underline",
              )}
            >
              Delete area
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className={cn(actionClass, secondaryClass)}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className={cn(actionClass, primaryClass)}
          >
            {busy ? "Working…" : submitLabel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

const labelClass =
  "block min-w-0 space-y-1.5 text-sm font-medium text-zinc-300";

export function RainAreaEditor({
  area,
  onClose,
  onSave,
  onDelete,
}: {
  area?: RainArea;
  onClose: () => void;
  onSave: (payload: RainArea["payload"]) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const firstField = useRef<HTMLInputElement>(null);
  return (
    <RainEditorDialog
      title={area ? "Edit area" : "Add area"}
      submitLabel="Save area"
      initialFocusRef={firstField}
      onClose={onClose}
      onDelete={onDelete}
      onSave={(data) => {
        const name = String(data.get("name") ?? "").trim();
        if (!name) throw new Error("Enter a name for the area.");
        return onSave({
          name,
          location: String(data.get("location") ?? "").trim(),
          description: String(data.get("description") ?? "").trim(),
          is_active: data.has("active"),
        });
      }}
    >
      <label className={labelClass}>
        <span className="block">Name</span>
        <input
          ref={firstField}
          name="name"
          maxLength={100}
          required
          defaultValue={area?.payload.name}
          className={controlClass}
        />
      </label>
      <label className={labelClass}>
        <span className="block">
          Location <span className="font-normal text-zinc-500">(optional)</span>
        </span>
        <input
          name="location"
          maxLength={200}
          defaultValue={area?.payload.location}
          className={controlClass}
        />
      </label>
      <label className={labelClass}>
        <span className="block">
          Description{" "}
          <span className="font-normal text-zinc-500">(optional)</span>
        </span>
        <textarea
          name="description"
          maxLength={1000}
          rows={3}
          defaultValue={area?.payload.description}
          className={cn(controlClass, "h-auto resize-y py-2.5")}
        />
      </label>
      <label className="flex min-h-10 items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          name="active"
          defaultChecked={area?.payload.is_active ?? true}
          className="size-4 accent-accent"
        />
        Active area
      </label>
    </RainEditorDialog>
  );
}

export function RainEntryEditor({
  area,
  entry,
  displayUnit,
  onClose,
  onSave,
}: {
  area: RainArea;
  entry?: RainEntry;
  displayUnit: RainDisplayUnit;
  onClose: () => void;
  onSave: (payload: RainEntry["payload"]) => Promise<void>;
}) {
  const firstField = useRef<HTMLInputElement>(null);
  const unitFieldId = useId();
  const [entryUnit, setEntryUnit] = useState<RainUnit>(
    displayUnit === "in-cents" || displayUnit === "cents" ? "in" : displayUnit,
  );
  const [draftAmount, setDraftAmount] = useState<string | null>(null);
  const [initialDateTime] = useState(() =>
    getDefaultEntryDateTime(entry ? new Date(entry.payload.date) : undefined),
  );
  const originalAmount = entry?.payload.rainfall_amount;
  const unchangedAmount =
    originalAmount === undefined
      ? ""
      : String(
          Number((originalAmount / CONVERSION_TO_MM[entryUnit]).toFixed(6)),
        );

  return (
    <RainEditorDialog
      title={entry ? "Edit reading" : "Log rainfall"}
      description={area.payload.name}
      submitLabel={entry ? "Save changes" : "Save reading"}
      initialFocusRef={firstField}
      onClose={onClose}
      onSave={(data) => {
        const amount = Number.parseFloat(String(data.get("amount") ?? ""));
        const date = String(data.get("date") ?? "");
        const time = String(data.get("time") || "00:00");

        const amountMm =
          originalAmount !== undefined && amount === Number(unchangedAmount)
            ? originalAmount
            : amount * CONVERSION_TO_MM[entryUnit];

        if (!Number.isFinite(amountMm) || amountMm < 0)
          throw new Error("Enter a valid rainfall amount.");
        if (!date) throw new Error("Enter the date of the reading.");

        return onSave({
          area_id: area._id,
          rainfall_amount: amountMm,
          rainfall_unit: "mm",
          date:
            entry &&
            date === initialDateTime.date &&
            time === initialDateTime.time
              ? entry.payload.date
              : parseDateInputToISO(date, time),
          source: coerceRainSource(data.get("source")),
          notes: String(data.get("notes") ?? "").trim(),
        });
      }}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(8.5rem,0.8fr)] gap-3">
        <label className={labelClass}>
          <span className="block">Rainfall</span>
          <input
            ref={firstField}
            type="number"
            name="amount"
            min="0"
            step="any"
            inputMode="decimal"
            required
            value={draftAmount ?? unchangedAmount}
            onChange={(event) => setDraftAmount(event.target.value)}
            className={controlClass}
          />
        </label>
        <div className={labelClass}>
          <label htmlFor={unitFieldId} className="block">
            Unit
          </label>
          <select
            id={unitFieldId}
            value={entryUnit}
            onChange={(event) => setEntryUnit(event.target.value as RainUnit)}
            className={controlClass}
          >
            {ENTRY_UNIT_OPTIONS.map((unit) => (
              <option key={unit} value={unit}>
                {UNIT_LABELS[unit]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-3 max-[360px]:grid-cols-1">
        <label className={labelClass}>
          <span className="block">Date</span>
          <input
            type="date"
            name="date"
            required
            defaultValue={initialDateTime.date}
            className={cn(controlClass, "appearance-none")}
          />
        </label>
        <label className={labelClass}>
          <span className="block">Time</span>
          <input
            type="time"
            name="time"
            defaultValue={initialDateTime.time}
            className={cn(controlClass, "appearance-none")}
          />
        </label>
      </div>
      <div className={labelClass}>
        <label htmlFor="rain-entry-source" className="block">
          Source
        </label>
        <select
          id="rain-entry-source"
          name="source"
          defaultValue={coerceRainSource(entry?.payload.source)}
          className={controlClass}
        >
          <option value="manual">Manual</option>
          <option value="sensor">Sensor</option>
          <option value="imported">Imported</option>
        </select>
      </div>
      <label className={labelClass}>
        <span className="block">
          Notes <span className="font-normal text-zinc-500">(optional)</span>
        </span>
        <textarea
          name="notes"
          maxLength={2000}
          rows={3}
          defaultValue={entry?.payload.notes}
          className={cn(controlClass, "h-auto resize-y py-2.5")}
        />
      </label>
    </RainEditorDialog>
  );
}
