"use client";

import { useState } from "react";
import PaymentList from "./PaymentList";
import RateAdjustmentList from "./RateAdjustmentList";
import type { EmiLoan } from "../types";
import type { ActivityView } from "../lib/emi-view-model";
import { cn } from "@/lib/utils";

interface ActivityTabProps {
  loan: EmiLoan;
  currencySymbol: string;
  decimals: number;
  numberFormat: "western" | "indian";
  isSubmitting: boolean;
  onUpdatePayments: (payments: EmiLoan["payload"]["payments"]) => Promise<void>;
  onUpdateAdjustments: (
    rateAdjustments: EmiLoan["payload"]["rate_adjustments"],
  ) => Promise<void>;
}

export default function ActivityTab({
  loan,
  currencySymbol,
  decimals,
  numberFormat,
  isSubmitting,
  onUpdatePayments,
  onUpdateAdjustments,
}: ActivityTabProps) {
  const [view, setView] = useState<ActivityView>("payments");
  const isFixed = loan.payload.interest_type === "fixed";

  return (
    <div className="space-y-5">
      <div className="inline-grid min-h-[44px] grid-cols-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-1">
        {[
          ["payments", "Payments"],
          ["rates", "Rate history"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id as ActivityView)}
            className={cn(
              "min-h-[36px] rounded-xl px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
              view === id
                ? "bg-accent text-zinc-50"
                : "text-zinc-400 hover:text-zinc-100",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "payments" ? (
        <PaymentList
          payments={loan.payload.payments}
          currencySymbol={currencySymbol}
          decimals={decimals}
          numberFormat={numberFormat}
          isSubmitting={isSubmitting}
          onAdd={async (payment) => {
            await onUpdatePayments([...loan.payload.payments, payment]);
          }}
          onDelete={async (index) => {
            const next = [...loan.payload.payments];
            next.splice(index, 1);
            await onUpdatePayments(next);
          }}
        />
      ) : isFixed ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h3 className="text-lg font-black text-zinc-100">
            Rate history is available for floating-rate loans.
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            This loan is marked fixed, so rate changes are not expected.
          </p>
        </div>
      ) : (
        <RateAdjustmentList
          adjustments={loan.payload.rate_adjustments}
          isSubmitting={isSubmitting}
          onAdd={async (adjustment) => {
            await onUpdateAdjustments([
              ...loan.payload.rate_adjustments,
              adjustment,
            ]);
          }}
          onDelete={async (index) => {
            const next = [...loan.payload.rate_adjustments];
            next.splice(index, 1);
            await onUpdateAdjustments(next);
          }}
        />
      )}
    </div>
  );
}
