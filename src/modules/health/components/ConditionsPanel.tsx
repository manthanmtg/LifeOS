"use client";

import { Edit3, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONDITION_STATUS_CONFIG } from "./constants";
import { formatDate } from "./helpers";
import type { Condition } from "./types";

const labelCls =
  "text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-1.5";

interface ConditionsPanelProps {
  conditions: Condition[];
  onAddCondition: () => void;
  onEditCondition: (condition: Condition) => void;
  onDeleteCondition: (id: string) => void;
}

export default function ConditionsPanel({
  conditions,
  onAddCondition,
  onEditCondition,
  onDeleteCondition,
}: ConditionsPanelProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className={labelCls}>Conditions</p>
        <button
          onClick={onAddCondition}
          className="flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      {conditions.length === 0 ? (
        <p className="text-xs italic text-zinc-600">No conditions tracked</p>
      ) : (
        <div className="space-y-2">
          {conditions.map((condition) => (
            <div
              key={condition.id}
              className="group flex items-center justify-between border-b border-zinc-800 py-2 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-zinc-200">
                  {condition.name}
                </p>
                {condition.diagnosed_date && (
                  <p className="text-xs text-zinc-500">
                    Since {formatDate(condition.diagnosed_date)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider",
                    CONDITION_STATUS_CONFIG[condition.status].bg,
                    CONDITION_STATUS_CONFIG[condition.status].color,
                  )}
                >
                  {CONDITION_STATUS_CONFIG[condition.status].label}
                </span>
                <div className="flex items-center gap-1 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                  <button
                    onClick={() => onEditCondition(condition)}
                    className="rounded p-1 hover:bg-zinc-800"
                  >
                    <Edit3 className="h-3 w-3 text-zinc-500" />
                  </button>
                  <button
                    onClick={() => onDeleteCondition(condition.id)}
                    className="rounded p-1 hover:bg-danger/50"
                  >
                    <Trash2 className="h-3 w-3 text-danger" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
