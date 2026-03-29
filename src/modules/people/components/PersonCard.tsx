"use client";

import { motion } from "framer-motion";
import {
  Heart,
  Phone,
  MessageSquare,
  Video,
  Edit2,
  Trash2,
  Clock,
  Building2,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Person, InteractionType } from "../types";

const RELATIONSHIP_STYLES: Record<string, string> = {
  family: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  friend: "bg-success/10 text-success border-success/20",
  colleague: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  acquaintance: "bg-zinc-800 text-zinc-500 border-zinc-700/50",
  mentor: "bg-warning/10 text-warning border-warning/20",
  client: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  other: "bg-zinc-800 text-zinc-500 border-zinc-700/50",
};

function calculateDaysSince(dateStr?: string): number | null {
  if (!dateStr) return null;
  const last = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.floor((now - last) / (1000 * 60 * 60 * 24));
}

interface PersonCardProps {
  person: Person;
  onView: (person: Person) => void;
  onEdit: (person: Person) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (person: Person) => void;
  onQuickLog: (person: Person, type: InteractionType) => void;
}

export default function PersonCard({
  person,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
  onQuickLog,
}: PersonCardProps) {
  const days = useMemo(() => {
    return calculateDaysSince(person.payload.last_contacted);
  }, [person.payload.last_contacted]);

  const isStale = days !== null && days > 90;
  const isHot = days !== null && days < 14;

  const { name, relationship, company, avatar_url, is_favorite } =
    person.payload;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      onClick={() => onView(person)}
      className={cn(
        "group relative bg-zinc-900/40 backdrop-blur-md border p-6 rounded-[2.5rem] transition-all cursor-pointer overflow-hidden",
        isStale
          ? "border-danger/10 hover:border-danger/30"
          : isHot
            ? "border-success/10 hover:border-success/30 shadow-xl shadow-success/5"
            : "border-zinc-800/50 hover:border-accent/30",
        "shadow-lg hover:shadow-2xl hover:shadow-black/60",
      )}
    >
      {/* Dynamic Background Glow */}
      <div
        className={cn(
          "absolute -right-8 -top-8 w-32 h-32 blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none",
          is_favorite
            ? "bg-pink-500"
            : isHot
              ? "bg-success"
              : isStale
                ? "bg-danger"
                : "bg-accent",
        )}
      />

      <div className="flex items-start gap-5 relative z-10">
        {/* Avatar Matrix */}
        <div className="relative shrink-0">
          {avatar_url ? (
            <div className="relative w-16 h-16 rounded-[1.5rem] overflow-hidden border border-zinc-700/50 shadow-inner">
              <Image
                src={avatar_url}
                alt={name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-[1.5rem] bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center shadow-inner">
              <span className="text-2xl font-black text-zinc-600 italic">
                {name[0]}
              </span>
            </div>
          )}
          {isHot && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-success border-2 border-zinc-900 shadow-lg shadow-success/20 animate-pulse" />
          )}
        </div>

        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-lg font-black text-zinc-100 truncate tracking-tight italic uppercase group-hover:text-accent transition-colors">
              {name}
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(person);
              }}
              className={cn(
                "p-2 rounded-xl transition-all",
                is_favorite
                  ? "text-pink-400 bg-pink-500/10 shadow-lg shadow-pink-500/5"
                  : "text-zinc-700 hover:text-pink-400 hover:bg-zinc-800",
              )}
            >
              <Heart className={cn("w-4 h-4", is_favorite && "fill-current")} />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg border",
                RELATIONSHIP_STYLES[relationship] ||
                  "bg-zinc-800 text-zinc-500 border-zinc-700",
              )}
            >
              {relationship}
            </span>
            {company && (
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5 truncate">
                <Building2 className="w-3 h-3" />
                {company}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Convergence Row */}
      <div className="mt-8 pt-6 border-t border-zinc-800/30">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center bg-zinc-950/40 p-1.5 rounded-2xl border border-zinc-800/80 shadow-inner backdrop-blur-sm">
            {[
              {
                type: "call" as InteractionType,
                icon: Phone,
                color: "hover:text-success hover:bg-success/10",
              },
              {
                type: "message" as InteractionType,
                icon: MessageSquare,
                color: "hover:text-accent hover:bg-accent/10",
              },
              {
                type: "meeting" as InteractionType,
                icon: Video,
                color: "hover:text-warning hover:bg-warning/10",
              },
            ].map((act) => (
              <button
                key={act.type}
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickLog(person, act.type);
                }}
                className={cn(
                  "p-2.5 text-zinc-600 rounded-xl transition-all active:scale-90",
                  act.color,
                )}
              >
                <act.icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          <div className="flex flex-col items-end shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/20 border border-zinc-800/40">
              <Clock
                className={cn(
                  "w-3.5 h-3.5",
                  days === null
                    ? "text-zinc-700"
                    : isStale
                      ? "text-danger"
                      : isHot
                        ? "text-success"
                        : "text-zinc-500",
                )}
              />
              <span
                className={cn(
                  "text-[9px] font-black tracking-[0.2em]",
                  days === null
                    ? "text-zinc-700"
                    : isStale
                      ? "text-danger"
                      : isHot
                        ? "text-success"
                        : "text-zinc-500",
                )}
              >
                {days === null
                  ? "VOID"
                  : days === 0
                    ? "ENTRY TODAY"
                    : `${days}D AGO`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Context Actions */}
      <div className="absolute bottom-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(person);
          }}
          className="p-3 text-zinc-500 hover:text-accent bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl hover:border-accent/40"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(person._id);
          }}
          className="p-3 text-zinc-500 hover:text-danger bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl hover:border-danger/40"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <div className="w-10 h-10 rounded-2xl bg-accent text-zinc-950 flex items-center justify-center shadow-lg shadow-accent/20">
          <ChevronRight className="w-5 h-5 stroke-[3]" />
        </div>
      </div>
    </motion.div>
  );
}
