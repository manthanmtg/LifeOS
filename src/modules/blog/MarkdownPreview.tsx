"use client";

import React, { ReactElement, ReactNode } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { headingToId } from "@/modules/blog/utils";

interface Props {
    content: string;
    className?: string;
}

function textFromNode(node: ReactNode): string {
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map((item) => textFromNode(item)).join("");
    if (React.isValidElement(node)) {
        const element = node as ReactElement<{ children?: ReactNode }>;
        return textFromNode(element.props.children);
    }
    return "";
}

export default function MarkdownPreview({ content, className }: Props) {
    const components: Components = {
        h1: ({ children }) => {
            const id = headingToId(textFromNode(children));
            return <h1 id={id}>{children}</h1>;
        },
        h2: ({ children }) => {
            const id = headingToId(textFromNode(children));
            return <h2 id={id}>{children}</h2>;
        },
        h3: ({ children }) => {
            const id = headingToId(textFromNode(children));
            return <h3 id={id}>{children}</h3>;
        },
        a: ({ href, children, ...props }) => {
            const external = href?.startsWith("http://") || href?.startsWith("https://");
            return (
                <a
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    {...props}
                >
                    {children}
                </a>
            );
        },
        code: ({ className: codeClassName, children, ...props }) => {
            const code = String(children ?? "");
            const inline = !code.includes("\n");

            if (inline) {
                return (
                    <code className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[0.9em] text-zinc-100" {...props}>
                        {children}
                    </code>
                );
            }

            return (
                <pre className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 overflow-x-auto">
                    <code className={cn("font-mono text-sm text-zinc-100", codeClassName)} {...props}>
                        {children}
                    </code>
                </pre>
            );
        },
        blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent/40 pl-4 text-zinc-300/90 italic">{children}</blockquote>
        ),
    };

    return (
        <div
            className={cn(
                "prose prose-invert max-w-none",
                "prose-headings:scroll-mt-28 prose-headings:font-semibold prose-headings:text-zinc-100",
                "prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl",
                "prose-p:text-zinc-300 prose-p:leading-8",
                "prose-li:text-zinc-300 prose-li:marker:text-zinc-500",
                "prose-a:text-accent prose-a:no-underline hover:prose-a:underline",
                "prose-strong:text-zinc-100 prose-hr:border-zinc-700",
                "prose-table:text-zinc-300 prose-th:text-zinc-100 prose-td:border-zinc-700 prose-th:border-zinc-700",
                className
            )}
        >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {content}
            </ReactMarkdown>
        </div>
    );
}
