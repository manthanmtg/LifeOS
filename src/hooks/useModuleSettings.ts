"use client";

import { useState, useEffect, useCallback } from "react";

/* ---------- In-memory fetch deduplication ----------
 * When the dashboard mounts, 10+ widgets call useModuleSettings simultaneously.
 * Without dedup, each fires its own GET /api/system.  With dedup, only ONE
 * request is made and all callers share the same promise/response.
 */
let _promise: Promise<Record<string, unknown>> | null = null;
let _cacheTime = 0;
const CACHE_TTL = 5_000; // 5 seconds

function fetchSystemConfigOnce(): Promise<Record<string, unknown>> {
  const now = Date.now();
  if (_promise && now - _cacheTime < CACHE_TTL) return _promise;

  _promise = fetch("/api/system")
    .then((r) => r.json())
    .then((d) => (d.data ?? {}) as Record<string, unknown>)
    .catch(() => ({}) as Record<string, unknown>);

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
) {
  const [settings, setSettings] = useState<T>(defaults);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchSystemConfigOnce()
      .then((data) => {
        if (cancelled) return;
        const stored = data[settingsKey];
        if (stored) {
          setSettings({ ...defaults, ...(stored as Partial<T>) });
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
      setSaving(true);
      try {
        await fetch("/api/system", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [settingsKey]: merged }),
        });
        // Invalidate the shared cache so next read picks up the new data
        _resetSystemCache();
      } catch (e) {
        console.error(`Failed to save ${settingsKey}:`, e);
      } finally {
        setTimeout(() => setSaving(false), 500);
      }
    },
    [settings, settingsKey],
  );

  return { settings, updateSettings, saving, loaded };
}
