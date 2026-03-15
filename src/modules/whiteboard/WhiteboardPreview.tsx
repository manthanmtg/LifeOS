"use client";

import { useState, useEffect, useRef } from "react";
import { PenLine } from "lucide-react";

export default function WhiteboardPreview({ elements, files }: {
    elements: Record<string, unknown>[];
    files: Record<string, unknown>;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [svgHtml, setSvgHtml] = useState<string | null>(null);

    useEffect(() => {
        if (!elements || elements.length === 0) return;

        let cancelled = false;
        import("@excalidraw/excalidraw").then(({ exportToSvg }) => {
            exportToSvg({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                elements: elements as any,
                appState: {
                    exportWithDarkMode: true,
                    exportBackground: false,
                    viewBackgroundColor: "transparent",
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                files: files as any ?? null,
            }).then((svg: SVGSVGElement) => {
                if (cancelled) return;
                svg.setAttribute("width", "100%");
                svg.setAttribute("height", "100%");
                svg.style.maxWidth = "100%";
                svg.style.maxHeight = "100%";
                // Sanitize SVG: remove script tags, event handlers, and foreignObject
                svg.querySelectorAll("script, foreignObject").forEach((el) => el.remove());
                svg.querySelectorAll("*").forEach((el) => {
                    for (const attr of Array.from(el.attributes)) {
                        if (attr.name.startsWith("on") || attr.value.trim().toLowerCase().startsWith("javascript:")) {
                            el.removeAttribute(attr.name);
                        }
                    }
                });
                setSvgHtml(svg.outerHTML);
            }).catch(() => {});
        }).catch(() => {});

        return () => { cancelled = true; };
    }, [elements, files]);

    if (!elements || elements.length === 0) {
        return (
            <div className="text-center">
                <PenLine className="w-6 h-6 text-zinc-700 mx-auto mb-1" />
                <p className="text-[10px] text-zinc-700 font-medium">Empty canvas</p>
            </div>
        );
    }

    if (!svgHtml) {
        return <div className="w-full h-full bg-zinc-950/60 animate-pulse rounded-xl" />;
    }

    return (
        <div
            ref={containerRef}
            className="w-full h-full flex items-center justify-center p-2 [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:object-contain"
            dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
    );
}
