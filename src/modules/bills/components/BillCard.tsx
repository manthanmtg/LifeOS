"use client";

import { Calendar, Edit3, Paperclip, Receipt } from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { formatDate } from "../helpers";
import type { Bill, BillFolder } from "../types";

const PdfThumbnail = dynamic(() => import("./PdfThumbnail"), {
  ssr: false,
  loading: () => (
    <div className="h-28 w-full shrink-0 animate-pulse border-b border-zinc-800/50 bg-zinc-800 sm:h-32" />
  ),
});

interface BillCardProps {
  bill: Bill;
  folder?: BillFolder;
  onClick: () => void;
  onEdit: (bill: Bill) => void;
  onDragStart: () => void;
}

export default function BillCard({
  bill,
  folder,
  onClick,
  onEdit,
  onDragStart,
}: BillCardProps) {
  const attachCount = bill.payload.attachments?.length ?? 0;
  const firstImage = bill.payload.attachments?.find(
    (a) => a.data && a.content_type.startsWith("image/"),
  );
  const firstPDF = bill.payload.attachments?.find(
    (a) => a.data && a.content_type === "application/pdf",
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      draggable
      onDragStart={onDragStart}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${bill.payload.name}`}
      data-bill-trigger-id={bill._id}
      className="group relative bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-2xl overflow-hidden cursor-pointer hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/5 transition-all flex flex-col h-full"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {firstImage ? (
        <div className="relative h-28 sm:h-32 w-full bg-zinc-800/50 overflow-hidden shrink-0">
          <Image
            fill
            src={`data:${firstImage.content_type};base64,${firstImage.data!}`}
            alt={bill.payload.name}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
            unoptimized
            sizes="100vw"
          />
        </div>
      ) : firstPDF ? (
        <PdfThumbnail
          base64Data={firstPDF.data!}
          className="h-28 sm:h-32 w-full shrink-0 border-b border-zinc-800/50"
        />
      ) : (
        <div className="h-20 sm:h-24 w-full bg-zinc-800/20 flex items-center justify-center shrink-0 border-b border-zinc-800/30">
          <Receipt className="w-8 h-8 text-zinc-700/50" />
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-zinc-100 truncate group-hover:text-accent transition-colors">
              {bill.payload.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-zinc-500 flex items-center gap-1 font-medium italic">
                <Calendar className="w-3 h-3" />
                {formatDate(bill.payload.bill_date)}
              </p>
              {bill.payload.amount !== undefined && (
                <span className="text-xs font-bold text-success-muted bg-success/5 px-1.5 py-0.5 rounded-md border border-success/10">
                  {bill.payload.currency} {bill.payload.amount.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(bill);
            }}
            aria-label={`Edit ${bill.payload.name}`}
            title="Edit"
            className="p-1.5 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-accent rounded-lg hover:bg-accent/10 transition-all shrink-0"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>

        {bill.payload.description && (
          <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed flex-1 font-medium">
            {bill.payload.description}
          </p>
        )}

        <div className="flex items-center gap-3 pt-3 mt-auto border-t border-zinc-800/40">
          {folder && (
            <span className="flex items-center gap-1 text-xs text-zinc-600 font-bold uppercase tracking-wider">
              <div className="w-1.5 h-1.5 rounded-full bg-accent/40" />
              {folder.payload.name}
            </span>
          )}
          {attachCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-zinc-500 ml-auto font-bold bg-zinc-800/50 px-1.5 py-0.5 rounded-md">
              <Paperclip className="w-3 h-3" />
              {attachCount}
            </span>
          )}
        </div>
      </div>

      {/* Premium hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  );
}
