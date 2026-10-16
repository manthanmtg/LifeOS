"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Dialog from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import type { AreaDef, CropConfig } from "../AdminView";
import {
  buildCropExportReport,
  type CropExportFormat,
  type CropExportRecord,
} from "../lib/export-data";
import { createCropExportFile, downloadBlob } from "../lib/export-download";

const labels: Record<CropExportFormat, string> = {
  xlsx: "Excel",
  pdf: "PDF",
  html: "HTML",
};

export function CropDownloadDialog({
  open,
  format,
  crop,
  areas,
  records,
  periods,
  blockedReason,
  onClose,
  onDownloaded,
}: {
  open: boolean;
  format: CropExportFormat | null;
  crop: CropConfig;
  areas: AreaDef[];
  records: CropExportRecord[];
  periods: string[];
  blockedReason?: string | null;
  onClose: () => void;
  onDownloaded: () => void;
}) {
  const initialFocusRef = useRef<HTMLInputElement>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>(periods);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setSelected(periods);
      setSelecting(false);
      setIncludeNotes(true);
      setPreparing(false);
      setError("");
    }
  }, [open, periods]);
  if (!format || typeof document === "undefined") return null;
  const selectedPeriods = selecting ? selected : periods;
  const startDownload = async () => {
    if (blockedReason || !selectedPeriods.length || preparing) return;
    setPreparing(true);
    setError("");
    try {
      const report = buildCropExportReport({
        crop,
        areas,
        records,
        orderedPeriods: periods,
        options: { periods: selectedPeriods, includeNotes },
        now: new Date(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      });
      const file = await createCropExportFile(report, format);
      downloadBlob(file.blob, file.filename);
      onDownloaded();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to prepare this download. Please try again.",
      );
    } finally {
      setPreparing(false);
    }
  };
  const content = (
    <Dialog
      isOpen={open}
      onClose={onClose}
      aria-labelledby="crop-download-title"
      initialFocusRef={initialFocusRef}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col p-6">
        <h2 id="crop-download-title" className="text-xl font-bold text-zinc-50">
          Download {crop.name} as {labels[format]}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Exports saved records, calculated values, and the current period
          order.
        </p>
        {blockedReason ? (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-warning-muted/20 p-3 text-sm text-warning"
          >
            {blockedReason}
          </p>
        ) : (
          <>
            <fieldset disabled={preparing} className="mt-5">
              <legend className="text-sm font-semibold text-zinc-200">
                Periods
              </legend>
              <label className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
                <input
                  ref={initialFocusRef}
                  type="radio"
                  checked={!selecting}
                  onChange={() => setSelecting(false)}
                />{" "}
                All periods ({periods.length})
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="radio"
                  checked={selecting}
                  onChange={() => setSelecting(true)}
                />{" "}
                Select periods
              </label>
              {selecting && (
                <div className="mt-3 max-h-40 space-y-2 overflow-y-auto rounded-lg border border-zinc-800 p-3">
                  {periods.map((period) => (
                    <label
                      key={period}
                      className="flex items-center gap-2 text-sm text-zinc-300"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(period)}
                        onChange={() =>
                          setSelected((current) =>
                            current.includes(period)
                              ? current.filter((value) => value !== period)
                              : [...current, period],
                          )
                        }
                      />{" "}
                      {period}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
            <label className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={includeNotes}
                disabled={preparing}
                onChange={(event) => setIncludeNotes(event.target.checked)}
              />{" "}
              Include notes
            </label>
            {selecting && !selected.length && (
              <p className="mt-2 text-sm text-warning">
                Select at least one period.
              </p>
            )}
            {error && (
              <p role="alert" className="mt-3 text-sm text-danger">
                {error}
              </p>
            )}
          </>
        )}
        <div aria-live="polite" className="sr-only">
          {preparing ? "Preparing download" : ""}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void startDownload()}
            disabled={
              Boolean(blockedReason) || preparing || !selectedPeriods.length
            }
          >
            {preparing ? "Preparing…" : `Download ${labels[format]}`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
  return createPortal(content, document.body);
}
