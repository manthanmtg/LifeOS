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
  Building2
} from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Person, InteractionType } from "../types";

const RELATIONSHIP_STYLES: Record<string, string> = {
  family: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  friend: "bg-success/15 text-success border-success/25",
  colleague: "bg-purple-500/15 text-purple-300 border-purple-500/25",
  acquaintance: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
  mentor: "bg-warning/15 text-warning border-warning/25",
  client: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  other: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      onClick={() => onView(person)}
      className={cn(
        "group relative bg-zinc-900 border p-5 rounded-3xl transition-all cursor-pointer",
        isStale 
          ? "border-danger/20 hover:border-danger/40 bg-zinc-900/50" 
          : isHot 
            ? "border-success/20 hover:border-success/40 shadow-lg shadow-success/5"
            : "border-zinc-800 hover:border-accent/40",
        "shadow-sm hover:shadow-2xl hover:shadow-black/40"
      )}
    >
      {/* Favorite Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(person);
        }}
        className={cn(
          "absolute top-4 right-4 p-2 rounded-xl transition-all z-10",
          person.payload.is_favorite
            ? "text-pink-400 bg-pink-500/10 scale-110"
            : "text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-pink-400 hover:bg-zinc-800"
        )}
      >
        <Heart className="w-4 h-4" fill={person.payload.is_favorite ? "currentColor" : "none"} />
      </button>

      <div className="flex items-start gap-4">
        {/* Avatar / Initials */}
        <div className="relative shrink-0">
          {person.payload.avatar_url ? (
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-zinc-800">
              <Image
                src={person.payload.avatar_url}
                alt={person.payload.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
              <span className="text-xl font-black text-zinc-500">
                {person.payload.name[0]}
              </span>
            </div>
          )}
          {isHot && (
            <div className="absolute -bottom-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-success border-4 border-zinc-900 shadow-sm" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="text-base font-bold text-zinc-100 truncate tracking-tight">
              {person.payload.name}
            </h3>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-md border",
              RELATIONSHIP_STYLES[person.payload.relationship] || "bg-zinc-800 text-zinc-500 border-zinc-700"
            )}>
              {person.payload.relationship}
            </span>
            {person.payload.company && (
              <span className="text-[10px] text-zinc-500 font-medium flex items-center gap-1 truncate max-w-[120px]">
                <Building2 className="w-3 h-3" />
                {person.payload.company}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions / Status Row */}
      <div className="mt-6 pt-5 border-t border-zinc-800/50">
        <div className="flex items-center justify-between gap-3">
          {/* One-Tap Quick-Log Group */}
          <div className="flex items-center bg-zinc-950/40 p-1.5 rounded-2xl border border-zinc-800/80 shadow-inner">
            <button
              onClick={(e) => { e.stopPropagation(); onQuickLog(person, "call"); }}
              className="p-2 text-zinc-600 hover:text-success hover:bg-success/10 rounded-xl transition-all active:scale-90"
              title="Log Call"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onQuickLog(person, "message"); }}
              className="p-2 text-zinc-600 hover:text-accent hover:bg-accent/10 rounded-xl transition-all active:scale-90"
              title="Log Message"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onQuickLog(person, "meeting"); }}
              className="p-2 text-zinc-600 hover:text-warning hover:bg-warning/10 rounded-xl transition-all active:scale-90"
              title="Log Meeting"
            >
              <Video className="w-4 h-4" />
            </button>
          </div>

          {/* Last Contacted Status */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1.5">
              <Clock className={cn(
                "w-3.5 h-3.5",
                days === null ? "text-zinc-700" : isStale ? "text-danger" : isHot ? "text-success" : "text-zinc-500"
              )} />
              <span className={cn(
                "text-[10px] font-black tracking-widest",
                days === null ? "text-zinc-700" : isStale ? "text-danger" : isHot ? "text-success" : "text-zinc-500"
              )}>
                {days === null ? "NEVER" : days === 0 ? "TODAY" : `${days}D AGO`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Hover Menu */}
      <div className="absolute top-4 right-1.5 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300 z-20">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(person); }}
            className="p-3 text-zinc-500 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 rounded-full border border-zinc-800 shadow-xl"
            title="Edit Contact"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(person._id); }}
            className="p-3 text-zinc-500 hover:text-danger bg-zinc-900/50 hover:bg-danger/10 rounded-full border border-zinc-800 shadow-xl"
            title="Delete Contact"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
      </div>
    </motion.div>
  );
}
