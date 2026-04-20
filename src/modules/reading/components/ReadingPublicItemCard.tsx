"use client";

import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReadingItem } from "../types";
import { PRIORITY_ICONS, PRIORITY_STYLES } from "../utils";
import { motion } from "framer-motion";

interface ReadingPublicItemCardProps {
  item: ReadingItem;
}

export function ReadingPublicItemCard({ item }: ReadingPublicItemCardProps) {
  const PriorityIcon = PRIORITY_ICONS[item.payload.priority];

  return (
    <motion.a
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      href={item.payload.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors group",
        item.payload.is_read && "opacity-65",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p
            className={cn(
              "text-sm font-medium truncate",
              item.payload.is_read ? "text-zinc-500 line-through" : "text-zinc-50",
            )}
          >
            {item.payload.title}
          </p>
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded border font-medium inline-flex items-center gap-1",
              PRIORITY_STYLES[item.payload.priority],
            )}
          >
            <PriorityIcon className="w-3 h-3" /> {item.payload.priority}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-400 capitalize">
            {item.payload.type}
          </span>
          {item.payload.tags?.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded border border-accent/20 bg-accent/5 text-accent/80"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
          {item.payload.source_domain && (
            <span className="font-medium text-zinc-400">{item.payload.source_domain}</span>
          )}
          {item.payload.notes && (
            <span className="line-clamp-1 italic text-zinc-500">
              &quot;{item.payload.notes}&quot;
            </span>
          )}
        </div>
      </div>

      <ExternalLink className="w-4 h-4 text-zinc-500 shrink-0 group-hover:text-zinc-300 transition-colors" />
    </motion.a>
  );
}
