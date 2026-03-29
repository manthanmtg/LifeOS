"use client";

import {
  Calendar,
  Edit3,
  Paperclip,
  Receipt,
  ImageIcon,
  Folder,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatDate } from "../helpers";
import PdfThumbnail from "./PdfThumbnail";
import type { Bill, BillFolder } from "../types";

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
  const hasPDF = bill.payload.attachments?.some(
    (a) => a.content_type === "application/pdf",
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
      onClick={onClick}
      className="group flex items-center justify-between px-4 py-3 bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-xl cursor-pointer hover:border-accent/30 hover:bg-accent/5 transition-all gap-4"
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="relative shrink-0">
          {hasImg ? (
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-accent" />
            </div>
          ) : hasPDF ? (
            <PdfThumbnail
              base64Data={
                bill.payload.attachments!.find(
                  (a) => a.content_type === "application/pdf",
                )!.data
              }
              className="w-10 h-10 rounded-xl shrink-0 pointer-events-none overflow-hidden"
              isListRow
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-zinc-500" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-zinc-100 truncate group-hover:text-accent transition-colors">
              {bill.payload.name}
            </h4>
            {bill.payload.amount !== undefined && (
              <span className="text-[10px] font-bold text-success-muted shrink-0">
                {bill.payload.currency} {bill.payload.amount.toLocaleString()}
              </span>
            )}
          </div>
          <div className="text-[11px] text-zinc-500 truncate flex items-center gap-3 mt-1 font-medium">
            <span className="flex items-center gap-1.5 italic">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(bill.payload.bill_date)}
            </span>
            {folder && (
              <span className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-[9px]">
                <Folder className="w-3 h-3 text-accent/50" />
                {folder.payload.name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        {attachCount > 0 && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 bg-zinc-800/80 px-2 py-1 rounded-lg">
            <Paperclip className="w-3.5 h-3.5" />
            {attachCount}
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(bill);
          }}
          title="Edit"
          className="p-1.5 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-accent rounded-lg hover:bg-accent/10 transition-all"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
