"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, CalendarClock } from "lucide-react";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import WidgetCard from "@/components/dashboard/WidgetCard";
import { formatCurrency, formatNumber, type NumberFormat } from "@/lib/formatters";

type InterestType = "fixed" | "floating";
type RecastStrategy = "keep_tenure_adjust_emi" | "keep_emi_adjust_tenure";

interface EmiLoan {
    _id: string;
    payload: {
        title: string;
        lender_name?: string;
        category: string;
        currency: string;
        principal: number;
        tenure_months: number;
        interest_type: InterestType;
        annual_interest_rate: number;
        monthly_emi: number;
        processing_fee_amount?: number;
        processing_fee_percent?: number;
        processing_fee_financed: boolean;
        start_date: string;
        due_day_of_month: number;
        first_due_date?: string;
        recast_strategy: RecastStrategy;
        rate_adjustments: Array<{ effective_date: string; annual_interest_rate: number }>;
        status: "active" | "closed" | "archived";
    };
}

interface EmiTrackerWidgetSettings {
    defaultCurrency: string;
    roundingDecimals: number;
    numberFormat: NumberFormat;
    [key: string]: unknown;
}

const CURR_SYM: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", INR: "₹", JPY: "¥", AUD: "A$", CAD: "C$", CHF: "CHF", CNY: "¥", BRL: "R$" };

function roundTo(n: number, decimals: number) {
    const f = Math.pow(10, decimals);
    return Math.round(n * f) / f;
}

function clampDueDay(year: number, monthIndex: number, dueDay: number) {
    return new Date(year, monthIndex, dueDay, 12, 0, 0, 0);
}

function computeFirstDueDate(startISO: string, dueDay: number) {
    const start = new Date(startISO);
    const candidate = clampDueDay(start.getFullYear(), start.getMonth(), dueDay);
    if (candidate.getTime() >= start.getTime()) return candidate;
    return clampDueDay(start.getFullYear(), start.getMonth() + 1, dueDay);
}

function computeEmiFromFormula(principal: number, annualRate: number, months: number) {
    const r = annualRate / 12 / 100;
    if (months <= 0) return 0;
    if (r === 0) return principal / months;
    const pow = Math.pow(1 + r, months);
    return principal * (r * pow) / (pow - 1);
}

type ScheduleRowLite = { index: number; due_date: string; closing_balance: number };

function computeScheduleLite(loan: EmiLoan["payload"], decimals: number): ScheduleRowLite[] {
    const processingFee = (loan.processing_fee_amount ?? 0) + (loan.processing_fee_percent ? (loan.processing_fee_percent / 100) * loan.principal : 0);
    const financedFee = loan.processing_fee_financed ? processingFee : 0;
    const basePrincipal = loan.principal + financedFee;

    const firstDue = loan.first_due_date ? new Date(loan.first_due_date) : computeFirstDueDate(loan.start_date, loan.due_day_of_month);
    const dueDay = loan.due_day_of_month;

    const adjustments = [...(loan.rate_adjustments || [])]
        .filter((a) => !!a.effective_date && Number.isFinite(a.annual_interest_rate))
        .sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime());

    const getAnnualRateForDueDate = (dueDate: Date) => {
        let rate = loan.annual_interest_rate;
        for (const adj of adjustments) {
            if (new Date(adj.effective_date).getTime() <= dueDate.getTime()) rate = adj.annual_interest_rate;
            else break;
        }
        return rate;
    };

    const strategy: RecastStrategy = loan.interest_type === "floating" ? loan.recast_strategy : "keep_emi_adjust_tenure";

    const plannedMonths = loan.tenure_months;
    const hardCapMonths = 480;
    const maxMonths = strategy === "keep_emi_adjust_tenure" ? hardCapMonths : plannedMonths;

    let balance = basePrincipal;
    let currentEmi = loan.monthly_emi;

    const rows: ScheduleRowLite[] = [];

    for (let i = 0; i < maxMonths; i++) {
        const dueDate = clampDueDay(firstDue.getFullYear(), firstDue.getMonth() + i, dueDay);
        const annualRate = getAnnualRateForDueDate(dueDate);
        const r = annualRate / 12 / 100;

        if (loan.interest_type === "floating" && strategy === "keep_tenure_adjust_emi") {
            // If rate changed since last month, recompute EMI for remaining months
            const prevDue = clampDueDay(dueDate.getFullYear(), dueDate.getMonth() - 1, dueDay);
            const prevRate = i === 0 ? loan.annual_interest_rate : getAnnualRateForDueDate(prevDue);
            if (annualRate !== prevRate) {
                const remaining = Math.max(1, plannedMonths - i);
                currentEmi = computeEmiFromFormula(balance, annualRate, remaining);
            }
        }

        const emi = strategy === "keep_emi_adjust_tenure" ? loan.monthly_emi : currentEmi;
        const interest = roundTo(balance * r, decimals);
        if (emi <= interest + 1e-9) break;

        const principalPay = roundTo(emi - interest, decimals);
        const principalApplied = Math.min(principalPay, balance);
        const closing = roundTo(balance - principalApplied, decimals);

        rows.push({ index: i + 1, due_date: dueDate.toISOString(), closing_balance: closing });
        balance = closing;
        if (balance <= Math.pow(10, -decimals)) break;
    }

    return rows;
}

function getOutstandingAsOf(schedule: ScheduleRowLite[], startPrincipal: number, asOf: Date) {
    if (schedule.length === 0) return { outstanding: startPrincipal, nextDue: null as ScheduleRowLite | null };
    const next = schedule.find((r) => new Date(r.due_date).getTime() >= asOf.getTime()) || null;
    const last = [...schedule].reverse().find((r) => new Date(r.due_date).getTime() < asOf.getTime()) || null;
    const outstanding = last ? last.closing_balance : startPrincipal;
    return { outstanding, nextDue: next };
}

export default function EmiTrackerWidget() {
    const { settings } = useModuleSettings<EmiTrackerWidgetSettings>("emiTrackerSettings", { defaultCurrency: "INR", roundingDecimals: 2, numberFormat: "western" });
    const decimals = settings.roundingDecimals ?? 2;
    const format = settings.numberFormat || "western";
    const sym = CURR_SYM[settings.defaultCurrency] || settings.defaultCurrency || "₹";

    const [loans, setLoans] = useState<EmiLoan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/content?module_type=emi_loan")
            .then((r) => r.json())
            .then((d) => setLoans(d.data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const summary = useMemo(() => {
        const now = new Date();
        const active = loans.filter((l) => l.payload.status === "active");
        const outstandingByCurrencyMap: Record<string, number> = {};
        let nearest: { title: string; due: string } | null = null;

        for (const l of active) {
            const processingFee = (l.payload.processing_fee_amount ?? 0) + (l.payload.processing_fee_percent ? (l.payload.processing_fee_percent / 100) * l.payload.principal : 0);
            const financedFee = l.payload.processing_fee_financed ? processingFee : 0;
            const startPrincipal = l.payload.principal + financedFee;

            const sched = computeScheduleLite(l.payload, decimals);
            const { outstanding, nextDue } = getOutstandingAsOf(sched, startPrincipal, now);
            const currencyKey = l.payload.currency || settings.defaultCurrency;
            outstandingByCurrencyMap[currencyKey] = (outstandingByCurrencyMap[currencyKey] || 0) + outstanding;
            if (nextDue) {
                if (!nearest || new Date(nextDue.due_date).getTime() < new Date(nearest.due).getTime()) {
                    nearest = { title: l.payload.title, due: nextDue.due_date };
                }
            }
        }

        const outstandingByCurrency = Object.entries(outstandingByCurrencyMap)
            .map(([currency, amount]) => ({ currency, amount: roundTo(amount, decimals) }))
            .sort((a, b) => a.currency.localeCompare(b.currency));

        return {
            activeCount: active.length,
            outstandingByCurrency,
            nearest,
        };
    }, [loans, decimals, settings.defaultCurrency]);

    return (
        <WidgetCard
            title="Loan Tracker"
            icon={Calculator}
            loading={loading}
            href="/admin/emi-tracker"
            footer={
                summary.nearest && (
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        <CalendarClock className="w-3 h-3" />
                        <span className="line-clamp-1">{summary.nearest.title}</span>
                        <span className="ml-auto">{new Date(summary.nearest.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                )
            }
        >
            <div className="py-2 space-y-4">
                <div>
                    {summary.outstandingByCurrency.length <= 1 ? (
                        <p className="text-4xl font-bold text-zinc-50 tracking-tight">
                            {summary.outstandingByCurrency[0]
                                ? (
                                    <>
                                        <span className="text-zinc-500 mr-1 text-2xl font-medium">
                                            {CURR_SYM[summary.outstandingByCurrency[0].currency] || summary.outstandingByCurrency[0].currency}
                                        </span>
                                        {formatNumber(summary.outstandingByCurrency[0].amount, format)}
                                    </>
                                )
                                : (
                                    <>
                                        <span className="text-zinc-500 mr-1 text-2xl font-medium">{sym}</span>
                                        0
                                    </>
                                )}
                        </p>
                    ) : (
                        <p className="text-2xl font-bold text-zinc-50 tracking-tight">Mixed Portfolios</p>
                    )}
                    <p className="text-xs text-zinc-500 mt-1 font-medium italic">total outstanding debt · {summary.activeCount} active</p>

                    {summary.outstandingByCurrency.length > 1 && (
                        <div className="mt-3 space-y-1.5">
                            {summary.outstandingByCurrency.map((c) => (
                                <div key={c.currency} className="flex items-center justify-between px-3 py-1.5 bg-zinc-950/40 border border-zinc-800/60 rounded-lg">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{c.currency}</span>
                                    <span className="text-xs font-bold text-zinc-300">
                                        {formatCurrency(c.amount, CURR_SYM[c.currency] || c.currency, format)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </WidgetCard>
    );
}

