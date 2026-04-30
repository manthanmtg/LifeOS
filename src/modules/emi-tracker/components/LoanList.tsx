"use client";

import { motion } from "framer-motion";
import { SkeletonBlock } from "@/components/ui/Skeletons";
import LoanCard from "./LoanCard";
import { EmiLoan, ScheduleRow } from "../types";

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
}

export default function LoanList({
  loanCards,
  selectedId,
  onSelect,
  decimals,
  numberFormat,
  loading,
}: LoanListProps) {
  if (loading) {
    return (
      <div className="space-y-3" aria-label="Loading loans">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="w-full border border-zinc-800 rounded-2xl bg-zinc-900/50 p-4 animate-pulse"
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
      <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-8 text-center shadow-lg">
        <p className="text-zinc-500 text-sm font-medium">
          No loans yet. Add your first loan to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loanCards.map(({ loan, outstanding, nextDue, progress }, i) => (
        <motion.div
          key={loan._id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <LoanCard
            loan={loan}
            outstanding={outstanding}
            nextDue={nextDue}
            progress={progress}
            isSelected={selectedId === loan._id}
            onClick={onSelect}
            decimals={decimals}
            numberFormat={numberFormat}
          />
        </motion.div>
      ))}
    </div>
  );
}
