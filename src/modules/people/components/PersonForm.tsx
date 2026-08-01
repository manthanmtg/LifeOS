"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  AlignLeft,
  Building2,
  Camera,
  Cake,
  Heart,
  Mail,
  Phone,
  Save,
  Star,
  Tag as TagIcon,
  Trash2,
  User,
  X,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import ImageCropper from "@/components/ui/ImageCropper";
import { RelativeDateNotificationFields } from "@/components/notifications/RelativeDateNotificationFields";
import { normalizeNotificationOffsetsDays } from "@/lib/notifications/preferences";
import {
  buildBirthdayNotificationPreferences,
  getBirthdayNotificationRule,
  resolvePeopleBirthdayNotificationPreferences,
} from "@/lib/notifications/people-preferences";
import type { PeopleSettings } from "@/modules/people/config";
import type { Person, PersonPayload, Relationship, SocialLink } from "../types";
import { RELATIONSHIPS } from "../types";

type NotificationMode = "inherit" | "custom" | "off";

interface PersonFormProps {
  person?: Person;
  peopleSettings: PeopleSettings;
  onClose: () => void;
  onSave: (payload: PersonPayload) => Promise<void>;
}

const inputCls =
  "w-full bg-zinc-900/40 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/5 transition-all";

function formatReminderOffsets(offsetsDays: number[]) {
  if (offsetsDays.length === 0) {
    return "No reminder days";
  }

  return offsetsDays
    .map((offset) => {
      if (offset === 0) return "on birthday";
      if (offset === 1) return "1 day before";
      return `${offset} days before`;
    })
    .join(", ");
}

export default function PersonForm({
  person,
  peopleSettings,
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
  const [profilePic, setProfilePic] = useState<
    { data: string; content_type: string } | undefined
  >(person?.payload.profile_pic);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [cropperMime, setCropperMime] = useState("image/jpeg");
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const explicitRule = useMemo(() => {
    if (!person?.payload.notifications) return undefined;
    return getBirthdayNotificationRule(person.payload.notifications);
  }, [person]);

  const [notificationMode, setNotificationMode] = useState<NotificationMode>(
    () => {
      if (!person?.payload.notifications) return "inherit";
      if (!person.payload.notifications.enabled || !explicitRule) {
        return "off";
      }

      return "custom";
    },
  );

  const [birthdayReminderOffsets, setBirthdayReminderOffsets] = useState(() => {
    if (person?.payload.notifications?.enabled && explicitRule) {
      return explicitRule.offsets_days;
    }

    return [1];
  });
  const [birthdayReminderChannelIds, setBirthdayReminderChannelIds] = useState<
    string[]
  >(() => (explicitRule?.channel_ids ? [...explicitRule.channel_ids] : []));

  const [error, setError] = useState("");

  const hasBirthday = birthday.trim().length > 0;

  const draftEffectivePreferences = useMemo(() => {
    if (!hasBirthday) {
      return resolvePeopleBirthdayNotificationPreferences(
        {
          relationship,
          notifications: undefined,
        },
        peopleSettings,
      );
    }

    if (notificationMode === "inherit") {
      return resolvePeopleBirthdayNotificationPreferences(
        {
          relationship,
          notifications: undefined,
        },
        peopleSettings,
      );
    }

    if (notificationMode === "off") {
      return resolvePeopleBirthdayNotificationPreferences(
        {
          relationship,
          notifications: { enabled: false, rules: [] },
        },
        peopleSettings,
      );
    }

    return resolvePeopleBirthdayNotificationPreferences(
      {
        relationship,
        notifications: buildBirthdayNotificationPreferences(
          true,
          birthdayReminderOffsets,
        ),
      },
      peopleSettings,
    );
  }, [
    birthdayReminderOffsets,
    hasBirthday,
    notificationMode,
    peopleSettings,
    relationship,
  ]);

  const draftEffectiveRule = getBirthdayNotificationRule(
    draftEffectivePreferences.preferences,
  );

  const reminderSummary = useMemo(() => {
    if (!hasBirthday) {
      return "Add a birthday to enable reminders.";
    }

    if (notificationMode === "off") {
      return "Person-level reminders are disabled.";
    }

    if (notificationMode === "custom") {
      const rule = getBirthdayNotificationRule(
        buildBirthdayNotificationPreferences(true, birthdayReminderOffsets),
      );
      const offsets = normalizeNotificationOffsetsDays(
        rule?.offsets_days ?? [1],
      );
      return `Custom reminders: ${formatReminderOffsets(offsets)}.`;
    }

    if (!draftEffectiveRule) {
      return "No inherited reminder configured.";
    }

    const sourceLabel =
      draftEffectivePreferences.origin.kind === "relationship"
        ? `${draftEffectivePreferences.origin.relationship} relationship`
        : "People default";
    return `Inherited from ${sourceLabel}: ${formatReminderOffsets(
      normalizeNotificationOffsetsDays(draftEffectiveRule.offsets_days),
    )}.`;
  }, [
    birthdayReminderOffsets,
    draftEffectiveRule,
    draftEffectivePreferences.origin,
    hasBirthday,
    notificationMode,
  ]);

  const handleRelationshipChange = (nextRelationship: Relationship) => {
    setRelationship(nextRelationship);
  };

  const handleNotificationModeChange = (nextMode: NotificationMode) => {
    if (nextMode === "custom" && notificationMode !== "custom") {
      const nextOffsets = draftEffectiveRule?.offsets_days.length
        ? draftEffectiveRule.offsets_days
        : [1];
      setBirthdayReminderOffsets(nextOffsets);
      setBirthdayReminderChannelIds(
        draftEffectiveRule?.channel_ids
          ? [...draftEffectiveRule.channel_ids]
          : [],
      );
    }

    setNotificationMode(nextMode);
  };

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
      avatar_url: profilePic ? undefined : person?.payload.avatar_url,
      profile_pic: profilePic,
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
      documents: person?.payload.documents || [],
    };

    if (hasBirthday) {
      if (notificationMode === "custom") {
        payload.notifications = buildBirthdayNotificationPreferences(
          true,
          normalizeNotificationOffsetsDays(birthdayReminderOffsets),
          birthdayReminderChannelIds,
        );
      } else if (notificationMode === "off") {
        payload.notifications = buildBirthdayNotificationPreferences(false, []);
      }

      if (notificationMode === "custom" && !payload.notifications?.enabled) {
        payload.notifications = buildBirthdayNotificationPreferences(true, [1]);
      }
    }

    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
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
        className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.97 }}
        className="relative w-full md:max-w-lg bg-zinc-950 border border-zinc-800 rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex justify-center pt-3 pb-0 md:hidden">
          <div className="w-10 h-1 rounded-full bg-zinc-800" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <User className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">
                {person ? "Edit Person" : "Add Someone"}
              </h2>
              <p className="text-[11px] text-zinc-500">
                Someone worth remembering
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close person form"
            className="p-2 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-5 space-y-5 overflow-y-auto flex-1 custom-scrollbar"
        >
          {error && (
            <p
              role="alert"
              className="bg-danger/10 border border-danger/20 p-3 rounded-xl text-danger text-xs font-medium text-center"
            >
              {error}
            </p>
          )}

          <fieldset className="space-y-3">
            <legend className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-900 w-full">
              <Star className="w-3.5 h-3.5 text-accent" /> Basic Info
            </legend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Name *
                </label>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Full name"
                  className={cn(inputCls, "font-medium")}
                  maxLength={100}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Relationship
                </label>
                <select
                  value={relationship}
                  onChange={(event) =>
                    handleRelationshipChange(event.target.value as Relationship)
                  }
                  className={inputCls}
                >
                  {RELATIONSHIPS.map((relationshipValue) => (
                    <option key={relationshipValue} value={relationshipValue}>
                      {relationshipValue.charAt(0).toUpperCase() +
                        relationshipValue.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                isFavorite
                  ? "bg-accent/15 border-accent/30 text-accent"
                  : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300",
              )}
            >
              <Heart
                className={cn("w-3.5 h-3.5", isFavorite && "fill-current")}
              />
              {isFavorite ? "In your inner circle" : "Add to inner circle"}
            </button>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-900 w-full">
              <Building2 className="w-3.5 h-3.5" /> Contact Details
            </legend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3 h-3" /> Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="email@example.com"
                  maxLength={320}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3 h-3" /> Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+X XXX XXX XXXX"
                  className={inputCls}
                  maxLength={50}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Company
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  className={inputCls}
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Role
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className={inputCls}
                  maxLength={100}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-900 w-full">
              <Cake className="w-3 h-3" /> Birthday reminders
            </legend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Cake className="w-3 h-3" /> Birthday
                </label>
                <input
                  type="date"
                  value={birthday}
                  onChange={(event) => setBirthday(event.target.value)}
                  className={cn(inputCls, "[color-scheme:dark]")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Birthday reminders
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                  <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                    <input
                      type="radio"
                      checked={notificationMode === "inherit"}
                      disabled={!hasBirthday}
                      onChange={() => handleNotificationModeChange("inherit")}
                      className="h-4 w-4 rounded-full border-zinc-700 accent-accent"
                    />
                    Inherit
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                    <input
                      type="radio"
                      checked={notificationMode === "custom"}
                      disabled={!hasBirthday}
                      onChange={() => handleNotificationModeChange("custom")}
                      className="h-4 w-4 rounded-full border-zinc-700 accent-accent"
                    />
                    Custom
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                    <input
                      type="radio"
                      checked={notificationMode === "off"}
                      disabled={!hasBirthday}
                      onChange={() => handleNotificationModeChange("off")}
                      className="h-4 w-4 rounded-full border-zinc-700 accent-accent"
                    />
                    Off
                  </label>
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-500">{reminderSummary}</p>

            <RelativeDateNotificationFields
              enabled={notificationMode === "custom"}
              disabled={!hasBirthday}
              offsetsDays={birthdayReminderOffsets}
              eventLabel="Birthday"
              onEnabledChange={(enabled) =>
                handleNotificationModeChange(enabled ? "custom" : "off")
              }
              onOffsetsChange={(offsetsDays) => {
                setBirthdayReminderOffsets(
                  normalizeNotificationOffsetsDays(offsetsDays),
                );
              }}
            />

            <p className="text-[10px] text-zinc-500">
              Configure per-person reminders, or use global People defaults.
              {hasBirthday
                ? " "
                : " Add a birthday to unlock reminder controls."}
            </p>
            {!hasBirthday && (
              <p className="text-xs text-warning">
                Notifications will be omitted if no birthday is saved.
              </p>
            )}
            <p className="text-xs text-zinc-500">
              Learn more:
              <a
                href="/admin/settings?tab=notifications"
                target="_blank"
                rel="noreferrer"
                className="ml-1 text-accent underline decoration-accent/30 underline-offset-2"
              >
                open People notification settings
              </a>
            </p>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-900 w-full">
              <Zap className="w-3.5 h-3.5 text-warning" /> More
            </legend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3 h-3" /> Photo
                </label>
                {profilePic ? (
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-zinc-700 shrink-0">
                      <Image
                        src={`data:${profilePic.content_type};base64,${profilePic.data}`}
                        alt="Profile"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-700 hover:bg-zinc-700 transition-colors"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfilePic(undefined)}
                        className="p-1.5 text-zinc-500 hover:text-danger rounded-lg hover:bg-danger/10 transition-colors"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      inputCls,
                      "flex items-center gap-2 text-zinc-600 hover:text-zinc-400 hover:border-zinc-600 cursor-pointer transition-colors text-left",
                    )}
                  >
                    <Camera className="w-4 h-4 shrink-0" />
                    <span>Upload photo</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      setCropperMime(file.type || "image/jpeg");
                      const url = URL.createObjectURL(file);
                      setCropperSrc(url);
                    }
                    event.target.value = "";
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <TagIcon className="w-3 h-3" /> Interests
                </label>
                <input
                  type="text"
                  value={interests}
                  onChange={(event) => setInterests(event.target.value)}
                  placeholder="Comma separated"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <TagIcon className="w-3 h-3" /> Tags
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="Comma separated"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <AlignLeft className="w-3 h-3" /> Notes
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Anything worth remembering..."
                rows={3}
                className={cn(inputCls, "resize-none leading-relaxed")}
                maxLength={5000}
              />
            </div>
          </fieldset>

          <div className="flex items-center gap-3 pt-4 border-t border-zinc-800/60">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-all border border-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-[2] bg-accent text-zinc-950 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-accent-hover transition-all shadow-lg shadow-accent/15 disabled:opacity-50 active:scale-[0.98]"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : person ? "Save Changes" : "Add Person"}
            </button>
          </div>
        </form>
      </motion.div>

      {cropperSrc && (
        <ImageCropper
          imageSrc={cropperSrc}
          mimeType={cropperMime}
          onClose={() => {
            if (cropperSrc) URL.revokeObjectURL(cropperSrc);
            setCropperSrc(null);
          }}
          onCropComplete={(base64Data, mimeType) => {
            setProfilePic({ data: base64Data, content_type: mimeType });
            if (cropperSrc) URL.revokeObjectURL(cropperSrc);
            setCropperSrc(null);
          }}
        />
      )}
    </div>
  );
}
