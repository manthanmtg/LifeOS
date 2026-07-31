"use client";

import { useState, useEffect, useCallback } from "react";

export interface ModuleSettingsBrowserCache<T extends Record<string, unknown>> {
  read(): Partial<T> | null;
  write(settings: T): void;
}

type SystemConfigFetchResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false };

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

  _promise = fetch("/api/system")
    .then(async (response) => {
      if ("ok" in response && !response.ok) {
        throw new Error(`Failed to load system settings: ${response.status}`);
      }

      const body: unknown = await response.json();
      if (!isRecord(body) || !("data" in body) || !isRecord(body.data)) {
        throw new Error("Malformed system settings response");
      }

      return { ok: true, data: body.data };
    })
    .catch(() => ({ ok: false }));

  _cacheTime = now;
  return _promise;
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
export function useModuleSettings<T extends Record<string, unknown>>(
  settingsKey: string,
  defaults: T,
  browserCache?: ModuleSettingsBrowserCache<T>,
) {
  const [settings, setSettings] = useState<T>(defaults);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

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
        if (!result.ok) return;

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
      } catch (e) {
        console.error(`Failed to save ${settingsKey}:`, e);
      } finally {
        setTimeout(() => setSaving(false), 500);
      }
    },
    [browserCache, settings, settingsKey],
  );

  return { settings, updateSettings, saving, loaded };
}
