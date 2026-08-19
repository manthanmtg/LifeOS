"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EXPENSE_SPACE_CURRENCIES } from "../constants";
import type { ExpenseSpaceCreateInput, ExpenseSpaceDocument } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (input: ExpenseSpaceCreateInput) => Promise<unknown>;
  initial?: ExpenseSpaceDocument;
}

export default function ExpenseSpaceForm({
  open,
  onClose,
  onSave,
  initial,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [numberFormat, setNumberFormat] = useState<"western" | "indian">(
    "western",
  );
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCadence, setBudgetCadence] = useState<"total" | "monthly">(
    "total",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.payload.name ?? "");
    setDescription(initial?.payload.description ?? "");
    setCurrency(initial?.payload.currency ?? "USD");
    setNumberFormat(initial?.payload.number_format ?? "western");
    setBudgetAmount(initial?.payload.budget?.amount.toString() ?? "");
    setBudgetCadence(initial?.payload.budget?.cadence ?? "total");
    setError(null);
  }, [initial, open]);

  if (!open) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const trimmedName = name.trim().replace(/\s+/g, " ");
    if (!trimmedName) {
      setError("Space name is required");
      return;
    }
    const numericBudget = budgetAmount ? Number(budgetAmount) : undefined;
    if (numericBudget !== undefined && numericBudget <= 0) {
      setError("Budget must be greater than zero");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: trimmedName,
        ...(description.trim()
          ? { description: description.trim().replace(/\s+/g, " ") }
          : {}),
        currency,
        number_format: numberFormat,
        ...(numericBudget
          ? { budget: { amount: numericBudget, cadence: budgetCadence } }
          : {}),
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save space");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-space-form-title"
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              Independent ledger
            </p>
            <h2
              id="expense-space-form-title"
              className="mt-2 text-2xl font-bold tracking-tight text-zinc-50"
            >
              {initial ? "Edit expense space" : "New expense space"}
            </h2>
            <p className="mt-1 max-w-lg text-sm leading-6 text-zinc-400">
              Give this project or life event its own currency, budget, and
              category tree.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close expense space form"
            onClick={onClose}
            className="h-11 w-11 shrink-0"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label
              htmlFor="space-name"
              className="text-sm font-medium text-zinc-200"
            >
              Name <span aria-hidden="true">*</span>
            </label>
            <input
              id="space-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              required
              autoFocus
              className="mt-2 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-50 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              placeholder="House Renovation"
            />
          </div>
          <div>
            <label
              htmlFor="space-description"
              className="text-sm font-medium text-zinc-200"
            >
              Description
            </label>
            <textarea
              id="space-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              rows={3}
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-base text-zinc-50 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              placeholder="Scope, purpose, or a note about this tracker"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="space-currency"
                className="text-sm font-medium text-zinc-200"
              >
                Currency
              </label>
              <select
                id="space-currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                {EXPENSE_SPACE_CURRENCIES.map((code) => (
                  <option key={code}>{code}</option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="space-format"
                className="text-sm font-medium text-zinc-200"
              >
                Number format
              </label>
              <select
                id="space-format"
                value={numberFormat}
                onChange={(event) =>
                  setNumberFormat(event.target.value as "western" | "indian")
                }
                className="mt-2 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                <option value="western">Western (1,000,000)</option>
                <option value="indian">Indian (10,00,000)</option>
              </select>
            </div>
          </div>

          <fieldset className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <legend className="px-1 text-sm font-semibold text-zinc-200">
              Optional budget
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="space-budget" className="text-sm text-zinc-400">
                  Amount
                </label>
                <input
                  id="space-budget"
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={budgetAmount}
                  onChange={(event) => setBudgetAmount(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-base text-zinc-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <div>
                <label
                  htmlFor="budget-cadence"
                  className="text-sm text-zinc-400"
                >
                  Cadence
                </label>
                <select
                  id="budget-cadence"
                  value={budgetCadence}
                  onChange={(event) =>
                    setBudgetCadence(event.target.value as "total" | "monthly")
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-base text-zinc-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                >
                  <option value="total">Total project budget</option>
                  <option value="monthly">Monthly budget</option>
                </select>
              </div>
            </div>
          </fieldset>

          {error && (
            <p
              role="alert"
              aria-live="assertive"
              className="rounded-xl border border-danger/30 bg-danger-muted/20 p-3 text-sm text-danger"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-11"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="h-11">
              {saving
                ? "Saving space…"
                : initial
                  ? "Save changes"
                  : "Create space"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
