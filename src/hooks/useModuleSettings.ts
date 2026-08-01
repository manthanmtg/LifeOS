"use client";

import { useState, useEffect, useCallback } from "react";

export interface ModuleSettingsBrowserCache<T extends object> {
  read(): Partial<T> | null;
  write(settings: T): void;
}

export interface UpdateResult {
  status: "idle" | "saving" | "success" | "error";
  message?: string;
}

type SystemConfigFetchResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

/* ---------- In-memory fetch deduplication ----------
 * When the dashboard mounts, 10+ widgets call useModuleSettings simultaneously.
 * Without dedup, each fires its own GET /api/system.  With dedup, only ONE
 * request is made and all callers share the same promise/response.
 */
let _promise: Promise<SystemConfigFetchResult> | null = null;
let _cacheTime = 0;
const CACHE_TTL = 5_000; // 5 seconds

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function fetchSystemConfigOnce(): Promise<SystemConfigFetchResult> {
  const now = Date.now();
  if (_promise && now - _cacheTime < CACHE_TTL) return _promise;

  const promise: Promise<SystemConfigFetchResult> = fetch("/api/system")
    .then(async (response) => {
      if ("ok" in response && !response.ok) {
        throw new Error(`Failed to load system settings: ${response.status}`);
      }

      const body: unknown = await response.json();
      if (!isRecord(body) || !("data" in body) || !isRecord(body.data)) {
        throw new Error("Malformed system settings response");
      }

      return { ok: true as const, data: body.data };
    })
    .catch((error) => ({
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load system settings",
    }));

  _promise = promise;
  _cacheTime = now;
  return promise;
}

/** Invalidate the shared cache (called after PUT /api/system, and in tests). */
export function _resetSystemCache() {
  _promise = null;
  _cacheTime = 0;
}

/**
 * Generic hook for loading/saving per-module settings to the system config.
 * Settings are stored at `systemConfig.{settingsKey}` via PUT /api/system.
 *
 * Usage:
 *   const { settings, updateSettings, saving } = useModuleSettings("blogSettings", defaults);
 */
export function useModuleSettings<T extends object>(
  settingsKey: string,
  defaults: T,
  browserCache?: ModuleSettingsBrowserCache<T>,
) {
  const [settings, setSettings] = useState<T>(defaults);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateResult>({
    status: "idle",
  });

  useEffect(() => {
    let cancelled = false;
    setError(null);

    try {
      const cached = browserCache?.read();
      if (cached && isRecord(cached)) {
        setSettings({ ...defaults, ...cached });
      }
    } catch {
      // Browser cache is an optional first-paint optimization.
    }

    fetchSystemConfigOnce()
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setError(result.error);
          return;
        }

        const stored = result.data[settingsKey];
        const nextSettings = isRecord(stored)
          ? { ...defaults, ...(stored as Partial<T>) }
          : defaults;

        setSettings(nextSettings);

        try {
          browserCache?.write(nextSettings);
        } catch {
          // Browser cache write failures should not affect server-backed settings.
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsKey]);

  const updateSettings = useCallback(
    async (updates: Partial<T>) => {
      setError(null);
      setUpdateResult({ status: "saving", message: "Saving module settings" });
      const merged = { ...settings, ...updates };
      setSettings(merged);
      try {
        browserCache?.write(merged);
      } catch {
        // Browser cache is best-effort and must never block saving.
      }
      setSaving(true);
      try {
        const response = await fetch("/api/system", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [settingsKey]: merged }),
        });
        if ("ok" in response && !response.ok) {
          throw new Error(`Failed to save system settings: ${response.status}`);
        }
        // Invalidate the shared cache so next read picks up the new data
        _resetSystemCache();
        setUpdateResult({ status: "success", message: "Settings saved" });
        return true;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to save system settings",
        );
        setUpdateResult({
          status: "error",
          message: "Failed to save settings",
        });
        console.error(`Failed to save ${settingsKey}:`, e);
        return false;
      } finally {
        setTimeout(() => setSaving(false), 500);
      }
    },
    [browserCache, settings, settingsKey],
  );

  return {
    settings,
    updateSettings,
    saving,
    loaded,
    error,
    updateResult,
  };
}
