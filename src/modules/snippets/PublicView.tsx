"use client";

import { useMemo, useState } from "react";
import { Code, Copy, Check, Star, Search, Hash, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Snippet } from "./components/types";
import { highlightCode } from "./components/types";

export default function SnippetsPublicView({
  items,
}: {
  items: Record<string, unknown>[];
}) {
  const snippets = items as unknown as Snippet[];
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const availableLanguages = useMemo(() => {
    return [
      ...new Set(snippets.map((snippet) => snippet.payload.language)),
    ].sort((a, b) => a.localeCompare(b));
  }, [snippets]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return snippets
      .filter((snippet) => {
        if (
          languageFilter !== "all" &&
          snippet.payload.language !== languageFilter
        )
          return false;
        if (favoritesOnly && !snippet.payload.is_favorite) return false;
        if (!query) return true;

        const haystack =
          `${snippet.payload.title} ${snippet.payload.code} ${snippet.payload.description || ""} ${snippet.payload.tags.join(" ")}`.toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => {
        if (a.payload.is_favorite !== b.payload.is_favorite) {
          return a.payload.is_favorite ? -1 : 1;
        }
        return a.payload.title.localeCompare(b.payload.title);
      });
  }, [snippets, languageFilter, favoritesOnly, searchQuery]);

  const handleCopy = async (id: string, snippetCode: string) => {
    try {
      await navigator.clipboard.writeText(snippetCode);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (snippets.length === 0) {
    return (
      <div className="text-center text-zinc-500 py-32 border border-zinc-800 rounded-[2rem] bg-zinc-900/20">
        <Code className="w-16 h-16 mx-auto mb-4 opacity-10" />
        <h3 className="text-xl font-bold text-zinc-300">No snippets shared</h3>
        <p className="text-zinc-500 max-w-xs mx-auto mt-2">
          Check back later or browse other public modules.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search code library..."
              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent/35 transition-all"
            />
          </div>

          <button
            onClick={() => setFavoritesOnly((prev) => !prev)}
            className={cn(
              "px-5 py-3 rounded-2xl text-sm font-semibold border transition-all inline-flex items-center justify-center gap-2",
              favoritesOnly
                ? "bg-warning/10 border-warning/30 text-warning shadow-[0_0_15px_rgba(234,179,8,0.1)]"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700",
            )}
          >
            <Star
              className="w-4 h-4"
              fill={favoritesOnly ? "currentColor" : "none"}
            />{" "}
            Starred
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-1">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/50 border border-zinc-800/50 mr-1">
            <Hash className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Stacks
            </span>
          </div>
          <button
            onClick={() => setLanguageFilter("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border",
              languageFilter === "all"
                ? "bg-accent/10 border-accent/30 text-accent"
                : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600",
            )}
          >
            ALL
          </button>
          {availableLanguages.map((language) => (
            <button
              key={language}
              onClick={() => setLanguageFilter(language)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border uppercase tracking-wider",
                languageFilter === language
                  ? "bg-accent/10 border-accent/30 text-accent shadow-[0_0_15px_rgba(100,100,255,0.05)]"
                  : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600",
              )}
            >
              {language}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-24 px-4 border-2 border-dashed border-zinc-800 rounded-[2.5rem] bg-zinc-900/20">
          <Search className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
          <h3 className="text-lg font-bold text-zinc-400">
            No matching snippets
          </h3>
          <p className="text-zinc-600 text-sm mt-1">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filtered.map((snippet) => (
            <article
              key={snippet._id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group hover:border-zinc-700 transition-all duration-300 hover:shadow-xl hover:shadow-black/20"
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-2 min-w-0">
                  <Hash className="w-3.5 h-3.5 text-zinc-500" />
                  {snippet.payload.is_favorite && (
                    <Star
                      className="w-3 h-3 text-warning shrink-0"
                      fill="currentColor"
                    />
                  )}
                  <h4 className="text-sm font-bold text-zinc-100 truncate">
                    {snippet.payload.title}
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">
                    {snippet.payload.language}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(snippet._id, snippet.payload.code)}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    copiedId === snippet._id
                      ? "text-success bg-success/10 scale-110"
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800",
                  )}
                  title="Copy code"
                >
                  {copiedId === snippet._id ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="relative">
                <pre className="px-5 py-4 text-[12px] leading-relaxed text-zinc-300 font-mono overflow-x-auto max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                  <code
                    dangerouslySetInnerHTML={{
                      __html: highlightCode(snippet.payload.code),
                    }}
                    className="block whitespace-pre"
                  />
                </pre>
              </div>

              {(snippet.payload.description ||
                snippet.payload.tags.length > 0) && (
                <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/30">
                  {snippet.payload.description && (
                    <p className="text-xs text-zinc-400 italic mb-2 line-clamp-2">
                      {snippet.payload.description}
                    </p>
                  )}
                  {snippet.payload.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {snippet.payload.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-zinc-800/50 border border-zinc-700/50 text-zinc-500 text-[10px] rounded-md font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="px-5 py-2 border-t border-zinc-800/50 flex justify-end">
                <button
                  onClick={() => handleCopy(snippet._id, snippet.payload.code)}
                  className="text-[10px] font-bold text-accent uppercase tracking-widest hover:text-accent-hover transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3" />
                  {copiedId === snippet._id ? "Copied" : "Quick Copy"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
