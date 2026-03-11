"use client";

import { Presentation } from "lucide-react";
import { getIframeSrc } from "./utils";
import type { DeckItem } from "./types";

interface DeckPreviewProps {
    deck: DeckItem;
    className?: string;
}

export function DeckPreview({ deck, className }: DeckPreviewProps) {
    const src = getIframeSrc(deck);

    if (deck.payload.thumbnail_url) {
        return (
            <div className={className}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={deck.payload.thumbnail_url}
                    alt={deck.payload.title}
                    className="w-full h-full object-cover"
                />
            </div>
        );
    }

    if (!src) {
        return (
            <div className={className}>
                <Presentation className="w-8 h-8 text-zinc-600" />
            </div>
        );
    }

    return (
        <div className={className}>
            <div className="relative w-full h-full overflow-hidden">
                <div
                    className="absolute top-0 left-0 w-[400%] h-[400%] origin-top-left"
                    style={{ transform: "scale(0.25)" }}
                >
                    <iframe
                        src={src.type === "src" ? src.value : undefined}
                        srcDoc={src.type === "srcDoc" ? src.value : undefined}
                        className="w-full h-full border-none pointer-events-none"
                        scrolling="no"
                        title={`Preview for ${deck.payload.title}`}
                    />
                </div>
                {/* Visual overlay to ensure pointer events are blocked and add a subtle polish */}
                <div className="absolute inset-0 z-10 bg-black/5 pointer-events-none" />
            </div>
        </div>
    );
}
