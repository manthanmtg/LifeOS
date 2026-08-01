"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Clock, RefreshCw, Save, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { RelativeDateNotificationFields } from "@/components/notifications/RelativeDateNotificationFields";
import { normalizeNotificationOffsetsDays } from "@/lib/notifications/preferences";
import {
  buildBirthdayNotificationPreferences,
  buildContactReminderNotificationPreferences,
  getBirthdayNotificationRule,
  getContactReminderNotificationRule,
  normalizePeopleContactReminderCadenceDays,
  normalizePeopleSettings,
} from "@/lib/notifications/people-preferences";
import {
  DEFAULT_CONTACT_REMINDER_CADENCE_DAYS,
  type PeopleSettings,
} from "../config";
import { RELATIONSHIPS, type Relationship } from "../types";

type ReminderKind = "birthday" | "contact";

interface ReminderDraft {
  enabled: boolean;
  offsetsDays: number[];
  channelIds: string[];
  cadenceDays: number;
}

interface RelationshipDraft extends ReminderDraft {
  mode: "inherit" | "override";
}

interface CategoryDraft {
  default: ReminderDraft;
  relationships: Record<Relationship, RelationshipDraft>;
}

interface DraftState {
  birthday: CategoryDraft;
  contact: CategoryDraft;
}

interface PeopleNotificationSettingsDialogProps {
  settings: PeopleSettings;
  saving?: boolean;
  onClose: () => void;
  onSave: (settings: PeopleSettings) => Promise<boolean>;
}

const DEFAULT_BIRTHDAY_OFFSETS = [1];
const DEFAULT_CONTACT_OFFSETS = [0];

function fallbackOffsets(kind: ReminderKind) {
  return kind === "contact"
    ? DEFAULT_CONTACT_OFFSETS
    : DEFAULT_BIRTHDAY_OFFSETS;
}

function defaultReminderDraft(kind: ReminderKind): ReminderDraft {
  return {
    enabled: false,
    offsetsDays: fallbackOffsets(kind),
    channelIds: [],
    cadenceDays: DEFAULT_CONTACT_REMINDER_CADENCE_DAYS,
  };
}

function defaultRelationshipDraft(kind: ReminderKind): RelationshipDraft {
  return {
    ...defaultReminderDraft(kind),
    mode: "inherit",
  };
}

function buildReminderDraft(
  kind: ReminderKind,
  preferences: PeopleSettings["birthdayNotifications"]["default"],
): ReminderDraft {
  const rule =
    kind === "contact"
      ? getContactReminderNotificationRule(preferences)
      : getBirthdayNotificationRule(preferences);

  if (!rule) {
    return defaultReminderDraft(kind);
  }

  return {
    enabled: preferences.enabled,
    offsetsDays: normalizeNotificationOffsetsDays(
      rule.offsets_days,
      fallbackOffsets(kind),
    ),
    channelIds: rule.channel_ids?.length ? [...rule.channel_ids] : [],
    cadenceDays: normalizePeopleContactReminderCadenceDays(rule.cadence_days),
  };
}

function buildCategoryDraft(
  kind: ReminderKind,
  category: PeopleSettings["birthdayNotifications"],
): CategoryDraft {
  const defaultDraft = buildReminderDraft(kind, category.default);

  const relationships = RELATIONSHIPS.reduce(
    (acc, relationship) => {
      const configured = category.relationships[relationship];
      if (!configured) {
        return { ...acc, [relationship]: defaultRelationshipDraft(kind) };
      }

      return {
        ...acc,
        [relationship]: {
          ...buildReminderDraft(kind, configured),
          mode: "override",
        },
      };
    },
    {} as Record<Relationship, RelationshipDraft>,
  );

  return {
    default: defaultDraft,
    relationships,
  };
}

function buildDraftFromSettings(settings: PeopleSettings): DraftState {
  const normalized = normalizePeopleSettings(settings);

  return {
    birthday: buildCategoryDraft("birthday", normalized.birthdayNotifications),
    contact: buildCategoryDraft("contact", normalized.contactNotifications),
  };
}

function toReminderPreferences(kind: ReminderKind, draft: ReminderDraft) {
  if (kind === "contact") {
    return buildContactReminderNotificationPreferences(
      draft.enabled,
      draft.cadenceDays,
      draft.offsetsDays,
      draft.channelIds,
    );
  }

  return buildBirthdayNotificationPreferences(
    draft.enabled,
    draft.offsetsDays,
    draft.channelIds,
  );
}

function toRelationshipSettings(
  kind: ReminderKind,
  relationships: Record<Relationship, RelationshipDraft>,
) {
  return RELATIONSHIPS.reduce(
    (acc, relationship) => {
      const row = relationships[relationship];
      if (row.mode === "inherit") return acc;

      return {
        ...acc,
        [relationship]: toReminderPreferences(kind, row),
      };
    },
    {} as PeopleSettings["birthdayNotifications"]["relationships"],
  );
}

function toSettings(draft: DraftState): PeopleSettings {
  return {
    birthdayNotifications: {
      default: toReminderPreferences("birthday", draft.birthday.default),
      relationships: toRelationshipSettings(
        "birthday",
        draft.birthday.relationships,
      ),
    },
    contactNotifications: {
      default: toReminderPreferences("contact", draft.contact.default),
      relationships: toRelationshipSettings(
        "contact",
        draft.contact.relationships,
      ),
    },
  };
}

function labelForRelationship(relationship: Relationship) {
  return relationship.charAt(0).toUpperCase() + relationship.slice(1);
}

function formatReminderOffsets(kind: ReminderKind, offsetsDays: number[]) {
  if (offsetsDays.length === 0) return "No reminder days";

  return offsetsDays
    .map((offset) => {
      if (offset === 0) {
        return kind === "contact" ? "on due date" : "on birthday";
      }
      if (offset === 1) return "1 day before";
      return `${offset} days before`;
    })
    .join(", ");
}

function buildSummary(kind: ReminderKind, draft: ReminderDraft) {
  if (!draft.enabled) return "Disabled by default";

  const timing = formatReminderOffsets(kind, draft.offsetsDays);
  if (kind === "contact") {
    return `Every ${draft.cadenceDays} days · ${timing}`;
  }

  return `Notifies ${timing}`;
}

function seedRelationshipDraft(
  kind: ReminderKind,
  row: RelationshipDraft,
  defaultDraft: ReminderDraft,
): RelationshipDraft {
  if (row.mode === "override") {
    return row;
  }

  return {
    mode: "override",
    enabled: true,
    offsetsDays: defaultDraft.enabled
      ? defaultDraft.offsetsDays
      : fallbackOffsets(kind),
    channelIds: defaultDraft.enabled ? defaultDraft.channelIds : [],
    cadenceDays: defaultDraft.enabled
      ? defaultDraft.cadenceDays
      : DEFAULT_CONTACT_REMINDER_CADENCE_DAYS,
  };
}

export default function PeopleNotificationSettingsDialog({
  settings,
  onClose,
  onSave,
}: PeopleNotificationSettingsDialogProps) {
  const [draft, setDraft] = useState<DraftState>(() =>
    buildDraftFromSettings(settings),
  );
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(buildDraftFromSettings(settings));
  }, [settings]);

  const updateDraft = (updater: (prev: DraftState) => DraftState) =>
    setDraft((prev) => updater(prev));

  const updateDefault = (
    kind: ReminderKind,
    updater: (prev: ReminderDraft) => ReminderDraft,
  ) => {
    updateDraft((prev) => ({
      ...prev,
      [kind]: {
        ...prev[kind],
        default: updater(prev[kind].default),
      },
    }));
  };

  const updateRelationship = (
    kind: ReminderKind,
    relationship: Relationship,
    updater: (prev: RelationshipDraft) => RelationshipDraft,
  ) => {
    updateDraft((prev) => ({
      ...prev,
      [kind]: {
        ...prev[kind],
        relationships: {
          ...prev[kind].relationships,
          [relationship]: updater(prev[kind].relationships[relationship]),
        },
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus("");
    try {
      const nextSettings = toSettings(draft);
      const ok = await onSave(nextSettings);

      if (ok) {
        setStatus("People reminders saved");
        onClose();
      } else {
        setStatus("Failed to save people notification settings");
      }
    } catch {
      setStatus("Failed to save people notification settings");
    } finally {
      setSaving(false);
    }
  };

  const resetRelationship = (
    kind: ReminderKind,
    relationship: Relationship,
  ) => {
    updateRelationship(kind, relationship, () =>
      defaultRelationshipDraft(kind),
    );
  };

  const isBusy = saving;

  const defaultSummaries = useMemo(
    () => ({
      birthday: buildSummary("birthday", draft.birthday.default),
      contact: buildSummary("contact", draft.contact.default),
    }),
    [draft.birthday.default, draft.contact.default],
  );

  const renderDefaultSection = (
    kind: ReminderKind,
    title: string,
    eventLabel: string,
    description: string,
  ) => {
    const row = draft[kind].default;

    return (
      <fieldset className="space-y-3" aria-label={`${title} default`}>
        <legend className="sr-only">{title} default</legend>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/10">
              {kind === "contact" ? (
                <Clock className="h-4 w-4 text-accent" />
              ) : (
                <Bell className="h-4 w-4 text-accent" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
              <p className="text-xs text-zinc-500">{description}</p>
            </div>
          </div>

          {kind === "contact" && (
            <label className="block text-xs font-medium text-zinc-400">
              Contact cadence
              <input
                aria-label="Contact cadence"
                type="number"
                min={1}
                max={3650}
                value={row.cadenceDays}
                disabled={isBusy}
                onChange={(event) =>
                  updateDefault(kind, (prev) => ({
                    ...prev,
                    cadenceDays: normalizePeopleContactReminderCadenceDays(
                      Number(event.target.value),
                    ),
                  }))
                }
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </label>
          )}

          <RelativeDateNotificationFields
            enabled={row.enabled}
            offsetsDays={row.offsetsDays}
            eventLabel={eventLabel}
            onEnabledChange={(enabled) =>
              updateDefault(kind, (prev) => ({
                ...prev,
                enabled,
                offsetsDays:
                  enabled && prev.offsetsDays.length === 0
                    ? fallbackOffsets(kind)
                    : prev.offsetsDays,
              }))
            }
            onOffsetsChange={(offsetsDays) =>
              updateDefault(kind, (prev) => ({
                ...prev,
                offsetsDays: normalizeNotificationOffsetsDays(
                  offsetsDays,
                  fallbackOffsets(kind),
                ),
              }))
            }
          />

          <p className="text-xs text-zinc-500">{defaultSummaries[kind]}</p>
        </div>
      </fieldset>
    );
  };

  const renderRelationshipSection = (
    kind: ReminderKind,
    title: string,
    eventLabel: string,
  ) => (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {title} relationship overrides
      </h3>
      {RELATIONSHIPS.map((relationship) => {
        const row =
          draft[kind].relationships[relationship] ??
          defaultRelationshipDraft(kind);
        const isInherited = row.mode === "inherit";
        const relationshipLabel = labelForRelationship(relationship);

        return (
          <fieldset
            key={`${kind}-${relationship}`}
            className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-3"
          >
            <legend className="px-2 text-[10px] uppercase tracking-wider text-zinc-400">
              {title} {relationshipLabel}
            </legend>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="radio"
                  name={`${kind}-${relationship}-source`}
                  checked={isInherited}
                  disabled={isBusy}
                  onChange={() => {
                    updateRelationship(kind, relationship, (prev) => ({
                      ...prev,
                      mode: "inherit",
                    }));
                  }}
                  className="h-4 w-4 rounded-full border-zinc-700 accent-accent"
                />
                Inherit People default
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="radio"
                  name={`${kind}-${relationship}-source`}
                  checked={!isInherited}
                  disabled={isBusy}
                  onChange={() => {
                    updateRelationship(kind, relationship, (prev) =>
                      seedRelationshipDraft(kind, prev, draft[kind].default),
                    );
                  }}
                  className="h-4 w-4 rounded-full border-zinc-700 accent-accent"
                />
                Override
              </label>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => resetRelationship(kind, relationship)}
                className="inline-flex items-center gap-2 text-xs rounded-lg border border-zinc-800 bg-zinc-950/60 px-2.5 py-1.5 text-zinc-300 min-h-10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>

            {!isInherited && (
              <div className="space-y-3">
                {kind === "contact" && (
                  <label className="block text-xs font-medium text-zinc-400">
                    Contact cadence
                    <input
                      aria-label="Contact cadence"
                      type="number"
                      min={1}
                      max={3650}
                      value={row.cadenceDays}
                      disabled={isBusy}
                      onChange={(event) =>
                        updateRelationship(kind, relationship, (prev) => ({
                          ...prev,
                          cadenceDays:
                            normalizePeopleContactReminderCadenceDays(
                              Number(event.target.value),
                            ),
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                  </label>
                )}

                <RelativeDateNotificationFields
                  enabled={row.enabled}
                  offsetsDays={row.offsetsDays}
                  eventLabel={eventLabel}
                  onEnabledChange={(enabled) => {
                    updateRelationship(kind, relationship, (prev) => ({
                      ...prev,
                      enabled,
                      offsetsDays:
                        enabled && prev.offsetsDays.length === 0
                          ? fallbackOffsets(kind)
                          : prev.offsetsDays,
                    }));
                  }}
                  onOffsetsChange={(offsetsDays) => {
                    updateRelationship(kind, relationship, (prev) => ({
                      ...prev,
                      offsetsDays: normalizeNotificationOffsetsDays(
                        offsetsDays,
                        fallbackOffsets(kind),
                      ),
                    }));
                  }}
                />
              </div>
            )}
          </fieldset>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center md:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/75 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.985 }}
        className="relative w-full max-w-4xl rounded-t-2xl bg-zinc-950 border border-zinc-800 md:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Bell className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                People reminders
              </h2>
              <p className="text-xs text-zinc-500">
                Configure birthday and contact cadence notifications.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close people notification settings"
            className="p-2 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-5 overflow-y-auto custom-scrollbar">
          {renderDefaultSection(
            "birthday",
            "Birthday",
            "Birthday",
            "Default reminder timing for saved birthdays.",
          )}
          {renderRelationshipSection("birthday", "Birthday", "Birthday")}

          {renderDefaultSection(
            "contact",
            "Contact",
            "Contact due date",
            "Default stay-in-touch cadence based on the latest logged contact.",
          )}
          {renderRelationshipSection("contact", "Contact", "Contact due date")}

          {status && (
            <p
              role="status"
              aria-live="polite"
              className="text-xs text-zinc-400"
            >
              {status}
            </p>
          )}
        </div>

        <div className="border-t border-zinc-800/60 px-4 py-3 shrink-0 bg-zinc-950 flex flex-col gap-2 sm:flex-row sm:justify-end sm:items-center">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={handleSave}
            className={cn(
              "inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-accent-hover transition-colors disabled:opacity-50",
              isBusy && "pointer-events-none",
            )}
          >
            {isBusy ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{isBusy ? "Saving..." : "Save"}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
