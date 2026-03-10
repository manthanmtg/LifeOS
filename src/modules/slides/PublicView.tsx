"use client";

import { ExternalLink, Presentation, Tag, Folder, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeckItem } from "./types";
import { FORMAT_LABELS, FORMAT_STYLES, VISIBILITY_LABELS, VISIBILITY_STYLES } from "./types";

export default function SlidesPublicView({ items }: { items: Record<string, unknown>[] }) {
    const data = items as unknown as DeckItem[];

    if (data.length === 0) {
        return (
            <div className="text-center text-zinc-500 py-20">
                <Presentation className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No decks shared yet.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.map((item) => (
                <article
                    key={item._id}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors group"
                >
                    <div className="w-full h-28 rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center mb-3">
                        {item.payload.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={item.payload.thumbnail_url}
                                alt={item.payload.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Presentation className="w-7 h-7 text-zinc-600 group-hover:text-zinc-500 transition-colors" />
                        )}
                    </div>

                    <h3 className="text-white font-medium line-clamp-1">{item.payload.title}</h3>
                    {item.payload.description && (
                        <p className="text-zinc-500 text-sm mt-1 line-clamp-2">{item.payload.description}</p>
                    )}

                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium border", FORMAT_STYLES[item.payload.format])}>
                            {FORMAT_LABELS[item.payload.format]}
                        </span>
                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium border", VISIBILITY_STYLES[item.payload.visibility])}>
                            {VISIBILITY_LABELS[item.payload.visibility]}
                        </span>
                    </div>

                    {item.payload.tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                            <Tag className="w-3 h-3 text-zinc-600 shrink-0" />
                            {item.payload.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                                    {tag}
                                </span>
                            ))}
                            {item.payload.tags.length > 3 && (
                                <span className="text-[10px] text-zinc-600">+{item.payload.tags.length - 3}</span>
                            )}
                        </div>
                    )}

                    {item.payload.folder && (
                        <div className="flex items-center gap-1 mt-1.5">
                            <Folder className="w-3 h-3 text-zinc-600" />
                            <span className="text-[10px] text-zinc-500">{item.payload.folder}</span>
                        </div>
                    )}

                    {item.payload.author && (
                        <div className="flex items-center gap-1 mt-1.5">
                            <User className="w-3 h-3 text-zinc-600" />
                            <span className="text-[10px] text-zinc-500">{item.payload.author}</span>
                        </div>
                    )}

                    {item.payload.deck_url && (
                        <div className="mt-3 pt-3 border-t border-zinc-800">
                            <a
                                href={item.payload.deck_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" /> View Deck
                            </a>
                        </div>
                    )}
                </article>
            ))}
        </div>
    );
}
