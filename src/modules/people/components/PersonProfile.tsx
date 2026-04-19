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
import type { Person, PersonDocument, Interaction, InteractionType } from "../types";
import PersonDocuments from "./PersonDocuments";

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
  onUpdateInteractions: (interactions: Interaction[]) => Promise<void>;
  onUpdateDocuments: (person: Person, docs: PersonDocument[]) => Promise<void>;
}

function getBirthdayDisplay(birthday: string): {
  formatted: string;
  age: number | null;
} {
  const date = new Date(birthday + "T00:00:00");
  if (isNaN(date.getTime())) return { formatted: birthday, age: null };

  const month = date.toLocaleDateString(undefined, { month: "long" });
  const day = date.getDate();
  const year = date.getFullYear();

  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age--;
  }

  return {
    formatted: `${day} ${month}`,
    age: age >= 0 ? age : null,
  };
}

const inputCls =
  "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 outline-none focus:border-accent/40 transition-colors";

export default function PersonProfile({
  person,
  onBack,
  onEdit,
  onDelete,
  onToggleFavorite,
  onLogInteraction,
  onUpdateInteractions,
  onUpdateDocuments,
}: PersonProfileProps) {
  const [showLogForm, setShowLogForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
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
      if (editingIndex !== null) {
        const updated = [...(interactions || [])];
        updated[editingIndex] = {
          date: logDate,
          type: logType,
          note: logNote.trim() || undefined,
        };
        await onUpdateInteractions(updated);
        setEditingIndex(null);
      } else {
        await onLogInteraction(person._id, logType, logDate, logNote);
      }
      setLogNote("");
      setShowLogForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInteraction = async (index: number) => {
    if (!confirm("Are you sure you want to delete this moment?")) return;
    try {
      const updated = [...(interactions || [])];
      updated.splice(index, 1);
      await onUpdateInteractions(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const startEditing = (index: number) => {
    const it = interactions[index];
    setLogType(it.type);
    setLogDate(it.date);
    setLogNote(it.note || "");
    setEditingIndex(index);
    setShowLogForm(true);
  };

  const interactionIcons: Record<
    InteractionType,
    React.ComponentType<{ className?: string }>
  > = {
    call: Phone,
    meeting: Video,
    message: MessageSquare,
    email: Mail,
    gift: Gift,
    other: Clock,
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-200 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 transition-all"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      {/* Profile Header */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex flex-col md:flex-row gap-5 items-center md:items-start text-center md:text-left">
          {/* Avatar */}
          <div className="shrink-0 relative">
            {person.payload.profile_pic ? (
              <img
                src={`data:${person.payload.profile_pic.content_type};base64,${person.payload.profile_pic.data}`}
                alt={name}
                className="w-20 h-20 rounded-2xl object-cover border border-zinc-700"
              />
            ) : avatar_url ? (
              <img
                src={avatar_url}
                alt={name}
                className="w-20 h-20 rounded-2xl object-cover border border-zinc-700"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <span className="text-2xl font-bold text-zinc-600">
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
              <div className="absolute -top-1.5 -right-1.5 w-7 h-7 bg-accent text-zinc-950 rounded-lg flex items-center justify-center border-2 border-zinc-900">
                <Heart className="w-3.5 h-3.5 fill-current" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-zinc-50 tracking-tight mb-1.5">
                  {name}
                </h1>
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-zinc-950/40 text-zinc-400 border border-zinc-800/50">
                    {relationship}
                  </span>
                  {company && (
                    <span className="text-[10px] font-medium text-zinc-500 flex items-center gap-1 bg-zinc-950/40 px-2.5 py-1 rounded-lg border border-zinc-800/40">
                      <Building2 className="w-3 h-3" />
                      {role ? `${role} @ ` : ""}
                      {company}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onToggleFavorite(person)}
                  className={cn(
                    "p-2 rounded-xl transition-all border",
                    is_favorite
                      ? "bg-accent/15 border-accent/30 text-accent"
                      : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:text-zinc-200",
                  )}
                >
                  <Heart
                    className={cn("w-4 h-4", is_favorite && "fill-current")}
                  />
                </button>
                <button
                  onClick={() => onEdit(person)}
                  className="p-2 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-500 hover:text-accent hover:bg-accent/10 transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(person._id)}
                  className="p-2 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-500 hover:text-danger hover:bg-danger/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick info row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <div className="p-3 bg-zinc-950/20 rounded-xl border border-zinc-800/30">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">
                  Last Seen
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      daysSinceContact !== null && daysSinceContact < 30
                        ? "bg-success"
                        : "bg-warning",
                    )}
                  />
                  <span className="text-xs font-semibold text-zinc-300">
                    {daysSinceContact === null
                      ? "Not yet"
                      : daysSinceContact === 0
                        ? "Today"
                        : `${daysSinceContact} days ago`}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-zinc-950/20 rounded-xl border border-zinc-800/30">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">
                  Contact
                </span>
                <div className="flex items-center gap-2">
                  {phone && <Phone className="w-3 h-3 text-zinc-500" />}
                  {email && <Mail className="w-3 h-3 text-zinc-500" />}
                  <span className="text-xs font-medium text-zinc-400 truncate">
                    {email || phone || "No info yet"}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-zinc-950/20 rounded-xl border border-zinc-800/30">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">
                  Birthday
                </span>
                <div className="flex items-center gap-2">
                  <Cake className="w-3 h-3 text-zinc-500" />
                  {birthday ? (
                    (() => {
                      const { formatted, age } = getBirthdayDisplay(birthday);
                      return (
                        <span className="text-xs font-semibold text-zinc-300">
                          {formatted}
                          <span className="text-zinc-500 font-normal ml-1">
                            ({new Date(birthday + "T00:00:00").getFullYear()})
                          </span>
                          {age !== null && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-zinc-800 text-[10px] font-bold text-zinc-400 border border-zinc-700/50">
                              {age} yr{age !== 1 ? "s" : ""}
                            </span>
                          )}
                        </span>
                      );
                    })()
                  ) : (
                    <span className="text-xs font-semibold text-zinc-300">
                      Not set
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pb-10">
        {/* About */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-4 flex items-center gap-2">
              <AlignLeft className="w-3.5 h-3.5" /> About
            </h3>

            <div className="space-y-5">
              {notes && (
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 mb-2 block">
                    Notes
                  </span>
                  <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/30 p-3 rounded-xl border border-zinc-800/40">
                    {notes}
                  </p>
                </div>
              )}

              {(interests || []).length > 0 && (
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 mb-2 block flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> Interests
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {interests?.map((i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-medium text-zinc-400"
                      >
                        {i}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(tags || []).length > 0 && (
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 mb-2 block flex items-center gap-1.5">
                    <TagIcon className="w-3 h-3" /> Tags
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {tags?.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 rounded-lg bg-accent/5 border border-accent/20 text-[10px] font-medium text-accent"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!notes && !(interests || []).length && !(tags || []).length && (
                <p className="text-xs text-zinc-600 py-6 text-center">
                  No details added yet
                </p>
              )}
            </div>
          </div>

          {/* Documents */}
          <PersonDocuments person={person} onUpdate={onUpdateDocuments} />
        </div>

        {/* Moments */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                  Moments Together
                </h3>
                <span className="text-[9px] font-medium text-zinc-700">
                  {sortedInteractions.length} logged
                </span>
              </div>
              {!showLogForm && (
                <button
                  onClick={() => setShowLogForm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-accent text-zinc-950 text-xs font-semibold rounded-xl hover:bg-accent-hover transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Moment
                </button>
              )}
            </div>

            <AnimatePresence>
              {showLogForm && (
                <motion.form
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  onSubmit={handleLog}
                  className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 mb-5 space-y-3"
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                      {editingIndex !== null ? (
                        <>
                          <Edit3 className="w-3 h-3" /> Edit Moment
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" /> Log Moment
                        </>
                      )}
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">
                        Type
                      </label>
                      <select
                        value={logType}
                        onChange={(e) =>
                          setLogType(e.target.value as InteractionType)
                        }
                        className={inputCls}
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
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">
                        Date
                      </label>
                      <input
                        type="date"
                        value={logDate}
                        onChange={(e) => setLogDate(e.target.value)}
                        className={cn(inputCls, "[color-scheme:dark]")}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">
                      Note
                    </label>
                    <textarea
                      value={logNote}
                      onChange={(e) => setLogNote(e.target.value)}
                      placeholder="What happened? How did it go?"
                      rows={2}
                      className={cn(inputCls, "resize-none leading-relaxed")}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-[2] bg-accent text-zinc-950 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50 transition-all hover:bg-accent-hover"
                    >
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLogForm(false);
                        setEditingIndex(null);
                        setLogNote("");
                        setLogDate(new Date().toISOString().slice(0, 10));
                        setLogType("message");
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-zinc-500 text-xs font-medium border border-zinc-800 hover:text-zinc-200 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="space-y-2.5">
              {sortedInteractions.length > 0 ? (
                sortedInteractions.map((it) => {
                  const Icon = interactionIcons[it.type] || Clock;
                  // Use finding by reference/content similarity since we don't have IDs
                  const originalIndex = interactions.findIndex(
                    (i) =>
                      i.date === it.date &&
                      i.type === it.type &&
                      i.note === it.note,
                  );

                  return (
                    <div
                      key={`${it.date}-${it.type}-${originalIndex}`}
                      className="group flex items-start gap-3 p-3 bg-zinc-950/20 border border-zinc-900/40 rounded-xl transition-all hover:bg-zinc-900/40 hover:border-accent/10"
                    >
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 group-hover:border-accent/40 transition-all">
                        <Icon className="w-3.5 h-3.5 text-zinc-500 group-hover:text-accent transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-zinc-200 capitalize group-hover:text-accent transition-colors">
                              {it.type}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEditing(originalIndex)}
                                className="p-1 text-zinc-600 hover:text-accent transition-colors"
                                title="Edit moment"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteInteraction(originalIndex)
                                }
                                className="p-1 text-zinc-600 hover:text-danger transition-colors"
                                title="Delete moment"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <span className="text-[10px] font-medium text-zinc-600">
                            {new Date(it.date).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">
                          {it.note || "No notes added"}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 flex flex-col items-center text-center">
                  <Clock className="w-10 h-10 text-zinc-700 mb-3" />
                  <span className="text-sm text-zinc-600 font-medium">
                    No moments yet
                  </span>
                  <span className="text-xs text-zinc-700 mt-1">
                    Log a call, message, or meeting to get started
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
