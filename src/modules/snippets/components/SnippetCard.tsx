import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Star,
  Copy,
  Check,
  Edit3,
  Trash2,
  RefreshCw,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Snippet } from "./types";
import { formatDate, withLineNumbers, highlightCode } from "./types";

interface SnippetCardProps {
  snippet: Snippet;
  index: number;
  copiedId: string | null;
  processingAction: { id: string; action: "delete" | "favorite" } | null;
  showLineNumbers: boolean;
  onCopy: (id: string, code: string) => void;
  onToggleFavorite: (snippet: Snippet) => void;
  onEdit: (snippet: Snippet) => void;
  onDelete: (id: string) => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.04, duration: 0.3, ease: "easeOut" as const },
  }),
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -8,
    transition: { duration: 0.2 },
  },
};

export default function SnippetCard({
  snippet,
  index,
  copiedId,
  processingAction,
  showLineNumbers,
  onCopy,
  onToggleFavorite,
  onEdit,
  onDelete,
}: SnippetCardProps) {
  const isFavoriting =
    processingAction?.id === snippet._id &&
    processingAction.action === "favorite";
  const isDeleting =
    processingAction?.id === snippet._id &&
    processingAction.action === "delete";
  const isCopied = copiedId === snippet._id;

  const lineCount = useMemo(
    () => snippet.payload.code.split("\n").length,
    [snippet.payload.code],
  );

  const formattedDate = useMemo(
    () => formatDate(snippet.created_at),
    [snippet.created_at],
  );

  const displayCode = useMemo(() => {
    let code = highlightCode(snippet.payload.code);
    if (showLineNumbers) {
      code = withLineNumbers(code);
    }
    return code;
  }, [snippet.payload.code, showLineNumbers]);

  return (
    <motion.article
      layout
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-all duration-300 hover:shadow-lg hover:shadow-zinc-950/20"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative">
            <Hash className="w-3.5 h-3.5 text-zinc-500" />
            {snippet.payload.is_favorite && (
              <Star
                className="absolute -top-1 -right-1 w-2.5 h-2.5 text-warning"
                fill="currentColor"
              />
            )}
          </div>
          <h3 className="text-sm font-semibold text-zinc-100 truncate">
            {snippet.payload.title}
          </h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-medium uppercase tracking-wider">
            {snippet.payload.language}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onCopy(snippet._id, snippet.payload.code)}
            className={cn(
              "p-1.5 rounded-md transition-all",
              isCopied
                ? "text-success bg-success/10 scale-110"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800",
            )}
            title="Copy code"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => onToggleFavorite(snippet)}
            disabled={isFavoriting || isDeleting}
            className="p-1.5 text-zinc-500 hover:text-warning rounded-md hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            title={snippet.payload.is_favorite ? "Unstar" : "Star"}
          >
            {isFavoriting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Star
                className="w-3.5 h-3.5"
                fill={snippet.payload.is_favorite ? "currentColor" : "none"}
              />
            )}
          </button>
          <button
            onClick={() => onEdit(snippet)}
            disabled={isFavoriting || isDeleting}
            className="p-1.5 text-zinc-500 hover:text-accent rounded-md hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            title="Edit"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(snippet._id)}
            disabled={isFavoriting || isDeleting}
            className="p-1.5 text-zinc-500 hover:text-danger rounded-md hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            title="Delete"
          >
            {isDeleting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Code block */}
      <div className="relative group/code">
        <pre className="px-4 py-3 text-[12px] leading-relaxed text-zinc-300 font-mono overflow-x-auto max-h-[240px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
          <code
            dangerouslySetInnerHTML={{ __html: displayCode }}
            className="block whitespace-pre"
          />
        </pre>
        <div className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity">
          <span className="text-[10px] bg-zinc-950/80 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-800 backdrop-blur-sm">
            {lineCount} lines
          </span>
        </div>
      </div>

      {/* Footer */}
      {(snippet.payload.description || snippet.payload.tags.length > 0) && (
        <div className="px-4 py-2.5 border-t border-zinc-800 bg-zinc-900/30">
          {snippet.payload.description && (
            <p className="text-xs text-zinc-400 line-clamp-2 mb-2 italic">
              {snippet.payload.description}
            </p>
          )}
          {snippet.payload.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {snippet.payload.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 bg-zinc-800/50 border border-zinc-700/50 text-zinc-500 text-[10px] rounded-md hover:text-zinc-400 hover:border-zinc-600 transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="px-4 py-1.5 border-t border-zinc-800/50 flex items-center justify-between">
        <p className="text-[10px] text-zinc-600 font-medium">
          Added {formattedDate}
        </p>
        <button
          onClick={() => onCopy(snippet._id, snippet.payload.code)}
          className="text-[10px] text-accent hover:text-accent-hover font-medium transition-colors"
        >
          {isCopied ? "Copied!" : "Quick Copy"}
        </button>
      </div>
    </motion.article>
  );
}
