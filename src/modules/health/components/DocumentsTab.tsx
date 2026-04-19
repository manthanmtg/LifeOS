"use client";

import { Plus, FileText, Edit3, Trash2, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DOC_TYPE_CONFIG } from "./constants";
import { formatDate } from "./helpers";
import PdfThumbnail from "@/modules/bills/components/PdfThumbnail";
import type { HealthPayload, HealthDocument } from "./types";
import { getSortedDocuments } from "./selectors";

interface DocumentsTabProps {
  payload: HealthPayload;
  onAdd: () => void;
  onEdit: (doc: HealthDocument) => void;
  onDelete: (id: string) => void;
  onPreviewDoc: (
    src: string,
    contentType: string,
    filename: string,
    size?: number,
  ) => void;
  renderModal: React.ReactNode;
}

export default function DocumentsTab({
  payload,
  onAdd,
  onEdit,
  onDelete,
  onPreviewDoc,
  renderModal,
}: DocumentsTabProps) {
  const p = payload;
  const profile = {
    _id: "inline-profile",
    created_at: "",
    updated_at: "",
    payload,
  };
  const sortedDocuments = getSortedDocuments(profile);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {p.documents.length} document
          {p.documents.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {p.documents.length === 0 ? (
        <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
          <FileText className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 font-medium">No documents stored</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDocuments.map((doc) => {
            const dtConfig = DOC_TYPE_CONFIG[doc.type];
            return (
              <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-colors group"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0">
                        <dtConfig.icon
                          className={cn("w-5 h-5", dtConfig.color)}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-zinc-100 truncate">
                          {doc.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800/50 border border-zinc-700/30",
                              dtConfig.color,
                            )}
                          >
                            {dtConfig.label}
                          </span>
                          {doc.date && (
                            <span className="text-[11px] text-zinc-500 font-medium">
                              {formatDate(doc.date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(doc)}
                        className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-50 transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(doc.id)}
                        className="p-2 rounded-xl hover:bg-danger/10 text-zinc-500 hover:text-danger transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {doc.notes && (
                    <p className="text-xs text-zinc-500 line-clamp-2 bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                      {doc.notes}
                    </p>
                  )}

                  {doc.attachments && doc.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800/50 mt-1">
                      {doc.attachments.map((att) => (
                        <div
                          key={att.id}
                          onClick={() =>
                            onPreviewDoc(
                              att.data,
                              att.content_type,
                              att.filename,
                              att.size,
                            )
                          }
                          className="relative group/att w-20 h-20 rounded-xl bg-zinc-800 border border-zinc-700/50 overflow-hidden cursor-pointer hover:border-accent transition-all hover:scale-[1.02] active:scale-95"
                        >
                          {att.content_type === "application/pdf" ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900">
                              <div className="scale-[0.4] origin-top opacity-60 group-hover/att:opacity-100 transition-opacity pointer-events-none">
                                <PdfThumbnail base64Data={att.data} />
                              </div>
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center pb-1">
                                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                              </div>
                            </div>
                          ) : (
                            <>
                              <img
                                src={`data:${att.content_type};base64,${att.data}`}
                                alt={att.filename}
                                className="w-full h-full object-cover opacity-60 group-hover/att:opacity-100 transition-all duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/att:opacity-100 transition-opacity" />
                            </>
                          )}
                          <div className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 backdrop-blur-sm opacity-0 group-hover/att:opacity-100 transition-all scale-75 group-hover/att:scale-100">
                            <Eye className="w-3 h-3 text-zinc-50" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {renderModal}
    </motion.div>
  );
}
