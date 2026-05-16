"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import type { SnippetSettings } from "./types";

interface SnippetsSettingsProps {
  visible: boolean;
  settings: SnippetSettings;
  saving: boolean;
  configuredLanguages: readonly string[];
  onUpdate: (patch: Partial<SnippetSettings>) => void;
}

export default function SnippetsSettings({
  visible,
  settings,
  saving,
  configuredLanguages,
  onUpdate,
}: SnippetsSettingsProps) {
  const [newLang, setNewLang] = useState("");

  const addLanguage = () => {
    const normalized = newLang.trim().toLowerCase();
    if (normalized && !configuredLanguages.includes(normalized)) {
      onUpdate({ languages: [...configuredLanguages, normalized] });
      setNewLang("");
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-50">
                Snippet Settings
              </h2>
              {saving && (
                <span className="text-xs text-accent flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="settings-default-language"
                  className="block text-xs text-zinc-500 mb-1.5"
                >
                  Default Language
                </label>
                <select
                  id="settings-default-language"
                  value={settings.defaultLanguage}
                  onChange={(e) =>
                    onUpdate({ defaultLanguage: e.target.value })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  {configuredLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label
                  htmlFor="settings-show-line-numbers"
                  className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer pb-1"
                >
                  <input
                    id="settings-show-line-numbers"
                    type="checkbox"
                    checked={settings.showLineNumbers}
                    onChange={(e) =>
                      onUpdate({ showLineNumbers: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-zinc-700 accent-accent"
                  />
                  Show line numbers
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-2">
                Languages
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {configuredLanguages.map((lang) => (
                  <span
                    key={lang}
                    className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300"
                  >
                    {lang}
                    <button
                      aria-label={`Remove ${lang} language`}
                      onClick={() =>
                        onUpdate({
                          languages: configuredLanguages.filter(
                            (item) => item !== lang,
                          ),
                        })
                      }
                      className="text-zinc-500 hover:text-danger ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  id="settings-new-language"
                  type="text"
                  value={newLang}
                  onChange={(e) => setNewLang(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addLanguage();
                    }
                  }}
                  placeholder="New language"
                  aria-label="Add new language"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
                <button
                  onClick={addLanguage}
                  disabled={!newLang.trim()}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-zinc-50 rounded-lg text-sm font-medium transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
