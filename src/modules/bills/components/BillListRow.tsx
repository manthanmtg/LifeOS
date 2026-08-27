"use client";

import {
  Calendar,
  Edit3,
  Paperclip,
  Receipt,
  ImageIcon,
  Folder,
} from "lucide-react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { formatDate } from "../helpers";
import type { Bill, BillFolder } from "../types";

const PdfThumbnail = dynamic(() => import("./PdfThumbnail"), {
  ssr: false,
  loading: () => (
    <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-zinc-800" />
  ),
});

interface BillListRowProps {
  bill: Bill;
  folder?: BillFolder;
  onClick: () => void;
  onEdit: (bill: Bill) => void;
  onDragStart: () => void;
}

export default function BillListRow({
  bill,
  folder,
  onClick,
  onEdit,
  onDragStart,
}: BillListRowProps) {
  const attachCount = bill.payload.attachments?.length ?? 0;
  const firstPDF = bill.payload.attachments?.find(
    (a) => a.data && a.content_type === "application/pdf",
  );
  const hasImg = bill.payload.attachments?.some((a) =>
    a.content_type.startsWith("image/"),
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      draggable
      onDragStart={onDragStart}
      className="group flex items-center justify-between gap-4 rounded-xl border border-zinc-800/50 bg-zinc-900/40 px-4 py-3 backdrop-blur-sm transition-all hover:border-accent/30 hover:bg-accent/5"
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`View details for ${bill.payload.name}`}
        data-bill-trigger-id={bill._id}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        }}
        className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="relative shrink-0">
            {hasImg ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/20 bg-accent/10">
                <ImageIcon className="h-5 w-5 text-accent" />
              </div>
            ) : firstPDF ? (
              <PdfThumbnail
                base64Data={firstPDF.data!}
                className="pointer-events-none h-10 w-10 shrink-0 overflow-hidden rounded-xl"
                isListRow
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700/30 bg-zinc-800/50">
                <Receipt className="h-5 w-5 text-zinc-500" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="truncate text-sm font-bold text-zinc-100 transition-colors group-hover:text-accent">
                {bill.payload.name}
              </h4>
              {bill.payload.amount !== undefined && (
                <span className="shrink-0 text-xs font-bold text-success-muted">
                  {bill.payload.currency} {bill.payload.amount.toLocaleString()}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 truncate text-xs font-medium text-zinc-500">
              <span className="flex items-center gap-1.5 italic">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(bill.payload.bill_date)}
              </span>
              {folder && (
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                  <Folder className="h-3 w-3 text-accent/50" />
                  {folder.payload.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {attachCount > 0 && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-zinc-800/80 px-2 py-1 text-xs font-bold text-zinc-500">
            <Paperclip className="h-3.5 w-3.5" />
            {attachCount}
          </span>
        )}
      </div>

      <button
        onClick={() => onEdit(bill)}
        aria-label={`Edit ${bill.payload.name}`}
        title="Edit"
        className="rounded-lg p-1.5 text-zinc-500 opacity-0 transition-all hover:bg-accent/10 hover:text-accent focus-visible:opacity-100"
      >
        <Edit3 className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
