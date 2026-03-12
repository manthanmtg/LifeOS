"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Generic hook for loading/saving per-module settings to the system config.
 * Settings are stored at `systemConfig.{settingsKey}` via PUT /api/system.
 *
 * Usage:
 *   const { settings, updateSettings, saving } = useModuleSettings("blogSettings", defaults);
 */
export function useModuleSettings<T extends Record<string, unknown>>(
    settingsKey: string,
    defaults: T
) {
    const [settings, setSettings] = useState<T>(defaults);
    const [saving, setSaving] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        fetch("/api/system")
            .then((r) => r.json())
            .then((d) => {
                const stored = d.data?.[settingsKey];
                if (stored) {
                    setSettings({ ...defaults, ...stored });
                }
            })
            .catch(() => { })
            .finally(() => setLoaded(true));
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
            } catch (e) {
                console.error(`Failed to save ${settingsKey}:`, e);
            } finally {
                setTimeout(() => setSaving(false), 500);
            }
        },
        [settings, settingsKey]
    );

    return { settings, updateSettings, saving, loaded };
}
