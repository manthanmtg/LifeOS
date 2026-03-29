"use client";

import { useState } from "react";
import {
  X,
  Save,
  User,
  Building2,
  Cake,
  Phone,
  Mail,
  Link as LinkIcon,
  Heart,
  Star,
  Tag as TagIcon,
  Zap,
  AlignLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Person,
  PersonPayload,
  RELATIONSHIPS,
  Relationship,
  SocialLink,
} from "../types";

interface PersonFormProps {
  person?: Person;
  onClose: () => void;
  onSave: (payload: PersonPayload) => Promise<void>;
}

export default function PersonForm({
  person,
  onClose,
  onSave,
}: PersonFormProps) {
  const [name, setName] = useState(person?.payload.name || "");
  const [relationship, setRelationship] = useState<Relationship>(
    person?.payload.relationship || "friend",
  );
  const [phone, setPhone] = useState(person?.payload.phone || "");
  const [email, setEmail] = useState(person?.payload.email || "");
  const [company, setCompany] = useState(person?.payload.company || "");
  const [role, setRole] = useState(person?.payload.role || "");
  const [birthday, setBirthday] = useState(person?.payload.birthday || "");
  const [avatarUrl, setAvatarUrl] = useState(person?.payload.avatar_url || "");
  const [interests, setInterests] = useState(
    (person?.payload.interests || []).join(", "),
  );
  const [tags, setTags] = useState((person?.payload.tags || []).join(", "));
  const [notes, setNotes] = useState(person?.payload.notes || "");
  const [socialLinks] = useState<SocialLink[]>(
    person?.payload.social_links || [],
  );
  const [isFavorite, setIsFavorite] = useState(
    person?.payload.is_favorite || false,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setIsSaving(true);
    setError("");

    const payload: PersonPayload = {
      name: name.trim(),
      relationship,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      company: company.trim() || undefined,
      role: role.trim() || undefined,
      birthday: birthday || undefined,
      avatar_url: avatarUrl.trim() || undefined,
      interests: interests
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      notes: notes.trim() || undefined,
      social_links: socialLinks.filter(
        (sl) => sl.platform.trim() && sl.url.trim(),
      ),
      is_favorite: isFavorite,
      interactions: person?.payload.interactions || [],
      last_contacted: person?.payload.last_contacted,
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save connection";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center md:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.95 }}
        className="relative w-full md:max-w-3xl bg-zinc-950/80 backdrop-blur-2xl border border-zinc-800/50 rounded-t-[3rem] md:rounded-[4rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
      >
        <div className="flex justify-center pt-5 pb-1 md:hidden">
          <div className="w-12 h-1.5 rounded-full bg-zinc-800" />
        </div>

        <div className="flex items-center justify-between px-10 py-8 border-b border-zinc-800/40 shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-3xl bg-accent/10 border border-accent/20 flex items-center justify-center shadow-inner">
              <User className="w-7 h-7 text-accent" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-zinc-100 italic tracking-tighter uppercase">
                {person ? "Edit Contact" : "Add Contact"}
              </h2>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mt-1">
                Personal CRM
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-4 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-[2rem] transition-all"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-10 space-y-12 overflow-y-auto flex-1 custom-scrollbar pb-20"
        >
          {error && (
            <div className="bg-danger/10 border border-danger/20 p-4 rounded-2xl text-danger text-xs font-bold uppercase tracking-widest text-center">
              {error}
            </div>
          )}

          {/* Section: Identity */}
          <div className="space-y-8">
            <div className="flex items-center gap-4 border-b border-zinc-900 pb-2">
              <Star className="w-4 h-4 text-accent" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-400">
                Basic Info
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">
                  Full Name
                </label>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full bg-zinc-900/30 border-2 border-zinc-800/50 rounded-3xl px-6 py-4 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all font-bold text-lg"
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">
                  Relationship
                </label>
                <select
                  value={relationship}
                  onChange={(e) =>
                    setRelationship(e.target.value as Relationship)
                  }
                  className="w-full bg-zinc-900/40 border-2 border-zinc-800/50 rounded-3xl px-6 py-[1.125rem] text-sm font-black uppercase tracking-widest text-zinc-100 outline-none focus:border-accent/40"
                >
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>
                      {r.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-6 p-2">
              <button
                type="button"
                onClick={() => setIsFavorite(!isFavorite)}
                className={cn(
                  "flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all font-black text-[10px] uppercase tracking-widest",
                  isFavorite
                    ? "bg-pink-500 border-pink-600 text-zinc-950 shadow-lg shadow-pink-500/20"
                    : "bg-zinc-900 border-zinc-800 text-zinc-500",
                )}
              >
                <Heart
                  className={cn("w-4 h-4", isFavorite && "fill-current")}
                />
                {isFavorite ? "Favorited" : "Add to Favorites"}
              </button>
            </div>
          </div>

          {/* Section: Logistics */}
          <div className="space-y-8">
            <div className="flex items-center gap-4 border-b border-zinc-900 pb-2">
              <Building2 className="w-4 h-4 text-zinc-500" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-400">
                Contact Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" /> Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="comms@frequency.net"
                  className="w-full bg-zinc-900/30 border-2 border-zinc-800/50 rounded-3xl px-6 py-4 text-sm text-zinc-200 outline-none focus:border-accent/40"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" /> Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+X XXX XXX XXXX"
                  className="w-full bg-zinc-900/30 border-2 border-zinc-800/50 rounded-3xl px-6 py-4 text-sm text-zinc-200 outline-none focus:border-accent/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">
                  Company
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-zinc-900/30 border-2 border-zinc-800/50 rounded-3xl px-6 py-4 text-sm text-zinc-200 outline-none focus:border-accent/40"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">
                  Role
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-zinc-900/30 border-2 border-zinc-800/50 rounded-3xl px-6 py-4 text-sm text-zinc-200 outline-none focus:border-accent/40"
                />
              </div>
            </div>
          </div>

          {/* Section: Strategic Context */}
          <div className="space-y-8">
            <div className="flex items-center gap-4 border-b border-zinc-900 pb-2">
              <Zap className="w-4 h-4 text-warning" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-400">
                Additional Info
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                  <Cake className="w-3.5 h-3.5" /> Birthday
                </label>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full bg-zinc-900/30 border-2 border-zinc-800/50 rounded-3xl px-6 py-3.5 text-sm text-zinc-200 outline-none focus:border-accent/40 [color-scheme:dark]"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                  <LinkIcon className="w-3.5 h-3.5" /> Profile Photo URL
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full bg-zinc-900/30 border-2 border-zinc-800/50 rounded-3xl px-6 py-4 text-sm text-zinc-200 outline-none focus:border-accent/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" /> Interests
                </label>
                <input
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="Comma separated..."
                  className="w-full bg-zinc-900/30 border-2 border-zinc-800/50 rounded-3xl px-6 py-4 text-sm text-zinc-200 outline-none focus:border-accent/40"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                  <TagIcon className="w-3.5 h-3.5" /> Tags
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Comma separated..."
                  className="w-full bg-zinc-900/30 border-2 border-zinc-800/50 rounded-3xl px-6 py-4 text-sm text-zinc-200 outline-none focus:border-accent/40"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                <AlignLeft className="w-3.5 h-3.5" /> Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything worth remembering about this person..."
                rows={4}
                className="w-full bg-zinc-900/30 border-2 border-zinc-800/50 rounded-[2.5rem] px-8 py-6 text-sm font-medium leading-relaxed text-zinc-200 outline-none focus:border-accent/40 resize-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-10 border-t border-zinc-900">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-10 py-6 rounded-[2rem] text-[12px] font-black uppercase tracking-[0.4em] text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-all border border-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-[2] bg-accent text-zinc-950 px-10 py-6 rounded-[2.5rem] text-[12px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-4 hover:bg-accent-hover transition-all shadow-2xl shadow-accent/20 disabled:opacity-50 active:scale-95 group"
            >
              <Save className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              {isSaving
                ? "Saving..."
                : person
                  ? "Save Changes"
                  : "Add Contact"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
