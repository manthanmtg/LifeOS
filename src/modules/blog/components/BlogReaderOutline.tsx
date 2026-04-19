"use client";

import { LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BlogHeading } from "@/modules/blog/types";

interface BlogReaderOutlineProps {
  activeHeading: string;
  headings: BlogHeading[];
  onSelect: (id: string) => void;
}

export default function BlogReaderOutline({
  activeHeading,
  headings,
  onSelect,
}: BlogReaderOutlineProps) {
  if (headings.length === 0) return null;

  return (
    <nav className="space-y-1">
      {headings.map((heading) => (
        <button
          key={heading.id}
          type="button"
          onClick={() => onSelect(heading.id)}
          className={cn(
            "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
            heading.level === 3 && "ml-3",
            activeHeading === heading.id
              ? "bg-accent/10 text-accent"
              : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-300",
          )}
        >
          <LinkIcon className="mt-1 h-3 w-3 shrink-0" />
          <span>{heading.text}</span>
        </button>
      ))}
    </nav>
  );
}
