"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  KeyRound,
  Play,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";

import { SkeletonBlock } from "@/components/ui/Skeletons";
import type {
  NotificationChannelDto,
  NotificationDeliveryDto,
  NotificationOverview,
  NotificationSettings,
  NotificationSourceActivationSummary,
} from "@/lib/notifications/contracts";
import { cn } from "@/lib/utils";

const DEFAULT_OVERVIEW: NotificationOverview = {
  settings: {
    enabled: false,
    timezone: "UTC",
    deliveryHour: 9,
    catchUpHours: 36,
  },
  encryption_ready: false,
  encryption_key_source: null,
  channels: [],
  sources: [],
  delivery_counts: { sent: 0, failed: 0, dead_letter: 0 },
  recent_deliveries: [],
};

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function sourcePreview(source: NotificationSourceActivationSummary) {
  return `${source.eligible_count} enabled items · ${source.explicit_count} explicit · ${source.inherited_count} inherited`;
}

function statusClass(status: NotificationDeliveryDto["status"]) {
  if (status === "sent") return "text-success bg-success/10 border-success/20";
  if (status === "dead_letter" || status === "failed") {
    return "text-danger bg-danger/10 border-danger/20";
  }
  return "text-warning bg-warning/10 border-warning/20";
}

export function NotificationSettingsTab() {
  const [overview, setOverview] =
    useState<NotificationOverview>(DEFAULT_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [running, setRunning] = useState(false);
  const [settingUpEncryption, setSettingUpEncryption] = useState(false);
  const [status, setStatus] = useState("");
  const [connectionName, setConnectionName] = useState("");
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");

  const enabledChannels = useMemo(
    () => overview.channels.filter((channel) => channel.enabled).length,
    [overview.channels],
  );

  const loadOverview = async () => {
    setError(null);
    try {
      const response = await fetch("/api/notifications/overview");
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Failed to load notifications");
      }
      setOverview({ ...DEFAULT_OVERVIEW, ...(body.data ?? {}) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const saveSettings = async (updates: Partial<NotificationSettings>) => {
    setSavingSettings(true);
    setStatus("");
    try {
      const nextSettings = { ...overview.settings, ...updates };
      const response = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: nextSettings.enabled,
          timezone: nextSettings.timezone,
          deliveryHour: nextSettings.deliveryHour,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Failed to save settings");
      }
      setOverview((current) => ({ ...current, settings: body.data }));
      setStatus("Notification settings saved");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const connectTelegram = async (event: FormEvent) => {
    event.preventDefault();
    setConnecting(true);
    setStatus("");
    try {
      const response = await fetch("/api/notifications/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adapter_type: "telegram",
          name: connectionName,
          bot_token: botToken,
          chat_id: chatId,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Failed to connect Telegram");
      }
      setConnectionName("");
      setBotToken("");
      setChatId("");
      setStatus("Telegram connected and tested");
      await loadOverview();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setConnecting(false);
    }
  };

  const updateChannel = async (
    channel: NotificationChannelDto,
    updates: Record<string, unknown>,
  ) => {
    const response = await fetch(`/api/notifications/channels/${channel.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const body = await response.json();
      throw new Error(body.error || "Failed to update channel");
    }
    await loadOverview();
  };

  const deleteChannel = async (channel: NotificationChannelDto) => {
    if (!confirm(`Delete ${channel.name}? Delivery history remains.`)) return;
    await fetch(`/api/notifications/channels/${channel.id}`, {
      method: "DELETE",
    });
    await loadOverview();
  };

  const testChannel = async (channel: NotificationChannelDto) => {
    const response = await fetch(
      `/api/notifications/channels/${channel.id}/test`,
      { method: "POST" },
    );
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Test failed");
    await loadOverview();
  };

  const runDispatch = async () => {
    setRunning(true);
    setStatus("");
    try {
      const response = await fetch("/api/notifications/dispatch", {
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Dispatch failed");
      setStatus(`Dispatch sent ${body.data.deliveries_sent} notification(s)`);
      await loadOverview();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Dispatch failed");
    } finally {
      setRunning(false);
    }
  };

  const setupEncryption = async () => {
    setSettingUpEncryption(true);
    setStatus("");
    try {
      const response = await fetch("/api/notifications/encryption-key", {
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Failed to set up encryption");
      }
      setStatus(
        body.data?.generated
          ? "Notification encryption set up and stored"
          : "Notification encryption is already ready",
      );
      await loadOverview();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setSettingUpEncryption(false);
    }
  };

  if (loading) {
    return (
      <section className="space-y-4" aria-label="Notifications">
        <SkeletonBlock className="h-28 rounded-2xl" />
        <SkeletonBlock className="h-64 rounded-2xl" />
      </section>
    );
  }

  return (
    <section className="space-y-6" aria-label="Notifications">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-accent/20 bg-accent/10 p-2">
          <Bell className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-50">
            Notifications
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Shared delivery settings for LifeOS modules.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/20 bg-danger/10 p-4">
          <p className="text-sm text-danger">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadOverview();
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-300"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: "Global",
            value: overview.settings.enabled ? "Enabled" : "Disabled",
          },
          {
            label: "Encryption",
            value: overview.encryption_ready ? "Ready" : "Missing",
          },
          {
            label: "Delivery hour",
            value: `${overview.settings.timezone} · ${formatHour(
              overview.settings.deliveryHour,
            )}`,
          },
          { label: "Enabled channels", value: String(enabledChannels) },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
          >
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              {item.label}
            </p>
            <p className="mt-2 text-lg font-semibold text-zinc-50">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {!overview.encryption_ready && (
        <div className="rounded-2xl border border-warning/20 bg-warning/10 p-4 text-sm text-warning">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">
                  NOTIFICATION_ENCRYPTION_KEY missing
                </p>
                <p className="mt-1 text-warning/90">
                  Set up encryption once to store a generated key with this
                  LifeOS installation. It will be retained across redeploys that
                  use the same database.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={setupEncryption}
              disabled={settingUpEncryption}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-zinc-50 hover:bg-accent-hover disabled:opacity-50"
            >
              {settingUpEncryption ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Set up encryption
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <label className="flex-1 text-xs text-zinc-500">
                Timezone
                <input
                  value={overview.settings.timezone}
                  onChange={(event) =>
                    setOverview((current) => ({
                      ...current,
                      settings: {
                        ...current.settings,
                        timezone: event.target.value,
                      },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </label>
              <label className="w-full text-xs text-zinc-500 sm:w-36">
                Delivery hour
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={overview.settings.deliveryHour}
                  onChange={(event) =>
                    setOverview((current) => ({
                      ...current,
                      settings: {
                        ...current.settings,
                        deliveryHour: Number(event.target.value),
                      },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </label>
              <button
                type="button"
                disabled={savingSettings}
                onClick={() => saveSettings(overview.settings)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-zinc-50 hover:bg-accent-hover disabled:opacity-50"
              >
                {savingSettings ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Save
              </button>
              <button
                type="button"
                onClick={() =>
                  saveSettings({ enabled: !overview.settings.enabled })
                }
                className={cn(
                  "inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-medium",
                  overview.settings.enabled
                    ? "border border-danger/20 bg-danger/10 text-danger"
                    : "border border-success/20 bg-success/10 text-success",
                )}
              >
                {overview.settings.enabled ? "Disable" : "Enable"}
              </button>
            </div>
            {overview.sources.length > 0 && (
              <div className="mt-5 space-y-2">
                {overview.sources.map((source) => (
                  <div
                    key={source.module_type}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-300"
                  >
                    <span className="font-medium text-zinc-100">
                      {source.label}
                    </span>{" "}
                    {sourcePreview(source)}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-zinc-50">
                Telegram channels
              </h3>
              <button
                type="button"
                onClick={runDispatch}
                disabled={running}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-300 hover:text-accent disabled:opacity-50"
              >
                {running ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Run due notifications now
              </button>
            </div>

            <div className="space-y-3">
              {overview.channels.length === 0 ? (
                <p className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-500">
                  No Telegram channel connected yet.
                </p>
              ) : (
                overview.channels.map((channel) => (
                  <div
                    key={channel.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-zinc-100">
                          {channel.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          @{channel.config.bot_username} ·{" "}
                          {channel.config.destination_label}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => testChannel(channel)}
                          className="rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300"
                        >
                          Test
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateChannel(channel, {
                              enabled: !channel.enabled,
                            })
                          }
                          className="rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300"
                        >
                          {channel.enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${channel.name}`}
                          onClick={() => deleteChannel(channel)}
                          className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <form
          onSubmit={connectTelegram}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"
        >
          <h3 className="text-base font-semibold text-zinc-50">
            Connect Telegram
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            The bot must already be started or added to the destination chat.
          </p>
          <div className="mt-4 space-y-3">
            <label className="block text-xs text-zinc-500">
              Connection name
              <input
                value={connectionName}
                onChange={(event) => setConnectionName(event.target.value)}
                disabled={!overview.encryption_ready || connecting}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Bot token
              <input
                type="password"
                value={botToken}
                onChange={(event) => setBotToken(event.target.value)}
                disabled={!overview.encryption_ready || connecting}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Chat ID
              <input
                value={chatId}
                onChange={(event) => setChatId(event.target.value)}
                disabled={!overview.encryption_ready || connecting}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50"
              />
            </label>
            <button
              type="submit"
              disabled={
                !overview.encryption_ready ||
                connecting ||
                !connectionName ||
                !botToken ||
                !chatId
              }
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-zinc-50 hover:bg-accent-hover disabled:opacity-50"
            >
              {connecting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Connect Telegram
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <h3 className="mb-4 text-base font-semibold text-zinc-50">
          Recent activity
        </h3>
        {overview.recent_deliveries.length === 0 ? (
          <p className="text-sm text-zinc-500">No notification activity yet.</p>
        ) : (
          <div className="space-y-2">
            {overview.recent_deliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-100">
                    {delivery.message.title}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {delivery.source.module_type} · {delivery.channel.name}
                  </p>
                </div>
                <span
                  className={cn(
                    "w-fit rounded-full border px-2 py-1 text-xs font-medium",
                    statusClass(delivery.status),
                  )}
                >
                  {delivery.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p
        role="status"
        aria-live="polite"
        className="min-h-5 text-sm text-zinc-400"
      >
        {status}
      </p>
    </section>
  );
}
