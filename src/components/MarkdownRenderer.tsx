"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface Props {
    content: string;
    className?: string;
}

export default function MarkdownRenderer({ content, className }: Props) {
    return (
        <div className={cn(
            "prose prose-invert prose-sm max-w-none",
            "prose-headings:text-zinc-50 prose-headings:font-bold",
            "prose-p:text-zinc-300 prose-p:leading-relaxed",
            "prose-strong:text-zinc-50 prose-strong:font-semibold",
            "prose-code:text-accent prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:before:content-none prose-code:after:content-none",
            "prose-a:text-accent prose-a:no-underline hover:prose-a:underline",
            "prose-ul:list-disc prose-ol:list-decimal",
            "prose-li:text-zinc-300",
            className
        )}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
            </ReactMarkdown>
        </div>
    );
}
