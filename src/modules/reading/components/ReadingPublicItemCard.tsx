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
      whileHover={{ y: -2 }}
      href={item.payload.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-4 flex items-center gap-4 transition-all hover:border-accent/30 hover:shadow-2xl hover:shadow-accent/5 group relative overflow-hidden",
        item.payload.is_read && "opacity-65",
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/5 to-accent/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
      <div className="flex-1 min-w-0 relative">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p
            className={cn(
              "text-sm font-semibold truncate",
              item.payload.is_read
                ? "text-zinc-500 line-through"
                : "text-zinc-50 group-hover:text-accent transition-colors",
            )}
          >
            {item.payload.title}
          </p>
          <span
            className={cn(
              "text-xs px-1.5 py-0.5 rounded-full border font-bold uppercase tracking-tighter inline-flex items-center gap-1",
              PRIORITY_STYLES[item.payload.priority],
            )}
          >
            <PriorityIcon className="w-2.5 h-2.5" /> {item.payload.priority}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-400 font-bold uppercase tracking-tighter">
            {item.payload.type}
          </span>
          {item.payload.tags?.map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 rounded-full border border-accent/20 bg-accent/5 text-accent/80 font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
          {item.payload.source_domain && (
            <span className="font-medium text-zinc-400">
              {item.payload.source_domain}
            </span>
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
