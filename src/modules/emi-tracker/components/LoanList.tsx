"use client";

import { SkeletonBlock } from "@/components/ui/Skeletons";
import { cn } from "@/lib/utils";
import LoanCard from "./LoanCard";
import type { EmiLoan, ScheduleRow } from "../types";

interface LoanListProps {
  loanCards: Array<{
    loan: EmiLoan;
    outstanding: number;
    nextDue: ScheduleRow | null;
    progress: number;
  }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  decimals: number;
  numberFormat: "western" | "indian";
  loading: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

const PRESSABLE =
  "transition-all duration-200 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100";

export default function LoanList({
  loanCards,
  selectedId,
  onSelect,
  decimals,
  numberFormat,
  loading,
  emptyTitle = "No matching loans",
  emptyBody = "Try another search or show all loans.",
  emptyActionLabel = "Clear filters",
  onEmptyAction,
}: LoanListProps) {
  if (loading) {
    return (
      <div className="space-y-3" aria-label="Loading loans">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3 flex-1">
                <SkeletonBlock className="h-5 w-1/2" />
                <SkeletonBlock className="h-3 w-3/4" />
                <SkeletonBlock className="h-3 w-1/3" />
              </div>
              <SkeletonBlock className="h-8 w-20 rounded-full" />
            </div>
            <div className="mt-5 space-y-2">
              <SkeletonBlock className="h-2 w-full rounded-full" />
              <SkeletonBlock className="h-3 w-2/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (loanCards.length === 0) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-7 text-center">
        <h3 className="text-lg font-black text-zinc-100">{emptyTitle}</h3>
        <p className="mx-auto mt-2 max-w-xs text-sm text-zinc-500">
          {emptyBody}
        </p>
        {onEmptyAction && (
          <button
            type="button"
            onClick={onEmptyAction}
            className={cn(
              "mt-5 min-h-[44px] rounded-2xl bg-accent px-5 py-2 text-sm font-black text-zinc-50 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
              PRESSABLE,
            )}
          >
            {emptyActionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1">
      {loanCards.map(({ loan, outstanding, nextDue, progress }) => (
        <LoanCard
          key={loan._id}
          loan={loan}
          outstanding={outstanding}
          nextDue={nextDue}
          progress={progress}
          isSelected={selectedId === loan._id}
          onClick={onSelect}
          decimals={decimals}
          numberFormat={numberFormat}
        />
      ))}
    </div>
  );
}
