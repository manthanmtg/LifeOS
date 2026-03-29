"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Heart,
  Edit3,
  Trash2,
  Phone,
  Mail,
  Cake,
  Clock,
  Building2,
  MessageSquare,
  Plus,
  Video,
  Gift,
  Tag as TagIcon,
  AlignLeft,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Person, InteractionType } from "../types";

interface PersonProfileProps {
  person: Person;
  onBack: () => void;
  onEdit: (person: Person) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (person: Person) => void;
  onLogInteraction: (
    id: string,
    type: InteractionType,
    date: string,
    note?: string,
  ) => Promise<void>;
}

export default function PersonProfile({
  person,
  onBack,
  onEdit,
  onDelete,
  onToggleFavorite,
  onLogInteraction,
}: PersonProfileProps) {
  const [showLogForm, setShowLogForm] = useState(false);
  const [logType, setLogType] = useState<InteractionType>("message");
  const [logNote, setLogNote] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    name,
    notes,
    interests,
    tags,
    relationship,
    phone,
    email,
    birthday,
    company,
    role,
    interactions,
    last_contacted,
    is_favorite,
    avatar_url,
  } = person.payload;

  const sortedInteractions = [...(interactions || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const daysSinceContact = last_contacted
    ? Math.floor(
        (Date.now() - new Date(last_contacted).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onLogInteraction(person._id, logType, logDate, logNote);
      setLogNote("");
      setShowLogForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const interactionIcons: Record<InteractionType, React.ComponentType<{ className?: string }>> = {
    call: Phone,
    meeting: Video,
    message: MessageSquare,
    email: Mail,
    gift: Gift,
    other: Clock,
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[10px] font-black bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-200 px-4 py-2 rounded-xl transition-all uppercase tracking-[0.2em]"
      >
        <ArrowLeft className="w-3 h-3" /> Back to Network
      </button>

      {/* Profile Header Card */}
      <div className="relative overflow-hidden rounded-[3rem] border border-zinc-800 bg-zinc-900/40 backdrop-blur-md p-8 shadow-2xl shadow-black/40">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] pointer-events-none" />

        <div className="flex flex-col md:flex-row gap-8 relative items-center md:items-start text-center md:text-left">
          <div className="shrink-0 relative">
            {avatar_url ? (
              <img
                src={avatar_url}
                alt={name}
                className="w-40 h-40 rounded-[2.5rem] object-cover border border-zinc-700 shadow-2xl"
              />
            ) : (
              <div className="w-40 h-40 rounded-[2.5rem] bg-zinc-800 border border-zinc-700 flex items-center justify-center shadow-2xl">
                <span className="text-5xl font-black text-zinc-600 italic">
                  {name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              </div>
            )}
            {is_favorite && (
              <div className="absolute -top-2 -right-2 w-12 h-12 bg-pink-500 text-zinc-950 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/20 border-4 border-zinc-900">
                <Heart className="w-6 h-6 fill-current" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-black text-zinc-50 tracking-tighter italic uppercase mb-2">
                  {name}
                </h1>
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl bg-zinc-950/40 text-zinc-400 border border-zinc-800/50 backdrop-blur-sm">
                    {relationship}
                  </span>
                  {company && (
                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500 flex items-center gap-1.5 bg-zinc-950/40 px-3 py-1.5 rounded-xl border border-zinc-800/40 backdrop-blur-sm">
                      <Building2 className="w-3 h-3" />{" "}
                      {role ? `${role} @ ` : ""}
                      {company}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleFavorite(person)}
                  className={cn(
                    "p-4 rounded-[1.5rem] transition-all border shadow-lg",
                    is_favorite
                      ? "bg-pink-500/20 border-pink-500/40 text-pink-400 shadow-pink-500/10"
                      : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:text-zinc-200",
                  )}
                >
                  <Heart
                    className={cn("w-6 h-6", is_favorite && "fill-current")}
                  />
                </button>
                <button
                  onClick={() => onEdit(person)}
                  className="p-4 rounded-[1.5rem] bg-zinc-800/50 border border-zinc-700/50 text-zinc-500 hover:text-accent hover:bg-accent/10 transition-all shadow-lg"
                >
                  <Edit3 className="w-6 h-6" />
                </button>
                <button
                  onClick={() => onDelete(person._id)}
                  className="p-4 rounded-[1.5rem] bg-zinc-800/50 border border-zinc-700/50 text-zinc-500 hover:text-danger hover:bg-danger/10 transition-all shadow-lg"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
              <div className="p-5 bg-zinc-950/20 rounded-3xl border border-zinc-800/30 backdrop-blur-sm group hover:border-accent/20 transition-all">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 block mb-2">
                  Operation Status
                </span>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full shadow-lg",
                      daysSinceContact !== null && daysSinceContact < 30
                        ? "bg-success shadow-success/20"
                        : "bg-warning shadow-warning/20",
                    )}
                  />
                  <span className="text-sm font-black text-zinc-300 tracking-tight italic">
                    {daysSinceContact === null
                      ? "NEVER LOGGED"
                      : daysSinceContact === 0
                        ? "CONTACTED TODAY"
                        : `${daysSinceContact} DAYS SINCE`}
                  </span>
                </div>
              </div>

              <div className="p-5 bg-zinc-950/20 rounded-3xl border border-zinc-800/30 backdrop-blur-sm group hover:border-accent/20 transition-all">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 block mb-2">
                  Comms Channels
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5 overflow-hidden">
                    {phone && <Phone className="w-4 h-4 text-zinc-500" />}
                    {email && <Mail className="w-4 h-4 text-zinc-500" />}
                  </div>
                  <span className="text-sm font-black text-zinc-400 truncate italic">
                    {email || phone || "SILENCE"}
                  </span>
                </div>
              </div>

              <div className="p-5 bg-zinc-950/20 rounded-3xl border border-zinc-800/30 backdrop-blur-sm group hover:border-accent/20 transition-all">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 block mb-2">
                  Temporal Milestone
                </span>
                <div className="flex items-center gap-3">
                  <Cake className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm font-black text-zinc-300 tracking-tight italic">
                    {birthday
                      ? new Date(birthday)
                          .toLocaleDateString(undefined, {
                            month: "long",
                            day: "numeric",
                          })
                          .toUpperCase()
                      : "SECRET"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        {/* Left Column: Contextual Intelligence */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/40 rounded-[2.5rem] p-8 shadow-xl shadow-black/20">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-8 flex items-center gap-2">
              <AlignLeft className="w-4 h-4" /> Strategic Context
            </h3>

            <div className="space-y-10">
              {notes && (
                <div className="relative group">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-3 block opacity-60">
                    Intelligence Dossier
                  </span>
                  <p className="text-[13px] text-zinc-300 leading-relaxed bg-zinc-950/30 p-6 rounded-[2rem] border border-zinc-800/40 italic font-medium">
                    &quot;{notes}&quot;
                  </p>
                </div>
              )}

              {(interests || []).length > 0 && (
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-4 block opacity-60 flex items-center gap-2">
                    <Zap className="w-3 h-3" /> Convergence Nodes
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {interests?.map((i) => (
                      <span
                        key={i}
                        className="px-4 py-2 rounded-2xl bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-accent hover:border-accent/40 hover:bg-zinc-950 transition-all cursor-default"
                      >
                        {i}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(tags || []).length > 0 && (
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-4 block opacity-60 flex items-center gap-2">
                    <TagIcon className="w-3 h-3" /> Tactical Segments
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {tags?.map((t) => (
                      <span
                        key={t}
                        className="px-4 py-2 rounded-2xl bg-accent/5 border border-accent/20 text-[10px] font-black uppercase tracking-widest text-accent shadow-sm shadow-accent/5"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Interaction Records */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/40 rounded-[3rem] p-10 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between mb-10">
              <div className="flex flex-col">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 mb-1">
                  Temporal Ledger
                </h3>
                <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">
                  {sortedInteractions.length} Historical Records
                </span>
              </div>
              <button
                onClick={() => setShowLogForm(!showLogForm)}
                className="flex items-center gap-2 px-6 py-3 bg-accent text-zinc-950 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-accent-hover transition-all shadow-xl shadow-accent/10 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Log Entry
              </button>
            </div>

            <AnimatePresence>
              {showLogForm && (
                <motion.form
                  initial={{ opacity: 0, y: -20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.98 }}
                  onSubmit={handleLog}
                  className="bg-zinc-950/60 border border-zinc-800/80 rounded-[2.5rem] p-8 mb-12 space-y-6 shadow-2xl"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-2">
                        Vector
                      </label>
                      <select
                        value={logType}
                        onChange={(e) =>
                          setLogType(e.target.value as InteractionType)
                        }
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest text-zinc-100 outline-none focus:border-accent/40"
                      >
                        {[
                          "call",
                          "meeting",
                          "message",
                          "email",
                          "gift",
                          "other",
                        ].map((t) => (
                          <option key={t} value={t}>
                            {t.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-2">
                        Timestamp
                      </label>
                      <input
                        type="date"
                        value={logDate}
                        onChange={(e) => setLogDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-3.5 text-xs font-black text-zinc-200 outline-none focus:border-accent/40 [color-scheme:dark]"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-2">
                      Situation Report
                    </label>
                    <textarea
                      value={logNote}
                      onChange={(e) => setLogNote(e.target.value)}
                      placeholder="Detail the intelligence gathered..."
                      rows={3}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-sm font-medium text-zinc-200 outline-none focus:border-accent/40 resize-none leading-relaxed"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-[2] bg-accent text-zinc-950 py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-accent/20 disabled:opacity-50 transition-all hover:bg-accent-hover"
                    >
                      {isSubmitting ? "SYNCING..." : "COMMIT RECORD"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLogForm(false)}
                      className="flex-1 py-5 rounded-[1.5rem] bg-zinc-900 text-zinc-500 text-[10px] font-black uppercase tracking-widest border border-zinc-800 hover:text-zinc-200 transition-all"
                    >
                      ABORT
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              {sortedInteractions.length > 0 ? (
                sortedInteractions.map((it, i) => {
                  const Icon = interactionIcons[it.type] || Clock;
                  return (
                    <div
                      key={i}
                      className="group relative flex items-start gap-6 p-6 bg-zinc-950/20 border border-zinc-900/40 rounded-[2rem] transition-all hover:bg-zinc-900/40 hover:border-accent/10"
                    >
                      <div className="w-12 h-12 rounded-[1.25rem] bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 shadow-lg group-hover:border-accent/40 group-hover:shadow-accent/5 transition-all">
                        <Icon className="w-5 h-5 text-zinc-500 group-hover:text-accent transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-100 italic group-hover:text-accent transition-colors">
                            {it.type}
                          </span>
                          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                            {new Date(it.date).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="text-[13px] text-zinc-400 leading-relaxed font-medium transition-colors group-hover:text-zinc-300">
                          {it.note || "Operational silence maintained."}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-24 flex flex-col items-center text-center opacity-20 grayscale">
                  <Clock className="w-16 h-16 text-zinc-600 mb-6" />
                  <span className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-500">
                    Record Void
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
