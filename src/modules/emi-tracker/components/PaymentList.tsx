"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  CreditCard,
  Link as LinkIcon,
  Plus,
  Trash2,
} from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Toast from "@/components/ui/Toast";
import { formatMoney, parseDateInputToISO } from "../lib/emi-utils";
import type { EmiLoan, PaymentKind } from "../types";

interface PaymentListProps {
  payments: EmiLoan["payload"]["payments"];
  currencySymbol: string;
  decimals: number;
  numberFormat: "western" | "indian";
  onAdd: (payment: EmiLoan["payload"]["payments"][number]) => Promise<void>;
  onDelete: (index: number) => Promise<void>;
  isSubmitting: boolean;
}

export default function PaymentList({
  payments,
  currencySymbol,
  decimals,
  numberFormat,
  onAdd,
  onDelete,
  isSubmitting,
}: PaymentListProps) {
  const [payDate, setPayDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [payAmount, setPayAmount] = useState("");
  const [payKind, setPayKind] = useState<PaymentKind>("emi");
  const [payNote, setPayNote] = useState("");
  const [payReceipt, setPayReceipt] = useState("");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (!payDate || !Number.isFinite(amt) || amt <= 0) return;
    await onAdd({
      date: parseDateInputToISO(payDate),
      amount: amt,
      kind: payKind,
      note: payNote.trim() || undefined,
      receipt_url: payReceipt.trim() || undefined,
    });
    setPayAmount("");
    setPayNote("");
    setPayReceipt("");
    setToast("Payment logged");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-black text-zinc-100">Payments</h3>
            <p className="text-sm text-zinc-500">{payments.length} records</p>
          </div>
        </div>
        <form
          onSubmit={handleAdd}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <div>
            <label
              htmlFor="payment-date"
              className="text-sm font-bold text-zinc-300"
            >
              Date
            </label>
            <input
              id="payment-date"
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="mt-2 min-h-[44px] w-full rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-base text-zinc-100 outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label
              htmlFor="payment-amount"
              className="text-sm font-bold text-zinc-300"
            >
              Amount
            </label>
            <input
              id="payment-amount"
              inputMode="decimal"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="mt-2 min-h-[44px] w-full rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 font-mono text-base text-zinc-100 outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
              placeholder="0"
            />
          </div>
          <div>
            <label
              htmlFor="payment-kind"
              className="text-sm font-bold text-zinc-300"
            >
              Type
            </label>
            <select
              id="payment-kind"
              value={payKind}
              onChange={(e) => setPayKind(e.target.value as PaymentKind)}
              className="mt-2 min-h-[44px] w-full rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-base text-zinc-100 outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            >
              <option value="emi">EMI</option>
              <option value="prepayment">Prepayment</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label
              htmlFor="payment-note"
              className="text-sm font-bold text-zinc-300"
            >
              Note
            </label>
            <input
              id="payment-note"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              className="mt-2 min-h-[44px] w-full rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-base text-zinc-100 outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
              placeholder="Optional reference"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-black text-zinc-50 transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {isSubmitting ? "Saving…" : "Add payment"}
            </button>
          </div>
        </form>
      </section>

      {payments.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <h3 className="text-lg font-black text-zinc-100">No payments yet</h3>
          <p className="mt-2 text-sm text-zinc-500">
            Log EMI payments and prepayments as they happen.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p, idx) => {
            const Icon = p.kind === "prepayment" ? ArrowDownToLine : CreditCard;
            return (
              <div
                key={`${p.date}-${idx}`}
                className="flex items-start justify-between gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/55 p-4"
              >
                <div className="flex min-w-0 gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/50 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-base font-black text-zinc-50">
                        {formatMoney(
                          p.amount,
                          currencySymbol,
                          decimals,
                          numberFormat,
                        )}
                      </p>
                      <span className="rounded-full border border-zinc-700 bg-zinc-950/40 px-2 py-1 text-xs font-bold text-zinc-400">
                        {p.kind === "prepayment" ? "Prepayment" : "EMI"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      {p.date.slice(0, 10)} {p.note ? `· ${p.note}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {p.receipt_url && (
                    <a
                      href={p.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open receipt"
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-zinc-800 text-zinc-400 hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleteIndex(idx)}
                    aria-label="Delete payment"
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-danger/20 bg-danger/10 text-danger hover:bg-danger hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteIndex !== null}
        title="Delete payment?"
        description="This payment record will be removed from the loan."
        confirmLabel="Delete"
        onClose={() => setDeleteIndex(null)}
        onConfirm={() => {
          if (deleteIndex !== null) {
            void onDelete(deleteIndex).then(() => setToast("Payment deleted"));
          }
        }}
      />
      <Toast
        message={toast ?? ""}
        type="success"
        isVisible={!!toast}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
