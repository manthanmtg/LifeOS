"use client";

import { Download, Eye, FileText, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { expenseSpacesApi } from "../api";
import type { ExpenseSpaceDocument } from "../types";

export default function ExpenseSpaceReportDialog({
  open,
  space,
  onClose,
}: {
  open: boolean;
  space: ExpenseSpaceDocument;
  onClose: () => void;
}) {
  const createRef = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<"idle" | "creating" | "ready" | "error">(
    "idle",
  );
  const [report, setReport] = useState<{
    url: string;
    blob: Blob;
    filename: string;
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(
    () => () => {
      if (report) URL.revokeObjectURL(report.url);
    },
    [report],
  );
  const close = () => {
    if (report) URL.revokeObjectURL(report.url);
    setReport(null);
    setState("idle");
    setError("");
    onClose();
  };
  const create = async () => {
    setState("creating");
    setError("");
    try {
      const next = await expenseSpacesApi.downloadReport(space._id);
      if (report) URL.revokeObjectURL(report.url);
      setReport({ ...next, url: URL.createObjectURL(next.blob) });
      setState("ready");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to create expense report",
      );
      setState("error");
    }
  };
  const share = async () => {
    if (!report || !navigator.share || !navigator.canShare) return;
    const file = new File([report.blob], report.filename, {
      type: "application/pdf",
    });
    if (navigator.canShare({ files: [file] }))
      await navigator.share({
        files: [file],
        title: `${space.payload.name} expense report`,
      });
  };
  const view = () => {
    if (report) window.open(report.url, "_blank", "noopener,noreferrer");
  };
  const shareSupported = Boolean(
    report &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({
      files: [
        new File([report.blob], report.filename, { type: "application/pdf" }),
      ],
    }),
  );
  return (
    <Dialog
      isOpen={open}
      onClose={close}
      aria-labelledby="expense-report-title"
      aria-describedby="expense-report-description"
      initialFocusRef={createRef}
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <FileText aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2
              id="expense-report-title"
              className="text-xl font-bold text-zinc-50"
            >
              Create expense report
            </h2>
            <p
              id="expense-report-description"
              className="mt-1 text-sm leading-6 text-zinc-400"
            >
              Creates a complete PDF ledger for {space.payload.name}, followed
              by spending breakdowns.
            </p>
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          {state === "ready" && report ? (
            <>
              <Button type="button" variant="outline" onClick={view}>
                <Eye aria-hidden="true" className="mr-2 h-4 w-4" />
                View PDF
              </Button>
              <a
                href={report.url}
                download={report.filename}
                className="inline-flex h-11 items-center rounded-lg bg-accent px-4 text-sm font-bold text-zinc-950"
              >
                <Download aria-hidden="true" className="mr-2 h-4 w-4" />
                Download PDF
              </a>
              <Button
                type="button"
                variant="outline"
                onClick={() => void share()}
                disabled={!shareSupported}
              >
                <Share2 aria-hidden="true" className="mr-2 h-4 w-4" />
                Share
              </Button>
            </>
          ) : (
            <Button
              ref={createRef}
              type="button"
              onClick={() => void create()}
              disabled={state === "creating"}
            >
              {state === "creating"
                ? "Creating PDF…"
                : state === "error"
                  ? "Try again"
                  : "Create PDF"}
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={close}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
