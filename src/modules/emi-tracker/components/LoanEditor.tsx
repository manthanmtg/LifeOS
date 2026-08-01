"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeEmiFromFormula,
  computeSchedule,
  formatMoney,
  parseDateInputToISO,
  toDateInputValue,
  CURR_SYM,
} from "../lib/emi-utils";
import type { EmiLoan, EmiTrackerSettings } from "../types";

interface LoanEditorProps {
  onClose: () => void;
  onSubmit: (payload: EmiLoan["payload"]) => Promise<void>;
  editLoan: EmiLoan | null;
  settings: EmiTrackerSettings;
  isSaving: boolean;
  formError: string | null;
}

type Step = 0 | 1 | 2;
type FeeMode = "none" | "amount" | "percent";

function clampDueDay(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(28, Math.max(1, Math.round(value)));
}

function todayInputValue() {
  return toDateInputValue(new Date().toISOString());
}

function fieldClass() {
  return "mt-2 min-h-[44px] w-full rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-base text-zinc-100 outline-none transition-all duration-200 ease-out placeholder:text-zinc-600 focus:border-accent/60 focus:ring-2 focus:ring-accent/20 md:text-sm motion-reduce:transition-none";
}

function pressableClass() {
  return "transition-all duration-200 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100";
}

export default function LoanEditor({
  onClose,
  onSubmit,
  editLoan,
  settings,
  isSaving,
  formError,
}: LoanEditorProps) {
  const [step, setStep] = useState<Step>(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const payload = editLoan?.payload;
  const [title, setTitle] = useState(payload?.title ?? "");
  const [lender, setLender] = useState(payload?.lender_name ?? "");
  const [category, setCategory] = useState(
    payload?.category ?? settings.categories[0] ?? "Loan",
  );
  const [currency, setCurrency] = useState(
    payload?.currency ?? settings.defaultCurrency,
  );
  const [principal, setPrincipal] = useState(payload?.principal ?? 1000000);
  const [interestType, setInterestType] = useState(
    payload?.interest_type ?? "fixed",
  );
  const [interestRate, setInterestRate] = useState(
    payload?.annual_interest_rate ?? 9.5,
  );
  const [tenure, setTenure] = useState(payload?.tenure_months ?? 120);
  const [startDate, setStartDate] = useState(
    payload?.start_date
      ? toDateInputValue(payload.start_date)
      : todayInputValue(),
  );
  const [dueDay, setDueDay] = useState(
    payload?.due_day_of_month ?? settings.defaultDueDayOfMonth,
  );
  const [monthlyEmi, setMonthlyEmi] = useState(payload?.monthly_emi ?? 0);
  const [recastStrategy, setRecastStrategy] = useState(
    payload?.recast_strategy ?? settings.defaultRecastStrategy,
  );
  const [feeMode, setFeeMode] = useState<FeeMode>(
    payload?.processing_fee_amount
      ? "amount"
      : payload?.processing_fee_percent
        ? "percent"
        : "none",
  );
  const [feeAmount, setFeeAmount] = useState(
    payload?.processing_fee_amount ?? 0,
  );
  const [feePercent, setFeePercent] = useState(
    payload?.processing_fee_percent ?? 0,
  );
  const [feeFinanced, setFeeFinanced] = useState(
    payload?.processing_fee_financed ?? false,
  );

  const sym = CURR_SYM[currency] || `${currency} `;
  const suggestedEmi = useMemo(
    () =>
      computeEmiFromFormula(
        Number(principal),
        Number(interestRate),
        Number(tenure),
      ),
    [principal, interestRate, tenure],
  );
  const effectiveEmi =
    Number(monthlyEmi) > 0 ? Number(monthlyEmi) : suggestedEmi;
  const summary = useMemo(() => {
    const result = computeSchedule(
      {
        title: title || "Loan",
        lender_name: lender || undefined,
        category,
        currency,
        principal: Number(principal),
        tenure_months: Number(tenure),
        interest_type: interestType,
        annual_interest_rate: Number(interestRate),
        monthly_emi: effectiveEmi,
        processing_fee_amount:
          feeMode === "amount" ? Number(feeAmount) : undefined,
        processing_fee_percent:
          feeMode === "percent" ? Number(feePercent) : undefined,
        processing_fee_financed: feeFinanced,
        start_date: parseDateInputToISO(startDate),
        due_day_of_month: clampDueDay(Number(dueDay)),
        recast_strategy: recastStrategy,
        rate_adjustments: payload?.rate_adjustments ?? [],
        payments: payload?.payments ?? [],
        documents: payload?.documents ?? [],
        status: payload?.status ?? "active",
        closed_at: payload?.closed_at,
      },
      settings.roundingDecimals,
    );
    return result;
  }, [
    category,
    currency,
    dueDay,
    effectiveEmi,
    feeAmount,
    feeFinanced,
    feeMode,
    feePercent,
    interestRate,
    interestType,
    lender,
    payload,
    principal,
    recastStrategy,
    settings.roundingDecimals,
    startDate,
    tenure,
    title,
  ]);

  const firstInvalidStep = () => {
    if (
      !title.trim() ||
      !category.trim() ||
      !currency.trim() ||
      Number(principal) <= 0
    ) {
      return 0;
    }
    if (
      Number(tenure) <= 0 ||
      Number(interestRate) < 0 ||
      effectiveEmi <= 0 ||
      !startDate
    ) {
      return 1;
    }
    return null;
  };

  const submit = async () => {
    const invalid = firstInvalidStep();
    if (invalid !== null) {
      setStep(invalid);
      setServerError(
        "Check the highlighted step and complete required fields.",
      );
      return;
    }
    setServerError(null);
    const nextPayload: EmiLoan["payload"] = {
      ...(payload ?? {}),
      title: title.trim(),
      lender_name: lender.trim() || undefined,
      category,
      currency: currency.trim().toUpperCase(),
      principal: Number(principal),
      tenure_months: Number(tenure),
      interest_type: interestType,
      annual_interest_rate: Number(interestRate),
      monthly_emi: effectiveEmi,
      processing_fee_amount:
        feeMode === "amount" ? Number(feeAmount) : undefined,
      processing_fee_percent:
        feeMode === "percent" ? Number(feePercent) : undefined,
      processing_fee_financed: feeMode !== "none" ? feeFinanced : false,
      start_date: parseDateInputToISO(startDate),
      due_day_of_month: clampDueDay(Number(dueDay)),
      recast_strategy: recastStrategy,
      rate_adjustments: payload?.rate_adjustments ?? [],
      payments: payload?.payments ?? [],
      documents: payload?.documents ?? [],
      status: payload?.status ?? "active",
      closed_at: payload?.closed_at,
    };
    await onSubmit(nextPayload);
  };

  const stepTitles = ["Loan", "Terms", "Review"] as const;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (step < 2) setStep((step + 1) as Step);
          else void submit();
        }}
        className="space-y-6"
      >
        <div className="flex gap-2" aria-label="Loan editor steps">
          {stepTitles.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(index as Step)}
              className={cn(
                "min-h-[44px] flex-1 rounded-lg border px-3 py-2 text-sm font-bold transition-colors",
                pressableClass(),
                step === index
                  ? "border-accent/30 bg-accent/10 text-accent"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-400",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {(serverError || formError) && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/10 p-4 text-danger"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm font-semibold">{serverError ?? formError}</p>
          </div>
        )}

        {step === 0 && (
          <section className="space-y-5">
            <div>
              <label
                htmlFor="loan-title"
                className="text-sm font-bold text-zinc-300"
              >
                Loan name
              </label>
              <input
                id="loan-title"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={fieldClass()}
                placeholder="Home loan"
              />
            </div>
            <div>
              <label
                htmlFor="loan-lender"
                className="text-sm font-bold text-zinc-300"
              >
                Lender
              </label>
              <input
                id="loan-lender"
                value={lender}
                onChange={(event) => setLender(event.target.value)}
                className={fieldClass()}
                placeholder="HDFC, SBI, Axis..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="loan-category"
                  className="text-sm font-bold text-zinc-300"
                >
                  Category
                </label>
                <select
                  id="loan-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className={fieldClass()}
                >
                  {settings.categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="loan-currency"
                  className="text-sm font-bold text-zinc-300"
                >
                  Currency
                </label>
                <input
                  id="loan-currency"
                  value={currency}
                  onChange={(event) =>
                    setCurrency(event.target.value.toUpperCase())
                  }
                  className={fieldClass()}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="loan-principal"
                className="text-sm font-bold text-zinc-300"
              >
                Principal
              </label>
              <input
                id="loan-principal"
                type="number"
                inputMode="decimal"
                min={1}
                value={principal}
                onChange={(event) => setPrincipal(Number(event.target.value))}
                className={fieldClass()}
              />
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="loan-interest-type"
                  className="text-sm font-bold text-zinc-300"
                >
                  Interest type
                </label>
                <select
                  id="loan-interest-type"
                  value={interestType}
                  onChange={(event) =>
                    setInterestType(
                      event.target.value as EmiLoan["payload"]["interest_type"],
                    )
                  }
                  className={fieldClass()}
                >
                  <option value="fixed">Fixed</option>
                  <option value="floating">Floating</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="loan-rate"
                  className="text-sm font-bold text-zinc-300"
                >
                  Annual interest rate
                </label>
                <input
                  id="loan-rate"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={interestRate}
                  onChange={(event) =>
                    setInterestRate(Number(event.target.value))
                  }
                  className={fieldClass()}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="loan-tenure"
                  className="text-sm font-bold text-zinc-300"
                >
                  Tenure in months
                </label>
                <input
                  id="loan-tenure"
                  type="number"
                  min={1}
                  value={tenure}
                  onChange={(event) => setTenure(Number(event.target.value))}
                  className={fieldClass()}
                />
              </div>
              <div>
                <label
                  htmlFor="loan-due-day"
                  className="text-sm font-bold text-zinc-300"
                >
                  Due day
                </label>
                <input
                  id="loan-due-day"
                  type="number"
                  min={1}
                  max={28}
                  value={dueDay}
                  onBlur={() => setDueDay(clampDueDay(Number(dueDay)))}
                  onChange={(event) =>
                    setDueDay(clampDueDay(Number(event.target.value)))
                  }
                  className={fieldClass()}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="loan-start-date"
                className="text-sm font-bold text-zinc-300"
              >
                Start date
              </label>
              <input
                id="loan-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className={fieldClass()}
              />
            </div>
            <div>
              <label
                htmlFor="loan-emi"
                className="text-sm font-bold text-zinc-300"
              >
                Monthly EMI
              </label>
              <input
                id="loan-emi"
                type="number"
                min={1}
                inputMode="decimal"
                value={monthlyEmi || ""}
                placeholder={Math.round(suggestedEmi).toString()}
                onChange={(event) => setMonthlyEmi(Number(event.target.value))}
                className={fieldClass()}
              />
              <button
                type="button"
                onClick={() => setMonthlyEmi(suggestedEmi)}
                className={cn(
                  "mt-3 min-h-[44px] rounded-lg border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-bold text-accent hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                  pressableClass(),
                )}
              >
                Use suggested EMI
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-5">
            <div>
              <label
                htmlFor="loan-recast"
                className="text-sm font-bold text-zinc-300"
              >
                If the rate changes
              </label>
              <select
                id="loan-recast"
                value={recastStrategy}
                onChange={(event) =>
                  setRecastStrategy(
                    event.target.value as EmiLoan["payload"]["recast_strategy"],
                  )
                }
                className={fieldClass()}
              >
                <option value="keep_emi_adjust_tenure">
                  Keep EMI, change payoff date
                </option>
                <option value="keep_tenure_adjust_emi">
                  Keep payoff date, change EMI
                </option>
              </select>
            </div>
            <div>
              <label
                htmlFor="fee-mode"
                className="text-sm font-bold text-zinc-300"
              >
                Processing fee
              </label>
              <select
                id="fee-mode"
                value={feeMode}
                onChange={(event) => setFeeMode(event.target.value as FeeMode)}
                className={fieldClass()}
              >
                <option value="none">No processing fee</option>
                <option value="amount">Amount</option>
                <option value="percent">Percent</option>
              </select>
            </div>
            {feeMode === "amount" && (
              <div>
                <label
                  htmlFor="fee-amount"
                  className="text-sm font-bold text-zinc-300"
                >
                  Processing fee amount
                </label>
                <input
                  id="fee-amount"
                  type="number"
                  min={0}
                  value={feeAmount}
                  onChange={(event) => setFeeAmount(Number(event.target.value))}
                  className={fieldClass()}
                />
              </div>
            )}
            {feeMode === "percent" && (
              <div>
                <label
                  htmlFor="fee-percent"
                  className="text-sm font-bold text-zinc-300"
                >
                  Processing fee percent
                </label>
                <input
                  id="fee-percent"
                  type="number"
                  min={0}
                  max={100}
                  value={feePercent}
                  onChange={(event) =>
                    setFeePercent(Number(event.target.value))
                  }
                  className={fieldClass()}
                />
              </div>
            )}
            {feeMode !== "none" && (
              <label className="flex min-h-[44px] items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm font-semibold text-zinc-300">
                <input
                  type="checkbox"
                  checked={feeFinanced}
                  onChange={(event) => setFeeFinanced(event.target.checked)}
                  className="h-4 w-4 accent-accent"
                />
                Processing fee is financed
              </label>
            )}
          </section>
        )}

        <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-950/95 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] backdrop-blur">
          {isSaving && (
            <p
              role="status"
              aria-live="polite"
              className="order-first flex w-full items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-sm font-bold text-accent sm:order-none sm:w-auto"
            >
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 rounded-full border-2 border-accent/25 border-t-accent motion-safe:animate-spin"
              />
              Saving loan changes…
            </p>
          )}
          <button
            type="button"
            onClick={() =>
              step === 0 ? onClose() : setStep((step - 1) as Step)
            }
            className={cn(
              "flex min-h-[44px] items-center gap-2 rounded-lg border border-zinc-800 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
              pressableClass(),
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 0 ? "Cancel" : "Back"}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className={cn(
              "flex min-h-[44px] items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-black text-zinc-50 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 disabled:opacity-50 disabled:active:scale-100",
              pressableClass(),
            )}
          >
            {step < 2 ? (
              <>
                Next <ArrowRight className="h-4 w-4" />
              </>
            ) : isSaving ? (
              "Saving…"
            ) : editLoan ? (
              "Save changes"
            ) : (
              "Add loan"
            )}
          </button>
        </div>
      </form>

      <aside className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-5 lg:sticky lg:top-4 lg:self-start">
        <div className="mb-4 flex items-center gap-2 text-success">
          <CheckCircle2 className="h-4 w-4" />
          <p className="text-xs font-bold uppercase tracking-[0.16em]">
            Live summary
          </p>
        </div>
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-zinc-500">Suggested EMI</dt>
            <dd className="font-mono text-lg font-black text-zinc-50">
              {formatMoney(
                suggestedEmi,
                sym,
                settings.roundingDecimals,
                settings.numberFormat,
              )}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Total interest</dt>
            <dd className="font-mono font-bold text-zinc-100">
              {formatMoney(
                summary.totals.total_interest,
                sym,
                settings.roundingDecimals,
                settings.numberFormat,
              )}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Total payable</dt>
            <dd className="font-mono font-bold text-zinc-100">
              {formatMoney(
                Number(principal) + summary.totals.total_interest,
                sym,
                settings.roundingDecimals,
                settings.numberFormat,
              )}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Projected payoff</dt>
            <dd className="font-mono font-bold text-zinc-100">
              {summary.rows.at(-1)?.due_date.slice(0, 10) ?? "Unavailable"}
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
