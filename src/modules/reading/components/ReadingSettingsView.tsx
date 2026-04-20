"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { ReadingSettings, ReadingType, Priority } from "../types";

const PRIORITIES: Priority[] = ["high", "medium", "low"];

interface ReadingSettingsViewProps {
  settings: ReadingSettings;
  updateSettings: (newSettings: Partial<ReadingSettings>) => Promise<void>;
  saving: boolean;
  allTypes: ReadingType[];
}

export function ReadingSettingsView({
  settings,
  updateSettings,
  saving,
  allTypes,
}: ReadingSettingsViewProps) {
  const [newType, setNewType] = useState("");

  const handleAddType = () => {
    const normalized = newType.trim().toLowerCase();
    if (normalized && !allTypes.includes(normalized)) {
      updateSettings({ types: [...allTypes, normalized] });
      setNewType("");
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-fade-in-up space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-50">Reading Settings</h2>
        {saving && (
          <span className="text-xs text-accent flex items-center gap-1">
            <Check className="w-3 h-3" /> Saved
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="reading-default-priority"
            className="block text-xs text-zinc-500 mb-1.5"
          >
            Default Priority
          </label>
          <select
            id="reading-default-priority"
            value={settings.defaultPriority}
            onChange={(event) =>
              updateSettings({ defaultPriority: event.target.value as Priority })
            }
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {PRIORITIES.map((item) => (
              <option key={item} value={item}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="reading-default-type"
            className="block text-xs text-zinc-500 mb-1.5"
          >
            Default Type
          </label>
          <select
            id="reading-default-type"
            value={settings.defaultType}
            onChange={(event) =>
              updateSettings({ defaultType: event.target.value })
            }
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {allTypes.map((item) => (
              <option key={item} value={item}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-zinc-500 mb-2">Content Types</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {allTypes.map((item) => (
            <span
              key={item}
              className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 capitalize"
            >
              {item}
              <button
                onClick={() =>
                  updateSettings({
                    types: allTypes.filter((typeItem) => typeItem !== item),
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
            id="new-type-input"
            type="text"
            value={newType}
            onChange={(event) => setNewType(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAddType();
              }
            }}
            placeholder="New type"
            aria-label="New content type"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <button
            onClick={handleAddType}
            disabled={!newType.trim()}
            className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-zinc-50 rounded-lg text-sm font-medium transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
