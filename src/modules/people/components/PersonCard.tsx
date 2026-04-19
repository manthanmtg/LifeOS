"use client";

import { motion } from "framer-motion";
import {
  Heart,
  Phone,
  MessageSquare,
  Video,
  Clock,
  Building2,
} from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Person, InteractionType } from "../types";

const RELATIONSHIP_STYLES: Record<string, string> = {
  family: "bg-accent/10 text-accent border-accent/20",
  friend: "bg-success/10 text-success border-success/20",
  colleague: "bg-warning/10 text-warning border-warning/20",
  acquaintance: "bg-zinc-800 text-zinc-500 border-zinc-700/50",
  mentor: "bg-success/10 text-success border-success/20",
  client: "bg-accent/10 text-accent border-accent/20",
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      onClick={() => onView(person)}
      className={cn(
        "group bg-zinc-900/40 border p-4 rounded-xl transition-all cursor-pointer",
        isStale
          ? "border-warning/15 hover:border-warning/30"
          : isHot
            ? "border-success/15 hover:border-success/30"
            : "border-zinc-800/50 hover:border-accent/30",
        "hover:bg-zinc-900/60",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          {person.payload.profile_pic ? (
            <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-zinc-700/50">
              <Image
                src={`data:${person.payload.profile_pic.content_type};base64,${person.payload.profile_pic.data}`}
                alt={name}
                fill
                className="object-cover"
              />
            </div>
          ) : avatar_url ? (
            <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-zinc-700/50">
              <Image
                src={avatar_url}
                alt={name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center">
              <span className="text-sm font-bold text-zinc-500">{name[0]}</span>
            </div>
          )}
          {isHot && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-zinc-900" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-100 truncate group-hover:text-accent transition-colors">
              {name}
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(person);
              }}
              className={cn(
                "p-1 rounded-lg transition-all shrink-0",
                is_favorite ? "text-accent" : "text-zinc-700 hover:text-accent",
              )}
            >
              <Heart
                className={cn("w-3.5 h-3.5", is_favorite && "fill-current")}
              />
            </button>
          </div>

          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span
              className={cn(
                "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                RELATIONSHIP_STYLES[relationship] ||
                  "bg-zinc-800 text-zinc-500 border-zinc-700",
              )}
            >
              {relationship}
            </span>
            {company && (
              <span className="text-[10px] text-zinc-500 font-medium flex items-center gap-1 truncate">
                <Building2 className="w-3 h-3 shrink-0" />
                {company}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions + last seen */}
      <div className="mt-3 pt-3 border-t border-zinc-800/30 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {(
            [
              { type: "call", icon: Phone },
              { type: "message", icon: MessageSquare },
              { type: "meeting", icon: Video },
            ] as const
          ).map((act) => (
            <button
              key={act.type}
              onClick={(e) => {
                e.stopPropagation();
                onQuickLog(person, act.type);
              }}
              className="p-1.5 text-zinc-600 rounded-lg hover:text-accent hover:bg-accent/10 transition-all active:scale-90"
            >
              <act.icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <Clock
            className={cn(
              "w-3 h-3",
              days === null
                ? "text-zinc-700"
                : isStale
                  ? "text-warning"
                  : isHot
                    ? "text-success"
                    : "text-zinc-600",
            )}
          />
          <span
            className={cn(
              "text-[10px] font-medium",
              days === null
                ? "text-zinc-700"
                : isStale
                  ? "text-warning"
                  : isHot
                    ? "text-success"
                    : "text-zinc-600",
            )}
          >
            {days === null ? "New" : days === 0 ? "Today" : `${days}d ago`}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
