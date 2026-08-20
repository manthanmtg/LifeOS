"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  DollarSign,
  Target,
  Globe,
  Settings as SettingsIcon,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ExpenseSettings, CURRENCIES } from "../components/types";

interface SettingsTabProps {
  settings: ExpenseSettings;
  onUpdateSettings: (updates: Partial<ExpenseSettings>) => Promise<boolean>;
}

export default function SettingsTab({
  settings,
  onUpdateSettings,
}: SettingsTabProps) {
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const handleUpdate = async (updates: Partial<ExpenseSettings>) => {
    setSaving(true);
    try {
      await onUpdateSettings(updates);
    } finally {
      setSaving(false);
    }
  };

  const addCategory = () => {
    const cat = newCategory.trim();
    if (cat && !settings.categories.includes(cat)) {
      handleUpdate({ categories: [...settings.categories, cat] });
      setNewCategory("");
    }
  };

  const removeCategory = (cat: string) => {
    if (confirm(`Remove the "${cat}" category?`)) {
      handleUpdate({
        categories: settings.categories.filter((c) => c !== cat),
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Category Management */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-zinc-50 tracking-tight flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-accent" /> Categories
              </h3>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
                Manage your classification system
              </p>
            </div>
          </div>

          <div className="flex gap-3 mb-8">
            <label htmlFor="new-expense-category" className="sr-only">
              New expense category
            </label>
            <input
              id="new-expense-category"
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              maxLength={80}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              placeholder="Add new category..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-3 text-sm text-zinc-50 focus:outline-none focus:border-accent transition-all"
            />
            <button
              onClick={addCategory}
              disabled={saving}
              className="px-6 py-3 bg-accent text-zinc-50 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-accent-hover transition-all flex items-center gap-2 shadow-lg shadow-accent/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Add
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <AnimatePresence>
              {settings.categories.map((cat) => (
                <motion.div
                  key={cat}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group flex items-center justify-between p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all"
                >
                  <span className="text-xs font-bold text-zinc-300 truncate pr-2">
                    {cat}
                  </span>
                  <button
                    onClick={() => removeCategory(cat)}
                    aria-label={`Remove category ${cat}`}
                    title={`Remove ${cat}`}
                    className="p-1.5 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-danger transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Financial Config */}
      <div className="space-y-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-8">
          <div>
            <h3 className="text-sm font-black text-zinc-50 uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
              <DollarSign className="w-4 h-4 text-accent" /> Financial Config
            </h3>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-zinc-600 block mb-2 px-1">
                  Default Currency
                </label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <select
                    value={settings.defaultCurrency}
                    onChange={(e) =>
                      handleUpdate({ defaultCurrency: e.target.value })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-zinc-50 appearance-none focus:outline-none focus:border-zinc-600 transition-all cursor-pointer"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-widest text-zinc-600 block mb-2 px-1">
                  Monthly Budget
                </label>
                <div className="relative">
                  <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="number"
                    value={settings.monthlyBudget}
                    onChange={(e) =>
                      handleUpdate({
                        monthlyBudget: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-zinc-50 focus:outline-none focus:border-zinc-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-widest text-zinc-600 block mb-2 px-1">
                  Number Formatting
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "western", label: "Western", sub: "10,000" },
                    { id: "indian", label: "Indian", sub: "10,000" }, // Wait, 10,000 is same for western/indian if tiny, but 1,00,000 is different
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() =>
                        handleUpdate({
                          numberFormat: f.id as "western" | "indian",
                        })
                      }
                      className={cn(
                        "p-4 rounded-2xl border text-center transition-all",
                        settings.numberFormat === f.id
                          ? "bg-accent/10 border-accent text-accent"
                          : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700",
                      )}
                    >
                      <p className="text-xs font-black uppercase tracking-widest mb-1">
                        {f.label}
                      </p>
                      <p className="text-xs font-bold opacity-50 tracking-tighter">
                        {f.id === "indian" ? "1,00,000" : "100,000"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {saving && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 justify-center text-accent font-black text-xs uppercase tracking-widest"
          >
            <RefreshCw className="w-3 h-3 animate-spin" /> Saving parameters...
          </motion.div>
        )}
      </div>
    </div>
  );
}
