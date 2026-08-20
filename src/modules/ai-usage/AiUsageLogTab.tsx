"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  CalendarDays,
  ArrowUpDown,
  DollarSign,
  Bot,
  Zap,
  Hash,
  Clock,
} from "lucide-react";
import {
  AiUsageEntry,
  SupportedProvider,
  PROVIDER_META,
  fmtTokens,
  fmtCost,
} from "./AdminView";

export function AiUsageLogTab({ entries }: { entries: AiUsageEntry[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProvider, setFilterProvider] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "cost" | "tokens">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filteredEntries = useMemo(() => {
    let result = [...entries];
    if (filterProvider !== "all")
      result = result.filter((e) => e.payload.provider === filterProvider);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.payload.model.toLowerCase().includes(q) ||
          e.payload.provider.toLowerCase().includes(q) ||
          (e.payload.session_label || "").toLowerCase().includes(q) ||
          (e.payload.notes || "").toLowerCase().includes(q),
      );
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "date")
        cmp =
          new Date(a.payload.date).getTime() -
          new Date(b.payload.date).getTime();
      else if (sortBy === "cost") cmp = a.payload.cost - b.payload.cost;
      else
        cmp =
          a.payload.input_tokens +
          a.payload.output_tokens -
          (b.payload.input_tokens + b.payload.output_tokens);
      return sortDir === "desc" ? -cmp : cmp;
    });
    return result;
  }, [entries, filterProvider, searchQuery, sortBy, sortDir]);

  return (
    <motion.div
      key="log"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            type="text"
            placeholder="Search models, providers..."
            aria-label="Search AI usage logs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            <select
              aria-label="Filter by provider"
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="h-10 pl-9 pr-8 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm appearance-none cursor-pointer"
            >
              <option value="all">All Providers</option>
              {Object.entries(PROVIDER_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <button
            aria-label="Sort by date"
            onClick={() => {
              if (sortBy === "date")
                setSortDir((d) => (d === "desc" ? "asc" : "desc"));
              else {
                setSortBy("date");
                setSortDir("desc");
              }
            }}
            className={cn(
              "h-10 px-3 rounded-xl border text-sm flex items-center gap-1.5 transition-colors",
              sortBy === "date"
                ? "bg-zinc-800 border-zinc-700 text-zinc-200"
                : "bg-zinc-900 border-zinc-800 text-zinc-500",
            )}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <ArrowUpDown className="w-3 h-3" />
          </button>
          <button
            aria-label="Sort by cost"
            onClick={() => {
              if (sortBy === "cost")
                setSortDir((d) => (d === "desc" ? "asc" : "desc"));
              else {
                setSortBy("cost");
                setSortDir("desc");
              }
            }}
            className={cn(
              "h-10 px-3 rounded-xl border text-sm flex items-center gap-1.5 transition-colors",
              sortBy === "cost"
                ? "bg-zinc-800 border-zinc-700 text-zinc-200"
                : "bg-zinc-900 border-zinc-800 text-zinc-500",
            )}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <ArrowUpDown className="w-3 h-3" />
          </button>
          <button
            aria-label="Sort by tokens"
            onClick={() => {
              if (sortBy === "tokens")
                setSortDir((d) => (d === "desc" ? "asc" : "desc"));
              else {
                setSortBy("tokens");
                setSortDir("desc");
              }
            }}
            className={cn(
              "h-10 px-3 rounded-xl border text-sm flex items-center gap-1.5 transition-colors",
              sortBy === "tokens"
                ? "bg-zinc-800 border-zinc-700 text-zinc-200"
                : "bg-zinc-900 border-zinc-800 text-zinc-500",
            )}
          >
            <Hash className="w-3.5 h-3.5" />
            <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">
        {filteredEntries.length}{" "}
        {filteredEntries.length === 1 ? "entry" : "entries"}
      </p>

      <div className="space-y-2">
        {filteredEntries.map((entry) => {
          const meta = PROVIDER_META[
            entry.payload.provider as SupportedProvider
          ] || {
            name: entry.payload.provider,
            color: "text-zinc-400",
            bg: "bg-zinc-500/10",
            border: "border-zinc-500/20",
            colorHex: "#a1a1aa",
          };
          return (
            <div
              key={entry._id}
              className="group p-4 rounded-2xl border border-zinc-800/50 bg-zinc-900/30 hover:border-zinc-700/50 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border",
                      meta.bg,
                      meta.border,
                    )}
                  >
                    <Bot className={cn("w-5 h-5", meta.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-sm font-bold", meta.color)}>
                        {meta.name}
                      </span>
                      <span className="text-zinc-700">/</span>
                      <span className="text-sm text-zinc-200 font-medium">
                        {entry.payload.model}
                      </span>
                      {entry.payload.synced && (
                        <span className="text-xs bg-zinc-800/50 text-zinc-600 px-1.5 py-0.5 rounded font-mono">
                          synced
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {(entry.payload.num_requests || 0).toLocaleString()} req
                      </span>
                      <span className="text-zinc-700">·</span>
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {fmtTokens(
                          entry.payload.input_tokens +
                            entry.payload.output_tokens,
                        )}{" "}
                        tok
                      </span>
                      <span className="text-zinc-700">·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(entry.payload.date).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-lg font-bold text-zinc-200 flex-shrink-0">
                  {fmtCost(entry.payload.cost, entry.payload.currency)}
                </span>
              </div>
            </div>
          );
        })}
        {filteredEntries.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <Bot className="w-12 h-12 text-zinc-800 mx-auto" />
            <p className="text-zinc-600 text-sm">
              {entries.length === 0
                ? "No usage data yet. Add a provider and sync."
                : "No entries match your filters."}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
