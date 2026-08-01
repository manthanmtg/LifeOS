"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bell, RefreshCw, Save, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { RelativeDateNotificationFields } from "@/components/notifications/RelativeDateNotificationFields";
import { normalizeNotificationOffsetsDays } from "@/lib/notifications/preferences";
import {
  buildBirthdayNotificationPreferences,
  getBirthdayNotificationRule,
  normalizePeopleSettings,
} from "@/lib/notifications/people-preferences";
import type { PeopleSettings } from "../config";
import { RELATIONSHIPS, type Relationship } from "../types";

interface RelationshipDraft {
  mode: "inherit" | "override";
  enabled: boolean;
  offsetsDays: number[];
  channelIds: string[];
}

interface DraftState {
  defaultEnabled: boolean;
  defaultOffsetsDays: number[];
  defaultChannelIds: string[];
  relationships: Record<Relationship, RelationshipDraft>;
}

interface PeopleNotificationSettingsDialogProps {
  settings: PeopleSettings;
  saving?: boolean;
  onClose: () => void;
  onSave: (settings: PeopleSettings) => Promise<boolean>;
}

function defaultRelationshipDraft(): RelationshipDraft {
  return {
    mode: "inherit",
    enabled: false,
    offsetsDays: [1],
    channelIds: [],
  };
}

function buildDraftFromSettings(settings: PeopleSettings): DraftState {
  const normalized = normalizePeopleSettings(settings);
  const defaultRule = getBirthdayNotificationRule(
    normalized.birthdayNotifications.default,
  );

  const defaultEnabled = normalized.birthdayNotifications.default.enabled;
  const defaultOffsetsDays = normalizeNotificationOffsetsDays(
    defaultRule?.offsets_days,
    [1],
  );
  const defaultChannelIds = defaultRule?.channel_ids ?? [];

  const relationships = RELATIONSHIPS.reduce(
    (acc, relationship) => {
      const configured =
        normalized.birthdayNotifications.relationships[relationship];
      if (!configured)
        return { ...acc, [relationship]: defaultRelationshipDraft() };

      const rule = getBirthdayNotificationRule(configured);
      if (!rule) {
        return {
          ...acc,
          [relationship]: {
            mode: "override",
            enabled: false,
            offsetsDays: [1],
            channelIds: [],
          },
        };
      }

      return {
        ...acc,
        [relationship]: {
          mode: "override",
          enabled: configured.enabled,
          offsetsDays: normalizeNotificationOffsetsDays(rule.offsets_days),
          channelIds: rule.channel_ids?.length ? [...rule.channel_ids] : [],
        },
      };
    },
    {} as Record<Relationship, RelationshipDraft>,
  );

  return {
    defaultEnabled,
    defaultOffsetsDays,
    defaultChannelIds,
    relationships,
  };
}

function toSettings(draft: DraftState): PeopleSettings {
  const relationships: PeopleSettings["birthdayNotifications"]["relationships"] =
    RELATIONSHIPS.reduce((acc, relationship) => {
      const row = draft.relationships[relationship];
      if (row.mode === "inherit") return acc;

      const preferences = buildBirthdayNotificationPreferences(
        row.enabled,
        row.offsetsDays,
        row.channelIds,
      );
      return { ...acc, [relationship]: preferences };
    }, {});

  return {
    birthdayNotifications: {
      default: buildBirthdayNotificationPreferences(
        draft.defaultEnabled,
        draft.defaultOffsetsDays,
        draft.defaultChannelIds,
      ),
      relationships,
    },
  };
}

function labelForRelationship(relationship: Relationship) {
  return relationship.charAt(0).toUpperCase() + relationship.slice(1);
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

  const handleSave = async () => {
    setSaving(true);
    setStatus("");
    try {
      const nextSettings = toSettings(draft);
      const ok = await onSave(nextSettings);

      if (ok) {
        setStatus("People birthday reminders saved");
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

  const resetRelationship = (relationship: Relationship) => {
    updateDraft((prev) => ({
      ...prev,
      relationships: {
        ...prev.relationships,
        [relationship]: defaultRelationshipDraft(),
      },
    }));
  };

  const isBusy = saving;

  const defaultSummary = useMemo(() => {
    if (!draft.defaultEnabled) return "Disabled by default";
    return `Notifies on ${draft.defaultOffsetsDays
      .map((offset) =>
        offset === 0
          ? "birthday"
          : offset === 1
            ? "1 day before"
            : `${offset} days before`,
      )
      .join(", ")}`;
  }, [draft.defaultEnabled, draft.defaultOffsetsDays]);

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
                People birthday reminders
              </h2>
              <p className="text-xs text-zinc-500">
                Configure default and relationship-based birthday notifications.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close people birthday settings"
            className="p-2 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
          <RelativeDateNotificationFields
            enabled={draft.defaultEnabled}
            offsetsDays={draft.defaultOffsetsDays}
            eventLabel="Birthday"
            onEnabledChange={(enabled) =>
              updateDraft((prev) => ({
                ...prev,
                defaultEnabled: enabled,
              }))
            }
            onOffsetsChange={(offsetsDays) =>
              updateDraft((prev) => ({
                ...prev,
                defaultOffsetsDays:
                  normalizeNotificationOffsetsDays(offsetsDays),
              }))
            }
          />

          <p className="text-xs text-zinc-500">{defaultSummary}</p>

          <div className="space-y-3">
            {RELATIONSHIPS.map((relationship) => {
              const row =
                draft.relationships[relationship] ?? defaultRelationshipDraft();
              const isInherited = row.mode === "inherit";
              return (
                <fieldset
                  key={relationship}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-3"
                >
                  <legend className="px-2 text-[10px] uppercase tracking-wider text-zinc-400">
                    {labelForRelationship(relationship)}
                  </legend>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
                      <input
                        type="radio"
                        name={`${relationship}-source`}
                        checked={isInherited}
                        disabled={isBusy}
                        onChange={() => {
                          updateDraft((prev) => ({
                            ...prev,
                            relationships: {
                              ...prev.relationships,
                              [relationship]: {
                                ...prev.relationships[relationship],
                                mode: "inherit",
                              },
                            },
                          }));
                        }}
                        className="h-4 w-4 rounded-full border-zinc-700 accent-accent"
                      />
                      Inherit People default
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
                      <input
                        type="radio"
                        name={`${relationship}-source`}
                        checked={!isInherited}
                        disabled={isBusy}
                        onChange={() => {
                          updateDraft((prev) => {
                            const row = prev.relationships[relationship];
                            const defaultOffsets = prev.defaultEnabled
                              ? prev.defaultOffsetsDays
                              : [1];
                            const seed =
                              row.offsetsDays.length > 0 &&
                              row.mode === "override"
                                ? row.offsetsDays
                                : defaultOffsets;
                            const channelIds =
                              row.mode === "override"
                                ? row.channelIds
                                : prev.defaultEnabled
                                  ? prev.defaultChannelIds
                                  : [];

                            return {
                              ...prev,
                              relationships: {
                                ...prev.relationships,
                                [relationship]: {
                                  mode: "override",
                                  enabled:
                                    row.mode === "override"
                                      ? row.enabled
                                      : true,
                                  offsetsDays: seed,
                                  channelIds,
                                },
                              },
                            };
                          });
                        }}
                        className="h-4 w-4 rounded-full border-zinc-700 accent-accent"
                      />
                      Override
                    </label>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => resetRelationship(relationship)}
                      className="inline-flex items-center gap-2 text-xs rounded-lg border border-zinc-800 bg-zinc-950/60 px-2.5 py-1.5 text-zinc-300 min-h-10"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Reset
                    </button>
                  </div>

                  {!isInherited && (
                    <RelativeDateNotificationFields
                      enabled={row.enabled}
                      offsetsDays={row.offsetsDays}
                      eventLabel="Birthday"
                      onEnabledChange={(enabled) => {
                        updateDraft((prev) => ({
                          ...prev,
                          relationships: {
                            ...prev.relationships,
                            [relationship]: {
                              ...prev.relationships[relationship],
                              enabled,
                            },
                          },
                        }));
                      }}
                      onOffsetsChange={(offsetsDays) => {
                        updateDraft((prev) => ({
                          ...prev,
                          relationships: {
                            ...prev.relationships,
                            [relationship]: {
                              ...prev.relationships[relationship],
                              offsetsDays:
                                normalizeNotificationOffsetsDays(offsetsDays),
                            },
                          },
                        }));
                      }}
                    />
                  )}
                </fieldset>
              );
            })}
          </div>

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
