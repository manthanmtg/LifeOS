"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Calculator,
    Calendar,
    Check,
    Download,
    Edit3,
    FileText,
    Link as LinkIcon,
    Percent,
    Plus,
    Printer,
    Settings,
    Trash2,
    X,
    AlertTriangle,
    UploadCloud,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { cn } from "@/lib/utils";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import { trackEvent } from "@/lib/analytics";

type InterestType = "fixed" | "floating";
type RecastStrategy = "keep_tenure_adjust_emi" | "keep_emi_adjust_tenure";

type DocType = "sanction_letter" | "noc" | "interest_certificate" | "other";
type PaymentKind = "emi" | "prepayment";
type LoanStatus = "active" | "closed" | "archived";

interface EmiLoan {
    _id: string;
    created_at: string;
    updated_at: string;
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
        rate_adjustments: Array<{ effective_date: string; annual_interest_rate: number; note?: string }>;

        payments: Array<{ date: string; amount: number; kind: PaymentKind; note?: string; receipt_url?: string }>;
        documents: Array<{ type: DocType; title: string; url: string; issued_at?: string; added_at: string }>;

        status: LoanStatus;
        closed_at?: string;
    };
}

interface EmiTrackerSettings {
    defaultCurrency: string;
    defaultDueDayOfMonth: number;
    roundingDecimals: number;
    numberFormat: "western" | "indian";
    defaultRecastStrategy: RecastStrategy;
    categories: string[];
    [key: string]: unknown;
}

const DEFAULTS: EmiTrackerSettings = {
    defaultCurrency: "INR",
    defaultDueDayOfMonth: 5,
    roundingDecimals: 2,
    numberFormat: "western",
    defaultRecastStrategy: "keep_tenure_adjust_emi",
    categories: ["Home Loan", "Car Loan", "Education Loan", "Personal Loan", "Gold Loan", "Other"],
};

const CURR_SYM: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", INR: "₹", JPY: "¥", AUD: "A$", CAD: "C$", CHF: "CHF", CNY: "¥", BRL: "R$" };

function formatNumber(num: number, format: "western" | "indian" = "western"): string {
    if (format === "indian") {
        // Indian numbering system: 1,23,45,678
        const numStr = Math.round(num).toString();
        if (numStr.length <= 3) return numStr;

        let result = "";
        let remaining = numStr;

        // Last 3 digits
        if (remaining.length > 3) {
            result = "," + remaining.slice(-3);
            remaining = remaining.slice(0, -3);
        } else {
            return remaining;
        }

        // Process in groups of 2 from right to left
        while (remaining.length > 2) {
            result = "," + remaining.slice(-2) + result;
            remaining = remaining.slice(0, -2);
        }

        result = remaining + result;
        return result;
    } else {
        // Western numbering system: 12,345,678
        return Math.round(num).toLocaleString("en-US");
    }
}

function roundTo(n: number, decimals: number) {
    const f = Math.pow(10, decimals);
    return Math.round(n * f) / f;
}

function formatMoney(amount: number, sym: string, decimals: number, numberFormat: "western" | "indian" = "western") {
    const safe = Number.isFinite(amount) ? amount : 0;
    return `${sym}${formatNumber(safe, numberFormat)}`;
}

function toDateInputValue(iso: string) {
    try {
        return new Date(iso).toISOString().slice(0, 10);
    } catch {
        return "";
    }
}

function formatIndianRupee(amount: string): string {
    const cleanAmount = amount.replace(/[^\d.]/g, '');
    if (!cleanAmount) return '';

    const parts = cleanAmount.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] ? '.' + parts[1].slice(0, 2) : '';

    if (integerPart.length <= 3) return integerPart + decimalPart;

    const lastThree = integerPart.slice(-3);
    const remaining = integerPart.slice(0, -3);
    const formattedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');

    return formattedRemaining + ',' + lastThree + decimalPart;
}

function numberToWordsIndian(num: number): string {
    if (num === 0) return 'Zero';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertLessThanOneThousand(n: number): string {
        if (n === 0) return '';
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanOneThousand(n % 100) : '');
    }

    if (num < 1000) return convertLessThanOneThousand(num);
    if (num < 100000) {
        const thousands = Math.floor(num / 1000);
        const remainder = num % 1000;
        return convertLessThanOneThousand(thousands) + ' Thousand' + (remainder ? ' ' + convertLessThanOneThousand(remainder) : '');
    }
    if (num < 10000000) {
        const lakhs = Math.floor(num / 100000);
        const remainder = num % 100000;
        return convertLessThanOneThousand(lakhs) + ' Lakh' + (remainder ? ' ' + convertLessThanOneThousand(Math.floor(remainder / 1000)) + ' Thousand' + (remainder % 1000 ? ' ' + convertLessThanOneThousand(remainder % 1000) : '') : '');
    }
    if (num < 1000000000) {
        const crores = Math.floor(num / 10000000);
        const remainder = num % 10000000;
        return convertLessThanOneThousand(crores) + ' Crore' + (remainder ? ' ' + numberToWordsIndian(remainder) : '');
    }

    const billions = Math.floor(num / 1000000000);
    const remainder = num % 1000000000;
    return convertLessThanOneThousand(billions) + ' Billion' + (remainder ? ' ' + numberToWordsIndian(remainder) : '');
}

function amountInWords(amount: string): string {
    const cleanAmount = amount.replace(/[^\d.]/g, '');
    if (!cleanAmount) return '';

    const parts = cleanAmount.split('.');
    const integerPart = parseInt(parts[0]) || 0;
    const decimalPart = parts[1] ? parseInt(parts[1].slice(0, 2)) : 0;

    let words = numberToWordsIndian(integerPart) + ' Rupees';
    if (decimalPart > 0) {
        words += ' and ' + numberToWordsIndian(decimalPart) + ' Paise';
    }

    return words;
}

function parseDateInputToISO(dateOnly: string) {
    // Matches existing patterns in the repo: new Date("YYYY-MM-DD").toISOString()
    return new Date(dateOnly).toISOString();
}

function clampDueDay(year: number, monthIndex: number, dueDay: number) {
    // We restrict to 1–28 in the schema/UI, so this is safe across all months.
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

type ScheduleRow = {
    index: number;
    due_date: string;
    opening_balance: number;
    emi: number;
    interest: number;
    principal: number;
    prepayment: number;
    closing_balance: number;
    annual_rate: number;
};

type ScheduleResult = {
    rows: ScheduleRow[];
    totals: { total_emi: number; total_interest: number; total_principal: number; total_prepayment: number };
    computed_emi_suggestion: number | null;
    warnings: string[];
};

function getLoanBasePrincipal(loan: EmiLoan["payload"]) {
    const processingFee = (loan.processing_fee_amount ?? 0) + (loan.processing_fee_percent ? (loan.processing_fee_percent / 100) * loan.principal : 0);
    const financedFee = loan.processing_fee_financed ? processingFee : 0;
    return loan.principal + financedFee;
}


function computeSchedule(loan: EmiLoan["payload"], decimals: number): ScheduleResult {
    const warnings: string[] = [];
    const sym = CURR_SYM[loan.currency] || loan.currency;

    const basePrincipal = getLoanBasePrincipal(loan);

    // EMI suggestion (formula) shown as hint; schedule uses user-provided EMI unless strategy recomputes it.
    const computedSuggestion = basePrincipal > 0 && loan.tenure_months > 0
        ? roundTo(computeEmiFromFormula(basePrincipal, loan.annual_interest_rate, loan.tenure_months), decimals)
        : null;

    const firstDue = loan.first_due_date ? new Date(loan.first_due_date) : computeFirstDueDate(loan.start_date, loan.due_day_of_month);
    const dueDay = loan.due_day_of_month;

    const adjustments = [...(loan.rate_adjustments || [])]
        .filter((a) => !!a.effective_date && Number.isFinite(a.annual_interest_rate))
        .sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime());

    const payments = [...(loan.payments || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const prepayments = payments.filter((p) => p.kind === "prepayment" && p.amount > 0);

    const getAnnualRateForDueDate = (dueDate: Date) => {
        let rate = loan.annual_interest_rate;
        for (const adj of adjustments) {
            if (new Date(adj.effective_date).getTime() <= dueDate.getTime()) {
                rate = adj.annual_interest_rate;
            } else {
                break;
            }
        }
        return rate;
    };

    const rows: ScheduleRow[] = [];
    let balance = basePrincipal;
    let totalEmi = 0;
    let totalInterest = 0;
    let totalPrincipal = 0;
    let totalPrepay = 0;

    const strategy: RecastStrategy = loan.interest_type === "floating" ? loan.recast_strategy : "keep_tenure_adjust_emi";

    const hardCapMonths = 1200;
    const plannedMonths = loan.tenure_months;

    // We allow floating strategy to recompute EMI at rate-change boundaries.
    let currentEmi = loan.monthly_emi;

    const recalcEmiIfNeeded = (monthIndex: number, dueDate: Date, currentBalance: number) => {
        if (loan.interest_type !== "floating") return;
        if (strategy !== "keep_tenure_adjust_emi") return;

        const rate = getAnnualRateForDueDate(dueDate);
        const prevRate = monthIndex === 0 ? loan.annual_interest_rate : getAnnualRateForDueDate(new Date(dueDate.getFullYear(), dueDate.getMonth() - 1, dueDay, 12));
        if (rate === prevRate) return;

        const remaining = Math.max(1, plannedMonths - monthIndex);
        currentEmi = computeEmiFromFormula(currentBalance, rate, remaining);
    };

    const maxMonths = strategy === "keep_emi_adjust_tenure" ? hardCapMonths : plannedMonths;
    let prepayCursor = 0;

    for (let i = 0; i < maxMonths && i < hardCapMonths; i++) {
        const dueDate = clampDueDay(firstDue.getFullYear(), firstDue.getMonth() + i, dueDay);

        const annualRate = getAnnualRateForDueDate(dueDate);
        const r = annualRate / 12 / 100;

        if (loan.interest_type === "floating" && strategy === "keep_tenure_adjust_emi") {
            recalcEmiIfNeeded(i, dueDate, balance);
        }

        let emi = strategy === "keep_emi_adjust_tenure" ? loan.monthly_emi : currentEmi;
        const interest = roundTo(balance * r, decimals);

        // Cap EMI if it's more than enough to clear the loan
        if (emi > balance + interest) {
            emi = roundTo(balance + interest, decimals);
        }

        // Force the final scheduled month to consume any remaining tiny balance
        if (strategy === "keep_tenure_adjust_emi" && i === maxMonths - 1) {
            emi = roundTo(balance + interest, decimals);
        }
        const principalPay = roundTo(emi - interest, decimals);

        if (emi <= interest + 1e-9) {
            warnings.push(`EMI is not sufficient to cover interest at month ${i + 1}. Schedule stopped.`);
            break;
        }

        const principalApplied = Math.min(principalPay, balance);
        let closing = roundTo(balance - principalApplied, decimals);

        let prepayRaw = 0;
        const windowStart = i === 0 ? Number.NEGATIVE_INFINITY : clampDueDay(firstDue.getFullYear(), firstDue.getMonth() + i - 1, dueDay).getTime();
        const windowEnd = dueDate.getTime();
        while (prepayCursor < prepayments.length) {
            const current = prepayments[prepayCursor];
            const paymentTime = new Date(current.date).getTime();
            if (paymentTime > windowEnd) break;
            if (paymentTime > windowStart) prepayRaw += current.amount;
            prepayCursor++;
        }

        const prepay = roundTo(prepayRaw, decimals);
        if (prepay > 0) {
            closing = roundTo(Math.max(0, closing - prepay), decimals);
        }

        rows.push({
            index: i + 1,
            due_date: dueDate.toISOString(),
            opening_balance: balance,
            emi: roundTo(emi, decimals),
            interest,
            principal: roundTo(principalApplied, decimals),
            prepayment: prepay,
            closing_balance: closing,
            annual_rate: annualRate,
        });

        totalEmi += emi;
        totalInterest += interest;
        totalPrincipal += principalApplied;
        totalPrepay += prepay;

        balance = closing;

        if (balance <= Math.pow(10, -decimals)) {
            balance = 0;
            break;
        }
    }

    if (loan.interest_type === "floating" && strategy === "keep_emi_adjust_tenure" && rows.length >= hardCapMonths) {
        warnings.push("Schedule hit safety cap. Check EMI/rate values.");
    }

    // Minor: include sym in a warning to avoid unused var if we later remove formatting.
    void sym;

    return {
        rows,
        totals: {
            total_emi: roundTo(totalEmi, decimals),
            total_interest: roundTo(totalInterest, decimals),
            total_principal: roundTo(totalPrincipal, decimals),
            total_prepayment: roundTo(totalPrepay, decimals),
        },
        computed_emi_suggestion: computedSuggestion,
        warnings,
    };
}

function downloadTextFile(filename: string, text: string, mime = "text/plain") {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function toCSV(rows: Record<string, unknown>[]) {
    if (rows.length === 0) return "";
    const headers = Object.keys(rows[0]);
    const esc = (v: unknown) => {
        const s = v === null || v === undefined ? "" : String(v);
        if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
        return s;
    };
    const lines = [headers.join(",")];
    for (const r of rows) {
        lines.push(headers.map((h) => esc(r[h])).join(","));
    }
    return lines.join("\n");
}


function getOutstandingAsOf(schedule: ScheduleRow[], asOf: Date) {
    if (schedule.length === 0) return { outstanding: 0, nextDue: null as ScheduleRow | null, lastDue: null as ScheduleRow | null };
    const next = schedule.find((r) => new Date(r.due_date).getTime() >= asOf.getTime()) || null;
    const last = [...schedule].reverse().find((r) => new Date(r.due_date).getTime() < asOf.getTime()) || null;
    const outstanding = last ? last.closing_balance : schedule[0].opening_balance;
    return { outstanding, nextDue: next, lastDue: last };
}

export default function EmiTrackerAdminView() {
    const { settings, updateSettings, saving: settingsSaving } = useModuleSettings<EmiTrackerSettings>("emiTrackerSettings", DEFAULTS);
    const sym = CURR_SYM[settings.defaultCurrency] || settings.defaultCurrency;
    const decimals = settings.roundingDecimals ?? 2;

    const [showSettings, setShowSettings] = useState(false);
    const [loans, setLoans] = useState<EmiLoan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSavingLoan, setIsSavingLoan] = useState(false);
    const [isDeletingLoanId, setIsDeletingLoanId] = useState<string | null>(null);
    const [isSubmittingAction, setIsSubmittingAction] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<"overview" | "schedule" | "payments" | "documents" | "rates">("overview");

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formError, setFormError] = useState("");

    const [title, setTitle] = useState("");
    const [lenderName, setLenderName] = useState("");
    const [category, setCategory] = useState("");
    const [currency, setCurrency] = useState(settings.defaultCurrency);
    const [principal, setPrincipal] = useState("");
    const [tenureMonths, setTenureMonths] = useState("");
    const [interestType, setInterestType] = useState<InterestType>("fixed");
    const [annualRate, setAnnualRate] = useState("");
    const [monthlyEmi, setMonthlyEmi] = useState("");
    const [processingFeeAmount, setProcessingFeeAmount] = useState("");
    const [processingFeePercent, setProcessingFeePercent] = useState("");
    const [processingFeeFinanced, setProcessingFeeFinanced] = useState(false);
    const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
    const [dueDay, setDueDay] = useState(settings.defaultDueDayOfMonth);
    const [recastStrategy, setRecastStrategy] = useState<RecastStrategy>(settings.defaultRecastStrategy);

    // Payments form
    const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
    const [payAmount, setPayAmount] = useState("");
    const [payKind, setPayKind] = useState<PaymentKind>("emi");
    const [payNote, setPayNote] = useState("");
    const [payReceipt, setPayReceipt] = useState("");

    // Documents form
    const [docType, setDocType] = useState<DocType>("sanction_letter");
    const [docTitle, setDocTitle] = useState("");
    const [docUrl, setDocUrl] = useState("");
    const [docIssuedAt, setDocIssuedAt] = useState("");
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);

    // Rate adjustments form
    const [adjDate, setAdjDate] = useState(new Date().toISOString().slice(0, 10));
    const [adjRate, setAdjRate] = useState("");
    const [adjNote, setAdjNote] = useState("");

    const fetchLoans = useCallback(async () => {
        try {
            const res = await fetch("/api/content?module_type=emi_loan");
            const d = await res.json();
            const list = (d.data || []) as EmiLoan[];
            setLoans(list);

            // Fix infinite loop: use functional update instead of direct check
            setSelectedId(prev => {
                if (!prev && list.length > 0) return list[0]._id;
                return prev;
            });
        } catch {
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLoans();
    }, [fetchLoans]);

    const selected = useMemo(() => loans.find((l) => l._id === selectedId) || null, [loans, selectedId]);

    const selectedSchedule = useMemo(() => {
        if (!selected) return null;
        return computeSchedule(selected.payload, decimals);
    }, [selected, decimals]);

    const selectedOutstanding = useMemo(() => {
        if (!selectedSchedule) return null;
        return getOutstandingAsOf(selectedSchedule.rows, new Date());
    }, [selectedSchedule]);

    const selectedProgress = useMemo(() => {
        if (!selected || !selectedSchedule) return null;
        const basePrincipal = selected.payload.principal + (selected.payload.processing_fee_financed
            ? (selected.payload.processing_fee_amount ?? 0) + (selected.payload.processing_fee_percent ? (selected.payload.processing_fee_percent / 100) * selected.payload.principal : 0)
            : 0);
        const outstanding = selectedOutstanding?.outstanding ?? basePrincipal;
        const cleared = basePrincipal > 0 ? (basePrincipal - outstanding) / basePrincipal : 0;

        const totalInterest = selectedSchedule.totals.total_interest;
        const principalTotal = selectedSchedule.totals.total_principal;
        const totalLifetime = totalInterest + principalTotal;
        const nowMs = new Date().getTime();
        const paid = selectedSchedule.rows
            .filter((r) => new Date(r.due_date).getTime() <= nowMs)
            .reduce((s, r) => s + r.emi + r.prepayment, 0);
        const clearedTotal = totalLifetime > 0 ? Math.min(1, paid / totalLifetime) : 0;

        return { clearedPrincipalPct: Math.max(0, Math.min(1, cleared)), clearedTotalPct: Math.max(0, clearedTotal), basePrincipal, totalLifetime, paid };
    }, [selected, selectedSchedule, selectedOutstanding]);

    const resetForm = () => {
        setTitle("");
        setLenderName("");
        setCategory("");
        setCurrency(settings.defaultCurrency);
        setPrincipal("");
        setTenureMonths("");
        setInterestType("fixed");
        setAnnualRate("");
        setMonthlyEmi("");
        setProcessingFeeAmount("");
        setProcessingFeePercent("");
        setProcessingFeeFinanced(false);
        setStartDate(new Date().toISOString().slice(0, 10));
        setDueDay(settings.defaultDueDayOfMonth);
        setRecastStrategy(settings.defaultRecastStrategy);
        setEditingId(null);
        setFormError("");
        setShowForm(false);
    };

    const openCreate = () => {
        if (showForm && !editingId) {
            setShowForm(false);
            return;
        }
        resetForm();
        setShowForm(true);
    };

    const openEdit = (loan: EmiLoan) => {
        setTitle(loan.payload.title);
        setLenderName(loan.payload.lender_name || "");
        setCategory(loan.payload.category);
        setCurrency(loan.payload.currency);
        setPrincipal(String(loan.payload.principal));
        setTenureMonths(String(loan.payload.tenure_months));
        setInterestType(loan.payload.interest_type);
        setAnnualRate(String(loan.payload.annual_interest_rate));
        setMonthlyEmi(String(loan.payload.monthly_emi));
        setProcessingFeeAmount(loan.payload.processing_fee_amount !== undefined ? String(loan.payload.processing_fee_amount) : "");
        setProcessingFeePercent(loan.payload.processing_fee_percent !== undefined ? String(loan.payload.processing_fee_percent) : "");
        setProcessingFeeFinanced(loan.payload.processing_fee_financed);
        setStartDate(toDateInputValue(loan.payload.start_date));
        setDueDay(loan.payload.due_day_of_month);
        setRecastStrategy(loan.payload.recast_strategy);
        setEditingId(loan._id);
        setFormError("");
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");

        const p = parseFloat(principal);
        const n = parseInt(tenureMonths);
        const r = parseFloat(annualRate);
        const emi = parseFloat(monthlyEmi);
        const feeAmt = processingFeeAmount ? parseFloat(processingFeeAmount) : undefined;
        const feePct = processingFeePercent ? parseFloat(processingFeePercent) : undefined;

        if (!title.trim()) return setFormError("Loan title is required");
        if (!Number.isFinite(p) || p <= 0) return setFormError("Valid loan amount is required");
        if (!Number.isFinite(n) || n <= 0) return setFormError("Valid tenure (months) is required");
        if (!Number.isFinite(r) || r < 0) return setFormError("Valid interest rate is required");
        if (!Number.isFinite(emi) || emi <= 0) return setFormError("Valid monthly EMI amount is required");
        if (!category.trim()) return setFormError("Category is required");
        if (!currency || currency.length !== 3) return setFormError("Currency must be a 3-letter code");
        if (!Number.isFinite(dueDay) || dueDay < 1 || dueDay > 28) return setFormError("Due day must be between 1 and 28");
        if (!startDate) return setFormError("Start date is required");

        const existingPayload = editingId ? loans.find((l) => l._id === editingId)?.payload : null;

        const payload: EmiLoan["payload"] = {
            ...(existingPayload ?? {
                rate_adjustments: [],
                payments: [],
                documents: [],
                status: "active" as LoanStatus,
                closed_at: undefined,
            }),
            title: title.trim(),
            lender_name: lenderName.trim(),
            category: category.trim(),
            currency: currency.toUpperCase(),
            principal: roundTo(p, decimals),
            tenure_months: n,
            interest_type: interestType,
            annual_interest_rate: r,
            monthly_emi: roundTo(emi, decimals),
            processing_fee_amount: feeAmt !== undefined && Number.isFinite(feeAmt) ? roundTo(Math.max(0, feeAmt), decimals) : undefined,
            processing_fee_percent: feePct !== undefined && Number.isFinite(feePct) ? Math.max(0, feePct) : undefined,
            processing_fee_financed: processingFeeFinanced,
            start_date: parseDateInputToISO(startDate),
            due_day_of_month: dueDay,
            first_due_date: existingPayload?.first_due_date,
            recast_strategy: recastStrategy,
            rate_adjustments: existingPayload?.rate_adjustments ?? [],
            payments: existingPayload?.payments ?? [],
            documents: existingPayload?.documents ?? [],
            status: existingPayload?.status ?? "active",
            closed_at: existingPayload?.closed_at,
        };

        try {
            setIsSavingLoan(true);
            let res;
            if (editingId) {
                res = await fetch(`/api/content/${editingId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ payload }),
                });
            } else {
                res = await fetch("/api/content", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ module_type: "emi_loan", is_public: false, payload }),
                });
            }

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to save loan");
            }

            resetForm();
            await fetchLoans();

            // Track rich event
            trackEvent({
                module: "emi-tracker",
                action: editingId ? "edit_loan" : "create_loan",
                label: title.trim(),
                value: p,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred";
            setFormError(message);
        } finally {
            setIsSavingLoan(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this loan?")) return;
        try {
            setIsDeletingLoanId(id);
            const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete loan");
            if (selectedId === id) setSelectedId(null);
            await fetchLoans();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred";
            alert(message);
        } finally {
            setIsDeletingLoanId(null);
        }
    };

    const addPayment = async () => {
        if (!selected) return;
        const amt = parseFloat(payAmount);
        if (!payDate) return;
        if (!Number.isFinite(amt) || amt <= 0) return;

        const nextPayments = [
            ...(selected.payload.payments || []),
            {
                date: parseDateInputToISO(payDate),
                amount: roundTo(amt, decimals),
                kind: payKind,
                note: payNote.trim() || undefined,
                receipt_url: payReceipt.trim() || undefined,
            },
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const payload = { ...selected.payload, payments: nextPayments };
        try {
            setIsSubmittingAction(true);
            const res = await fetch(`/api/content/${selected._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload }) });
            if (!res.ok) throw new Error("Failed to add payment");
            setPayAmount("");
            setPayNote("");
            setPayReceipt("");
            await fetchLoans();

            // Track rich event
            trackEvent({
                module: "emi-tracker",
                action: "add_payment",
                label: payKind,
                value: amt,
                metadata: { loan_id: selected._id }
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred";
            alert(message);
        } finally {
            setIsSubmittingAction(false);
        }
    };

    const deletePayment = async (idx: number) => {
        if (!selected) return;
        const next = [...(selected.payload.payments || [])];
        next.splice(idx, 1);
        const payload = { ...selected.payload, payments: next };
        try {
            setIsSubmittingAction(true);
            const res = await fetch(`/api/content/${selected._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload }) });
            if (!res.ok) throw new Error("Failed to delete payment");
            await fetchLoans();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred";
            alert(message);
        } finally {
            setIsSubmittingAction(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Optional: warn if file is very large
        if (file.size > 5 * 1024 * 1024) {
            alert("File is quite large (>5MB). It may increase database size significantly. Proceeding anyway...");
        }

        setIsUploadingDoc(true);
        // Automatically set the title to the file name if it's currently empty
        if (!docTitle) {
            setDocTitle(file.name);
        }

        const reader = new FileReader();
        reader.onload = () => {
            const base64Url = reader.result as string;
            setDocUrl(base64Url);
            setIsUploadingDoc(false);
        };
        reader.onerror = () => {
            alert("Failed to read file");
            setIsUploadingDoc(false);
        };
        reader.readAsDataURL(file);
    };

    const addDocument = async () => {
        if (!selected) return;
        if (!docTitle.trim() || !docUrl.trim()) return;
        const next = [
            ...(selected.payload.documents || []),
            {
                type: docType,
                title: docTitle.trim(),
                url: docUrl.trim(),
                issued_at: docIssuedAt ? parseDateInputToISO(docIssuedAt) : undefined,
                added_at: new Date().toISOString(),
            },
        ];
        const payload = { ...selected.payload, documents: next };
        try {
            setIsSubmittingAction(true);
            const res = await fetch(`/api/content/${selected._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload }) });
            if (!res.ok) throw new Error("Failed to add document");
            setDocTitle("");
            setDocUrl("");
            setDocIssuedAt("");
            await fetchLoans();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred";
            alert(message);
        } finally {
            setIsSubmittingAction(false);
        }
    };

    const deleteDocument = async (idx: number) => {
        if (!selected) return;
        const next = [...(selected.payload.documents || [])];
        next.splice(idx, 1);
        const payload = { ...selected.payload, documents: next };
        try {
            setIsSubmittingAction(true);
            const res = await fetch(`/api/content/${selected._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload }) });
            if (!res.ok) throw new Error("Failed to delete document");
            await fetchLoans();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred";
            alert(message);
        } finally {
            setIsSubmittingAction(false);
        }
    };

    const addRateAdjustment = async () => {
        if (!selected) return;
        if (selected.payload.interest_type !== "floating") return;
        const rate = parseFloat(adjRate);
        if (!adjDate || !Number.isFinite(rate) || rate < 0) return;
        const next = [
            ...(selected.payload.rate_adjustments || []),
            { effective_date: parseDateInputToISO(adjDate), annual_interest_rate: rate, note: adjNote.trim() || undefined },
        ].sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime());
        const payload = { ...selected.payload, rate_adjustments: next };
        try {
            setIsSubmittingAction(true);
            const res = await fetch(`/api/content/${selected._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload }) });
            if (!res.ok) throw new Error("Failed to add rate adjustment");
            setAdjRate("");
            setAdjNote("");
            await fetchLoans();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred";
            alert(message);
        } finally {
            setIsSubmittingAction(false);
        }
    };

    const deleteRateAdjustment = async (idx: number) => {
        if (!selected) return;
        setIsSubmittingAction(true);
        try {
            const next = [...(selected.payload.rate_adjustments || [])];
            next.splice(idx, 1);
            const payload = { ...selected.payload, rate_adjustments: next };
            const res = await fetch(`/api/content/${selected._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payload })
            });
            if (!res.ok) throw new Error("Failed to delete rate adjustment");
            await fetchLoans();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred";
            alert(message);
        } finally {
            setIsSubmittingAction(false);
        }
    };

    const updateSelectedPayload = async (updates: Partial<EmiLoan["payload"]>) => {
        if (!selected) return;
        setIsSubmittingAction(true);
        try {
            const payload = { ...selected.payload, ...updates };
            const res = await fetch(`/api/content/${selected._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payload })
            });
            if (!res.ok) throw new Error("Failed to update loan");
            await fetchLoans();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred";
            alert(message);
        } finally {
            setIsSubmittingAction(false);
        }
    };

    const exportScheduleCSV = () => {
        if (!selected || !selectedSchedule) return;
        const rows = selectedSchedule.rows.map((r) => ({
            month: r.index,
            due_date: r.due_date.slice(0, 10),
            annual_rate: r.annual_rate,
            emi: r.emi,
            interest: r.interest,
            principal: r.principal,
            prepayment: r.prepayment,
            opening_balance: r.opening_balance,
            closing_balance: r.closing_balance,
        }));
        downloadTextFile(`emi-schedule-${selected.payload.title.replace(/\s+/g, "-").toLowerCase()}.csv`, toCSV(rows), "text/csv");
    };

    const exportPaymentsCSV = () => {
        if (!selected) return;
        const rows = (selected.payload.payments || []).map((p) => ({
            date: p.date.slice(0, 10),
            kind: p.kind,
            amount: p.amount,
            note: p.note || "",
            receipt_url: p.receipt_url || "",
        }));
        downloadTextFile(`emi-payments-${selected.payload.title.replace(/\s+/g, "-").toLowerCase()}.csv`, toCSV(rows), "text/csv");
    };

    const printReport = () => {
        if (!selected || !selectedSchedule) return;

        // Initialize jsPDF document (Portrait, millimeters, A4 size)
        const doc = new jsPDF();

        // --- Document Properties ---
        doc.setProperties({
            title: `${selected.payload.title} - EMI Schedule`,
            subject: "Amortization Schedule",
            creator: "LifeOS Financial",
        });

        // --- Custom Styling Variables ---
        const primaryColor = [37, 99, 235]; // Blue-600
        const textColor = [17, 24, 39]; // Gray-900
        const subTextColor = [107, 114, 128]; // Gray-500

        // --- Currency Safety for PDF (jsPDF standard fonts don't support Unicode symbols like ₹) ---
        const pdfSym = selected.payload.currency === "INR" ? "Rs." :
            (selected.payload.currency === "EUR" ? "EUR" :
                (selected.payload.currency === "GBP" ? "GBP" : selectedSym));

        // --- Header Section ---
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, 210, 40, "F"); // Blue header banner

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("LifeOS Financial", 14, 20);

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text("Amortization Schedule Statement", 14, 28);

        // Right side of Header
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        const titleText = selected.payload.title;
        const titleL = doc.getTextWidth(titleText);
        doc.text(titleText, 196 - titleL, 20);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const dateStr = `Generated: ${new Date().toISOString().slice(0, 10)}`;
        const dateL = doc.getTextWidth(dateStr);
        doc.text(dateStr, 196 - dateL, 28);

        // --- Loan Metadata Grid ---
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        let startY = 50;

        const drawMeta = (label: string, val: string, x: number) => {
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(subTextColor[0], subTextColor[1], subTextColor[2]);
            doc.text(label.toUpperCase(), x, startY);

            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            doc.text(val, x, startY + 6);
        };

        drawMeta("Lender", selected.payload.lender_name || "-", 14);
        drawMeta("Category", selected.payload.category, 65);
        drawMeta("Principal", formatMoney(selected.payload.principal, pdfSym, decimals, settings.numberFormat), 110);
        drawMeta("Interest Rate", `${selected.payload.annual_interest_rate}% p.a.`, 160);

        // Totals Row
        startY += 15;
        drawMeta("Scheduled EMI", formatMoney(selected.payload.monthly_emi, pdfSym, decimals, settings.numberFormat), 14);
        drawMeta("Total Principal", formatMoney(selectedSchedule.totals.total_principal, pdfSym, decimals, settings.numberFormat), 60);
        drawMeta("Total Interest", formatMoney(selectedSchedule.totals.total_interest, pdfSym, decimals, settings.numberFormat), 110);
        drawMeta("Lifetime Cost", formatMoney(selectedSchedule.totals.total_principal + selectedSchedule.totals.total_interest, pdfSym, decimals, settings.numberFormat), 160);

        startY += 12;

        // --- Data Table ---
        const tableData = selectedSchedule.rows.map(r => [
            r.index.toString(),
            r.due_date.slice(0, 10),
            `${r.annual_rate.toFixed(2)}%`,
            formatMoney(r.emi, "", decimals, settings.numberFormat),
            formatMoney(r.interest, "", decimals, settings.numberFormat),
            formatMoney(r.principal, "", decimals, settings.numberFormat),
            r.prepayment > 0 ? formatMoney(r.prepayment, "", decimals, settings.numberFormat) : "-",
            formatMoney(r.closing_balance, "", decimals, settings.numberFormat)
        ]);

        autoTable(doc, {
            startY: startY + 5,
            head: [['Mnth', 'Due Date', 'Rate', 'EMI', 'Interest', 'Principal', 'Prepay', 'Balance']],
            body: tableData,
            theme: 'striped',
            headStyles: {
                fillColor: [243, 244, 246],
                textColor: [75, 85, 99],
                fontStyle: 'bold',
                halign: 'right'
            },
            bodyStyles: {
                fontSize: 8,
                textColor: [17, 24, 39],
                halign: 'right'
            },
            columnStyles: {
                0: { halign: 'center' },
                1: { halign: 'center' }
            },
            alternateRowStyles: {
                fillColor: [249, 250, 251]
            },
            margin: { top: 40 },
        });

        // --- Output ---
        // Creates a blob URL and opens it in a new tab to trigger native PDF view
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);

        window.open(pdfUrl, "_blank");

        // Clean up URL object after a short delay
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
    };

    const quickStats = useMemo(() => {
        const now = new Date();
        const active = loans.filter((l) => l.payload.status === "active");
        const outstandingByCurrencyMap: Record<string, number> = {};
        let nearestDue: { loan: EmiLoan; row: ScheduleRow } | null = null;

        for (const l of active) {
            const sched = computeSchedule(l.payload, decimals);
            const out = getOutstandingAsOf(sched.rows, now);
            const currencyKey = l.payload.currency || settings.defaultCurrency;
            outstandingByCurrencyMap[currencyKey] = (outstandingByCurrencyMap[currencyKey] || 0) + out.outstanding;
            if (out.nextDue) {
                if (!nearestDue || new Date(out.nextDue.due_date).getTime() < new Date(nearestDue.row.due_date).getTime()) {
                    nearestDue = { loan: l, row: out.nextDue };
                }
            }
        }

        const outstandingByCurrency = Object.entries(outstandingByCurrencyMap)
            .map(([currency, amount]) => ({ currency, amount: roundTo(amount, decimals) }))
            .sort((a, b) => a.currency.localeCompare(b.currency));

        return {
            activeCount: active.length,
            outstandingByCurrency,
            nearestDue,
        };
    }, [loans, decimals, settings.defaultCurrency]);

    const loanCards = useMemo(() => {
        const now = new Date();
        return loans
            .map((l) => {
                const sched = computeSchedule(l.payload, decimals);
                const out = getOutstandingAsOf(sched.rows, now);
                const basePrincipal = getLoanBasePrincipal(l.payload);
                const pct = basePrincipal > 0 ? (basePrincipal - out.outstanding) / basePrincipal : 0;
                return { loan: l, outstanding: out.outstanding, nextDue: out.nextDue, progress: Math.max(0, Math.min(1, pct)) };
            })
            .sort((a, b) => {
                const ad = a.nextDue ? new Date(a.nextDue.due_date).getTime() : Number.POSITIVE_INFINITY;
                const bd = b.nextDue ? new Date(b.nextDue.due_date).getTime() : Number.POSITIVE_INFINITY;
                return ad - bd;
            });
    }, [loans, decimals]);

    const selectedSym = selected ? (CURR_SYM[selected.payload.currency] || selected.payload.currency) : sym;

    const computedEmiHint = useMemo(() => {
        const p = parseFloat(principal);
        const n = parseInt(tenureMonths);
        const r = parseFloat(annualRate);
        const fee = (processingFeeAmount ? parseFloat(processingFeeAmount) : 0) + (processingFeePercent ? (parseFloat(processingFeePercent) / 100) * (Number.isFinite(p) ? p : 0) : 0);
        const base = Number.isFinite(p) ? p + (processingFeeFinanced ? (Number.isFinite(fee) ? fee : 0) : 0) : 0;
        if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(n) || n <= 0 || !Number.isFinite(r) || r < 0) return null;
        return roundTo(computeEmiFromFormula(base, r, n), decimals);
    }, [principal, tenureMonths, annualRate, processingFeeAmount, processingFeePercent, processingFeeFinanced, decimals]);

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="absolute -top-12 right-0 h-36 w-36 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between relative z-10">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">EMI Tracker</h1>
                        <p className="text-zinc-400 mt-1">Track loans, schedules, and repayment progress.</p>
                    </div>
                    <div className="flex items-center gap-2 md:pt-1 md:shrink-0">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={cn(
                                "px-3 py-2.5 rounded-xl text-sm transition-colors",
                                showSettings ? "bg-accent/15 text-accent" : "bg-zinc-800 text-zinc-400 hover:text-zinc-300"
                            )}
                            aria-label="Module settings"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                        <button
                            onClick={openCreate}
                            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" /> Add Loan
                        </button>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2.5">
                        <p className="text-xs text-zinc-500">Active Loans</p>
                        <p className="text-lg font-semibold text-zinc-50">{quickStats.activeCount}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2.5">
                        <p className="text-xs text-zinc-500">Outstanding Total</p>
                        <p className="text-lg font-semibold text-zinc-50">
                            {quickStats.outstandingByCurrency.length <= 1 ? (
                                quickStats.outstandingByCurrency[0]
                                    ? formatMoney(quickStats.outstandingByCurrency[0].amount, CURR_SYM[quickStats.outstandingByCurrency[0].currency] || quickStats.outstandingByCurrency[0].currency, decimals, settings.numberFormat)
                                    : formatMoney(0, sym, decimals)
                            ) : (
                                `Mixed (${quickStats.outstandingByCurrency.length})`
                            )}
                        </p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2.5 col-span-2 md:col-span-2">
                        <p className="text-xs text-zinc-500">Nearest Due</p>
                        {quickStats.nearestDue ? (
                            <div className="flex items-center justify-between mt-1">
                                <p className="text-sm font-semibold text-zinc-300">{quickStats.nearestDue.loan.payload.title}</p>
                                <p className="text-sm text-zinc-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> {quickStats.nearestDue.row.due_date.slice(0, 10)}</p>
                            </div>
                        ) : (
                            <p className="text-lg font-semibold text-zinc-500">—</p>
                        )}
                    </div>
                </div>
            </div>

            {showSettings && (
                <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 shadow-xl animate-fade-in-up space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    <div className="relative z-10 flex items-center justify-between">
                        <h2 className="text-xl font-bold tracking-tight text-zinc-50">EMI Tracker Settings</h2>
                        {settingsSaving && <span className="text-xs text-accent flex items-center gap-1.5 font-medium"><Check className="w-4 h-4" /> Saved</span>}
                    </div>
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-950/40 p-5 rounded-xl border border-zinc-800/50">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Default Currency</label>
                            <input
                                value={settings.defaultCurrency}
                                onChange={(e) => updateSettings({ defaultCurrency: e.target.value.toUpperCase().slice(0, 3) })}
                                className="w-full bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all font-mono shadow-sm"
                            />
                            <p className="text-[11px] text-zinc-500 mt-2 font-medium">Used for new loans; each loan can override.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Number Format</label>
                            <select
                                value={settings.numberFormat}
                                onChange={(e) => updateSettings({ numberFormat: e.target.value as "western" | "indian" })}
                                className="w-full bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all shadow-sm"
                            >
                                <option value="western">Western (1,234,567)</option>
                                <option value="indian">Indian (12,34,567)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Default Due Day (1–28)</label>
                            <input
                                type="number"
                                min={1}
                                max={28}
                                value={settings.defaultDueDayOfMonth}
                                onChange={(e) => updateSettings({ defaultDueDayOfMonth: Math.max(1, Math.min(28, parseInt(e.target.value || "1"))) })}
                                className="w-full bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Rounding (decimals)</label>
                            <input
                                type="number"
                                min={0}
                                max={6}
                                value={settings.roundingDecimals}
                                onChange={(e) => updateSettings({ roundingDecimals: Math.max(0, Math.min(6, parseInt(e.target.value || "2"))) })}
                                className="w-full bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Default Floating Recast Strategy</label>
                            <select
                                value={settings.defaultRecastStrategy}
                                onChange={(e) => updateSettings({ defaultRecastStrategy: e.target.value as RecastStrategy })}
                                className="w-full bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all shadow-sm"
                            >
                                <option value="keep_tenure_adjust_emi">Keep tenure, adjust EMI</option>
                                <option value="keep_emi_adjust_tenure">Keep EMI, adjust tenure</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Categories (comma-separated)</label>
                            <input
                                value={settings.categories.join(", ")}
                                onChange={(e) => updateSettings({ categories: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                                className="w-full bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all shadow-sm"
                            />
                        </div>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 shadow-xl animate-fade-in-up relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    <div className="relative z-10 flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold tracking-tight text-zinc-50">{editingId ? "Edit Loan" : "Add Loan"}</h2>
                        <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/80 border border-zinc-700/50 rounded-xl p-2 transition-all shadow-sm">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {formError && (
                        <div className="relative z-10 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl px-4 py-3 text-sm mb-6 flex items-center gap-3">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {formError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-950/40 p-5 rounded-xl border border-zinc-800/50">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Loan Title</label>
                                <input value={title} onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Bank / Financier</label>
                                <input
                                    value={lenderName}
                                    onChange={(e) => setLenderName(e.target.value)}
                                    placeholder="e.g., HDFC / SBI / Bajaj Finance"
                                    className="w-full bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Category</label>
                                <input
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    placeholder={settings.categories[0] || "Loan"}
                                    list="emi-categories"
                                    className="w-full bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all shadow-sm"
                                />
                                <datalist id="emi-categories">
                                    {settings.categories.map((c) => <option key={c} value={c} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Currency</label>
                                <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
                                    className="w-full bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all font-mono shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Loan Amount</label>
                                <input
                                    value={formatIndianRupee(principal)}
                                    onChange={(e) => {
                                        const rawValue = e.target.value.replace(/[^\d.]/g, '');
                                        setPrincipal(rawValue);
                                    }}
                                    inputMode="decimal"
                                    placeholder="0"
                                    className="w-full bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all font-mono shadow-sm"
                                />
                                {principal && amountInWords(principal) && (
                                    <p className="text-[11px] text-zinc-500 mt-2 italic font-medium">
                                        {amountInWords(principal)}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Tenure (months)</label>
                                <input value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value)} inputMode="numeric"
                                    className="w-full bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all font-mono shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Interest Type</label>
                                <select value={interestType} onChange={(e) => setInterestType(e.target.value as InterestType)}
                                    className="w-full bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all shadow-sm">
                                    <option value="fixed">Fixed</option>
                                    <option value="floating">Floating</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Interest Rate (% p.a.)</label>
                                <input value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} inputMode="decimal"
                                    className="w-full bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all font-mono shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1.5">Monthly EMI Amount</label>
                                <input
                                    value={formatIndianRupee(monthlyEmi)}
                                    onChange={(e) => {
                                        const rawValue = e.target.value.replace(/[^\d.]/g, '');
                                        setMonthlyEmi(rawValue);
                                    }}
                                    inputMode="decimal"
                                    placeholder="0"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                />
                                {monthlyEmi && amountInWords(monthlyEmi) && (
                                    <p className="text-[11px] text-zinc-500 mt-2 italic">
                                        {amountInWords(monthlyEmi)}
                                    </p>
                                )}
                                {computedEmiHint !== null && (
                                    <p className="text-[11px] text-zinc-500 mt-2 flex items-center gap-1">
                                        <Calculator className="w-3 h-3" /> Formula EMI ≈ <span className="text-zinc-300">{formatMoney(computedEmiHint, CURR_SYM[currency] || currency, decimals, settings.numberFormat)}</span> (your EMI is used for the schedule)
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Start Date</label>
                                <div className="relative">
                                    <Calendar className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full pl-10 bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all shadow-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Due Day (1–28)</label>
                                <input type="number" min={1} max={28} value={dueDay} onChange={(e) => setDueDay(Math.max(1, Math.min(28, parseInt(e.target.value || "1"))))}
                                    className="w-full bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all font-mono shadow-sm" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Processing Fee</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <input placeholder="Amount" value={processingFeeAmount} onChange={(e) => setProcessingFeeAmount(e.target.value)} inputMode="decimal"
                                        className="w-full bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all font-mono shadow-sm" />
                                    <input placeholder="Percent" value={processingFeePercent} onChange={(e) => setProcessingFeePercent(e.target.value)} inputMode="decimal"
                                        className="w-full bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all font-mono shadow-sm" />
                                    <label className="flex items-center gap-2.5 bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer shadow-sm">
                                        <input type="checkbox" checked={processingFeeFinanced} onChange={(e) => setProcessingFeeFinanced(e.target.checked)} className="accent-accent w-4 h-4 rounded border-zinc-700 bg-zinc-900/50" />
                                        Financed
                                    </label>
                                </div>
                                <p className="text-[11px] text-zinc-500 mt-2 font-medium">If financed, fee is added to principal for schedule.</p>
                            </div>
                            {interestType === "floating" && (
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Floating Recast Strategy</label>
                                    <select value={recastStrategy} onChange={(e) => setRecastStrategy(e.target.value as RecastStrategy)}
                                        className="w-full bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all shadow-sm">
                                        <option value="keep_tenure_adjust_emi">Keep tenure, adjust EMI</option>
                                        <option value="keep_emi_adjust_tenure">Keep EMI, adjust tenure</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/80">
                            <button type="button" onClick={() => setShowForm(false)}
                                disabled={isSavingLoan}
                                className="px-6 py-3 rounded-xl text-sm font-medium bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                Cancel
                            </button>
                            <button type="submit"
                                disabled={isSavingLoan}
                                aria-label={editingId ? "Save Loan Changes" : "Create New Loan"}
                                className="bg-accent hover:bg-accent-hover text-white font-medium px-6 py-3 rounded-xl text-sm transition-all shadow-lg hover:shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                {isSavingLoan ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        {editingId ? "Saving..." : "Creating..."}
                                    </>
                                ) : (
                                    editingId ? "Save Changes" : "Create Loan"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1 space-y-4">
                    <div className="space-y-2">
                        {loading ? (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-sm text-zinc-500">Loading loans…</div>
                        ) : loanCards.length === 0 ? (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-sm text-zinc-500">No loans yet. Add your first loan.</div>
                        ) : (
                            loanCards.map(({ loan, outstanding, nextDue, progress }) => (
                                <button
                                    key={loan._id}
                                    onClick={() => { setSelectedId(loan._id); setActiveTab("overview"); }}
                                    className={cn(
                                        "w-full text-left border rounded-xl p-4 transition-all duration-200 relative overflow-hidden",
                                        selectedId === loan._id ? "bg-zinc-800/60 border-accent/80 shadow-[0_0_15px_-3px_rgba(var(--color-accent),0.15)] ring-1 ring-accent/50" : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50"
                                    )}
                                >
                                    {selectedId === loan._id && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                                    )}
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-zinc-50">{loan.payload.title}</p>
                                            <p className="text-xs text-zinc-500 mt-1">
                                                {(loan.payload.lender_name ? `${loan.payload.lender_name} · ` : "")}
                                                {loan.payload.category} · {loan.payload.interest_type === "floating" ? "Floating" : "Fixed"}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-base font-bold text-zinc-100">{formatMoney(outstanding, CURR_SYM[loan.payload.currency] || loan.payload.currency, decimals, settings.numberFormat)}</p>
                                            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mt-1">{nextDue ? `due ${nextDue.due_date.slice(0, 10)}` : "—"}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <div className="h-2 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800/50 relative">
                                            <div className="absolute inset-y-0 left-0 bg-accent transition-all duration-500 ease-out" style={{ width: `${(progress * 100).toFixed(0)}%` }}>
                                                <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', backgroundSize: '200% 100%', animation: 'shimmer 2s infinite linear' }} />
                                            </div>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
                                            <span><strong className="text-zinc-300 font-medium">{(progress * 100).toFixed(0)}%</strong> principal</span>
                                            <span><strong className="text-zinc-400 font-medium">{formatMoney(loan.payload.monthly_emi, CURR_SYM[loan.payload.currency] || loan.payload.currency, decimals)}</strong> EMI</span>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2">
                    {!selected ? (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-zinc-500">
                            Select a loan to view details.
                        </div>
                    ) : (
                        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden flex flex-col h-full ring-1 ring-white/[0.02]">
                            <div className="p-5 md:p-6 border-b border-zinc-800/80 bg-zinc-950/40 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

                                <div className="flex items-center justify-between gap-4 mb-3 relative z-10 w-full">
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={cn("w-2 h-2 rounded-full shadow-[0_0_10px]", selected.payload.status === "active" ? "bg-green-500 shadow-green-500/50" : "bg-zinc-500")} />
                                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest leading-none">{selected.payload.status}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => openEdit(selected)} aria-label="Edit Loan" title="Edit Loan" className="p-2.5 md:px-4 md:py-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all shadow-sm">
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(selected._id)}
                                            disabled={isDeletingLoanId === selected._id}
                                            aria-label="Delete Loan" title="Delete Loan"
                                            className="p-2.5 md:px-4 md:py-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all shadow-sm disabled:opacity-50">
                                            {isDeletingLoanId === selected._id ? (
                                                <div className="w-4 h-4 border-2 border-rose-400/20 border-t-rose-400 rounded-full animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="relative z-10">
                                    <h2 className="text-2xl font-bold text-zinc-50 tracking-tight">{selected.payload.title}</h2>
                                    <div className="text-sm text-zinc-400 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 leading-snug break-words max-w-full">
                                        {(selected.payload.lender_name ? <span className="text-zinc-300 font-medium shrink-0">{selected.payload.lender_name}</span> : null)}
                                        {selected.payload.lender_name && <span className="w-1 h-1 rounded-full bg-zinc-700 shrink-0" />}
                                        <span className="bg-zinc-800/80 px-2 py-0.5 rounded text-xs shrink-0">{selected.payload.category}</span>
                                        <span className="w-1 h-1 rounded-full bg-zinc-700 shrink-0" />
                                        <span className="text-accent/80 font-medium shrink-0">{selected.payload.annual_interest_rate}%</span>
                                        <span className="w-1 h-1 rounded-full bg-zinc-700 shrink-0" />
                                        <span className="text-zinc-100 font-semibold text-lg shrink-0">{formatMoney(selected.payload.monthly_emi, selectedSym, decimals, settings.numberFormat)} <span className="text-zinc-400 text-sm font-normal">/ mo</span></span>
                                    </div>
                                </div>
                            </div>

                            <div className="px-5 pt-4">
                                <div className="flex flex-wrap gap-2">
                                    {([
                                        ["overview", "Overview"],
                                        ["schedule", "Schedule"],
                                        ["payments", "Payments"],
                                        ["documents", "Documents"],
                                        ...(selected.payload.interest_type === "floating" ? [["rates", "Rate changes"]] : []),
                                    ] as Array<[typeof activeTab, string]>).map(([key, label]) => (
                                        <button
                                            key={key}
                                            onClick={() => setActiveTab(key)}
                                            className={cn(
                                                "px-3 py-2 rounded-lg text-sm transition-colors",
                                                activeTab === key ? "bg-accent/15 text-accent" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                            )}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-5 space-y-5">
                                {selectedSchedule?.warnings?.length ? (
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 rounded-xl px-4 py-3 text-sm">
                                        {selectedSchedule.warnings.map((w, i) => <div key={i}>{w}</div>)}
                                    </div>
                                ) : null}

                                {activeTab === "overview" && selectedSchedule && selectedOutstanding && selectedProgress && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/60 rounded-xl p-5 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><FileText className="w-16 h-16 text-accent" /></div>
                                                <p className="text-xs font-medium text-zinc-500 mb-1 tracking-wide uppercase">Outstanding Balance</p>
                                                <p className="text-3xl font-bold text-zinc-50 mt-1 whitespace-nowrap">{formatMoney(selectedOutstanding.outstanding, selectedSym, decimals, settings.numberFormat)}</p>
                                                <p className="text-[11px] text-zinc-500 mt-2 font-medium">As of today (Scheduled)</p>
                                            </div>
                                            <div className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/60 rounded-xl p-5 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Calendar className="w-16 h-16 text-emerald-500" /></div>
                                                <p className="text-xs font-medium text-zinc-500 mb-1 tracking-wide uppercase">Next Due Date</p>
                                                <p className="text-3xl font-bold text-zinc-50 mt-1 whitespace-nowrap">{selectedOutstanding.nextDue ? selectedOutstanding.nextDue.due_date.slice(0, 10) : "—"}</p>
                                                <p className="text-[11px] text-zinc-500 mt-2 font-medium">{selectedOutstanding.nextDue ? `Month ${selectedOutstanding.nextDue.index} / ${selected.payload.tenure_months}` : ""}</p>
                                            </div>
                                            <div className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/60 rounded-xl p-5 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Percent className="w-16 h-16 text-rose-500" /></div>
                                                <p className="text-xs font-medium text-zinc-500 mb-1 tracking-wide uppercase">Lifetime Interest</p>
                                                <p className="text-3xl font-bold text-zinc-50 mt-1 whitespace-nowrap">{formatMoney(selectedSchedule.totals.total_interest, selectedSym, decimals, settings.numberFormat)}</p>
                                                <p className="text-[11px] text-zinc-500 mt-2 font-medium">Based on current schedule</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/60 rounded-xl p-6 flex flex-col justify-center">
                                                <div className="flex items-end justify-between mb-4">
                                                    <div>
                                                        <p className="text-sm font-semibold text-zinc-50">Repayment Progress</p>
                                                        <p className="text-[11px] text-zinc-400 mt-0.5">Principal cleared over scheduled timeline</p>
                                                    </div>
                                                    <span className="text-2xl font-bold text-accent">{(selectedProgress.clearedPrincipalPct * 100).toFixed(0)}%</span>
                                                </div>
                                                <div className="h-3 rounded-full bg-zinc-900 border border-zinc-800 relative overflow-hidden shadow-inner">
                                                    <div className="absolute top-0 bottom-0 left-0 bg-accent rounded-full transition-all duration-1000 ease-out" style={{ width: `${(selectedProgress.clearedPrincipalPct * 100).toFixed(0)}%` }}>
                                                        <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', backgroundSize: '200% 100%', animation: 'shimmer 2s infinite linear' }} />
                                                    </div>
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-zinc-800/50 grid grid-cols-2 gap-y-3 gap-x-4 text-[11px] text-zinc-400">
                                                    <div>
                                                        <p className="uppercase tracking-wider text-zinc-500 mb-1">Principal Paid</p>
                                                        <p className="font-medium text-emerald-400">{formatMoney(selectedProgress.basePrincipal - selectedOutstanding.outstanding, selectedSym, decimals, settings.numberFormat)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="uppercase tracking-wider text-zinc-500 mb-1">Principal Remaining</p>
                                                        <p className="font-medium text-zinc-300">{formatMoney(selectedOutstanding.outstanding, selectedSym, decimals, settings.numberFormat)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="uppercase tracking-wider text-zinc-500 mb-1">Interest Paid</p>
                                                        <p className="font-medium text-rose-400">{formatMoney(Math.max(0, selectedProgress.paid - (selectedProgress.basePrincipal - selectedOutstanding.outstanding)), selectedSym, decimals, settings.numberFormat)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="uppercase tracking-wider text-zinc-500 mb-1">Interest Remaining</p>
                                                        <p className="font-medium text-zinc-300">{formatMoney(selectedSchedule.totals.total_interest - Math.max(0, selectedProgress.paid - (selectedProgress.basePrincipal - selectedOutstanding.outstanding)), selectedSym, decimals, settings.numberFormat)}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/60 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 flex-wrap">
                                                <div className="flex-1 min-w-[240px]">
                                                    <p className="text-sm font-semibold text-zinc-50">Cost Distribution</p>
                                                    <p className="text-[11px] text-zinc-400 mt-0.5">Lifetime breakdown based on current schedule</p>

                                                    <div className="mt-4 space-y-2">
                                                        <div className="flex items-center justify-between p-2 gap-3 rounded-lg bg-zinc-900/60 border border-zinc-800/50 shadow-sm">
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <div className="w-2.5 h-2.5 rounded bg-zinc-700/50 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" /></div>
                                                                <span className="text-xs font-medium text-zinc-300">Interest</span>
                                                            </div>
                                                            <span className="text-sm font-semibold text-zinc-100 text-right truncate">{formatMoney(selectedSchedule.totals.total_interest, selectedSym, decimals, settings.numberFormat)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between p-2 gap-3 rounded-lg bg-zinc-900/60 border border-zinc-800/50 shadow-sm">
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <div className="w-2.5 h-2.5 rounded bg-zinc-700/50 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" /></div>
                                                                <span className="text-xs font-medium text-zinc-300">Principal</span>
                                                            </div>
                                                            <span className="text-sm font-semibold text-zinc-100 text-right truncate">{formatMoney(selectedSchedule.totals.total_principal, selectedSym, decimals, settings.numberFormat)}</span>
                                                        </div>
                                                    </div>

                                                    <div className="mt-6 space-y-2">
                                                        <div className="flex justify-between text-[11px] font-medium text-zinc-400">
                                                            <span>Interest ({(selectedSchedule.totals.total_interest / (selectedSchedule.totals.total_interest + selectedSchedule.totals.total_principal) * 100 || 0).toFixed(0)}%)</span>
                                                            <span>Principal ({(selectedSchedule.totals.total_principal / (selectedSchedule.totals.total_interest + selectedSchedule.totals.total_principal) * 100 || 0).toFixed(0)}%)</span>
                                                        </div>
                                                        <div className="h-3 rounded-full bg-zinc-900 border border-zinc-800 flex overflow-hidden shadow-inner">
                                                            <div
                                                                className="h-full bg-rose-500 transition-all duration-1000 ease-out"
                                                                style={{ width: `${(selectedSchedule.totals.total_interest / (selectedSchedule.totals.total_interest + selectedSchedule.totals.total_principal) * 100 || 0).toFixed(0)}%` }}
                                                            />
                                                            <div
                                                                className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                                                                style={{ width: `${(selectedSchedule.totals.total_principal / (selectedSchedule.totals.total_interest + selectedSchedule.totals.total_principal) * 100 || 0).toFixed(0)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {activeTab === "schedule" && selectedSchedule && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="text-xs text-zinc-500 flex items-center gap-2">
                                                <FileText className="w-4 h-4" />
                                                {selectedSchedule.rows.length} rows
                                                {selectedSchedule.computed_emi_suggestion !== null && (
                                                    <span className="ml-2">
                                                        Formula EMI ≈ <span className="text-zinc-300">{formatMoney(selectedSchedule.computed_emi_suggestion, selectedSym, decimals, settings.numberFormat)}</span>
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={exportScheduleCSV} className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm flex items-center gap-2">
                                                    <Download className="w-4 h-4" /> Export CSV
                                                </button>
                                                <button onClick={printReport} className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm flex items-center gap-2">
                                                    <Printer className="w-4 h-4" /> Print / PDF
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl overflow-hidden">
                                            <div className="overflow-auto">
                                                <table className="min-w-[900px] w-full text-xs">
                                                    <thead className="bg-zinc-950/80 border-b border-zinc-800 backdrop-blur-sm">
                                                        <tr className="text-[11px] uppercase tracking-wider text-zinc-400">
                                                            <th className="text-left px-5 py-3.5 font-semibold">#</th>
                                                            <th className="text-left px-5 py-3.5 font-semibold">Due Date</th>
                                                            <th className="text-right px-5 py-3.5 font-semibold">Rate %</th>
                                                            <th className="text-right px-5 py-3.5 font-semibold">EMI</th>
                                                            <th className="text-right px-5 py-3.5 font-semibold">Interest</th>
                                                            <th className="text-right px-5 py-3.5 font-semibold">Principal</th>
                                                            <th className="text-right px-5 py-3.5 font-semibold">Prepay</th>
                                                            <th className="text-right px-5 py-3.5 font-semibold">Balance</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-zinc-800/50 bg-zinc-900/40">
                                                        {selectedSchedule.rows.map((r) => (
                                                            <tr key={r.index} className="hover:bg-accent/5 transition-colors group">
                                                                <td className="px-5 py-3 text-left font-medium text-zinc-500 group-hover:text-zinc-400">{r.index}</td>
                                                                <td className="px-5 py-3 text-left text-zinc-300">{r.due_date.slice(0, 10)}</td>
                                                                <td className="px-5 py-3 text-right font-mono text-zinc-400">{r.annual_rate.toFixed(2)}</td>
                                                                <td className="px-5 py-3 text-right font-medium text-zinc-200">{formatMoney(r.emi, selectedSym, decimals, settings.numberFormat)}</td>
                                                                <td className="px-5 py-3 text-right text-rose-400/90 font-medium">{formatMoney(r.interest, selectedSym, decimals, settings.numberFormat)}</td>
                                                                <td className="px-5 py-3 text-right text-emerald-400/90 font-medium">{formatMoney(r.principal, selectedSym, decimals, settings.numberFormat)}</td>
                                                                <td className="px-5 py-3 text-right text-zinc-400">{r.prepayment ? formatMoney(r.prepayment, selectedSym, decimals, settings.numberFormat) : "—"}</td>
                                                                <td className="px-5 py-3 text-right font-bold text-zinc-100">{formatMoney(r.closing_balance, selectedSym, decimals, settings.numberFormat)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="p-5 border-t border-zinc-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-950/50">
                                                <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                                                    <p className="text-zinc-500">Total EMI</p>
                                                    <p className="text-zinc-300 font-semibold mt-1">{formatMoney(selectedSchedule.totals.total_emi, selectedSym, decimals, settings.numberFormat)}</p>
                                                </div>
                                                <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                                                    <p className="text-zinc-500">Total Interest</p>
                                                    <p className="text-zinc-300 font-semibold mt-1">{formatMoney(selectedSchedule.totals.total_interest, selectedSym, decimals, settings.numberFormat)}</p>
                                                </div>
                                                <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                                                    <p className="text-zinc-500">Total Principal</p>
                                                    <p className="text-zinc-300 font-semibold mt-1">{formatMoney(selectedSchedule.totals.total_principal, selectedSym, decimals, settings.numberFormat)}</p>
                                                </div>
                                                <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                                                    <p className="text-zinc-500">Total Prepay</p>
                                                    <p className="text-zinc-300 font-semibold mt-1">{formatMoney(selectedSchedule.totals.total_prepayment, selectedSym, decimals, settings.numberFormat)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "payments" && selected && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <p className="text-sm font-semibold text-zinc-50">Payment History</p>
                                            <div className="flex items-center gap-2">
                                                <button onClick={exportPaymentsCSV} className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm flex items-center gap-2">
                                                    <Download className="w-4 h-4" /> Export CSV
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/60 rounded-xl p-5 shadow-sm">
                                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                                <div>
                                                    <label className="block text-[11px] text-zinc-500 mb-1.5">Date</label>
                                                    <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)}
                                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40" />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] text-zinc-500 mb-1.5">Kind</label>
                                                    <select value={payKind} onChange={(e) => setPayKind(e.target.value as PaymentKind)}
                                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40">
                                                        <option value="emi">EMI</option>
                                                        <option value="prepayment">Prepayment</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] text-zinc-500 mb-1.5">Amount</label>
                                                    <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} inputMode="decimal"
                                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-[11px] text-zinc-500 mb-1.5">Note / Receipt URL (optional)</label>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                        <input value={payNote} onChange={(e) => setPayNote(e.target.value)}
                                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40" />
                                                        <input value={payReceipt} onChange={(e) => setPayReceipt(e.target.value)} placeholder="https://..."
                                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-3">
                                                <button onClick={addPayment}
                                                    disabled={isSubmittingAction}
                                                    aria-label="Add Payment"
                                                    className="px-4 py-2.5 rounded-xl text-sm bg-accent hover:bg-accent-hover text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                                                    {isSubmittingAction ? (
                                                        <>
                                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                            Adding...
                                                        </>
                                                    ) : "Add payment"}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/60 rounded-xl shadow-sm overflow-hidden">
                                            {(selected.payload.payments || []).length === 0 ? (
                                                <div className="p-5 text-sm text-zinc-500">No payments logged yet.</div>
                                            ) : (
                                                <div className="overflow-auto">
                                                    <table className="min-w-[720px] w-full text-xs">
                                                        <thead className="bg-zinc-950/80 border-b border-zinc-800 backdrop-blur-sm">
                                                            <tr className="text-[11px] uppercase tracking-wider text-zinc-400">
                                                                <th className="text-left px-5 py-3.5 font-semibold">Date</th>
                                                                <th className="text-left px-5 py-3.5 font-semibold">Kind</th>
                                                                <th className="text-right px-5 py-3.5 font-semibold">Amount</th>
                                                                <th className="text-left px-5 py-3.5 font-semibold">Note</th>
                                                                <th className="text-left px-5 py-3.5 font-semibold">Receipt</th>
                                                                <th className="px-5 py-3.5" />
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-zinc-800/50 bg-zinc-900/40">
                                                            {(selected.payload.payments || []).map((p, idx) => (
                                                                <tr key={`${p.date}-${idx}`} className="hover:bg-accent/5 transition-colors group">
                                                                    <td className="px-5 py-3.5 text-left text-zinc-300 font-medium">{p.date.slice(0, 10)}</td>
                                                                    <td className="px-5 py-3.5 text-left">
                                                                        <span className={cn(
                                                                            "px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold border",
                                                                            p.kind === "prepayment" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-800 text-zinc-300 border-zinc-700"
                                                                        )}>
                                                                            {p.kind}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-5 py-3.5 text-right font-medium text-zinc-100">{formatMoney(p.amount, selectedSym, decimals, settings.numberFormat)}</td>
                                                                    <td className="px-5 py-3.5 text-left text-zinc-400">{p.note || "—"}</td>
                                                                    <td className="px-5 py-3.5 text-left">
                                                                        {p.receipt_url ? (
                                                                            <a href={p.receipt_url} target="_blank" rel="noreferrer" className="text-accent hover:text-accent-hover transition-colors inline-flex items-center gap-1.5 font-medium">
                                                                                <LinkIcon className="w-3.5 h-3.5" /> Open
                                                                            </a>
                                                                        ) : <span className="text-zinc-500">—</span>}
                                                                    </td>
                                                                    <td className="px-5 py-3.5 text-right">
                                                                        <button onClick={() => deletePayment(idx)}
                                                                            disabled={isSubmittingAction}
                                                                            aria-label="Delete Payment"
                                                                            className="text-zinc-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/10 disabled:opacity-50">
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === "documents" && selected && (
                                    <div className="space-y-4">
                                        <p className="text-sm font-semibold text-zinc-50">Documents</p>
                                        <div className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/60 rounded-xl p-5 shadow-sm">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                <div>
                                                    <label className="block text-[11px] text-zinc-500 mb-1.5">Type</label>
                                                    <select value={docType} onChange={(e) => setDocType(e.target.value as DocType)}
                                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40">
                                                        <option value="sanction_letter">Sanction Letter</option>
                                                        <option value="noc">NOC</option>
                                                        <option value="interest_certificate">Interest Certificate</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-[11px] text-zinc-500 mb-1.5">Title</label>
                                                    <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)}
                                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40" />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] text-zinc-500 mb-1.5">Issued at (optional)</label>
                                                    <input type="date" value={docIssuedAt} onChange={(e) => setDocIssuedAt(e.target.value)}
                                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40" />
                                                </div>
                                                <div className="md:col-span-4 mt-2">
                                                    <label className="block text-[11px] text-zinc-500 mb-1.5">Document File or URL</label>

                                                    {docUrl && docUrl.startsWith("data:") ? (
                                                        <div className="flex items-center justify-between p-3 rounded-xl border border-accent/20 bg-accent/5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
                                                                    <UploadCloud className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-zinc-200">File Selected</p>
                                                                    <p className="text-[10px] text-zinc-500 line-clamp-1 break-all">{docUrl.substring(0, 40)}...</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => setDocUrl("")}
                                                                className="text-zinc-400 hover:text-white transition-colors p-1"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            <div className="relative group cursor-pointer">
                                                                <input
                                                                    type="file"
                                                                    onChange={handleFileUpload}
                                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                                    accept="image/*,application/pdf"
                                                                />
                                                                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-700/60 rounded-xl bg-zinc-900/30 group-hover:bg-zinc-800/40 group-hover:border-accent/40 transition-all text-center">
                                                                    <UploadCloud className="w-6 h-6 text-zinc-500 group-hover:text-accent mb-2 transition-colors" />
                                                                    <p className="text-sm text-zinc-300 font-medium">Click or drag a file here</p>
                                                                    <p className="text-[11px] text-zinc-500 mt-1">PDF, PNG, JPG accepted. Saved directly to database.</p>
                                                                    {isUploadingDoc && <p className="text-[11px] text-accent mt-2 animate-pulse">Processing file...</p>}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[11px] text-zinc-500 uppercase tracking-widest font-semibold">
                                                                <div className="h-px flex-1 bg-zinc-800/60" />
                                                                <span>OR PASTE EXTERNAL URL</span>
                                                                <div className="h-px flex-1 bg-zinc-800/60" />
                                                            </div>
                                                            <input
                                                                value={docUrl}
                                                                onChange={(e) => setDocUrl(e.target.value)}
                                                                placeholder="https://drive.google.com/..."
                                                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-4">
                                                <button
                                                    onClick={addDocument}
                                                    disabled={!docTitle.trim() || !docUrl.trim() || isUploadingDoc}
                                                    className="px-5 py-2.5 rounded-xl text-sm bg-accent hover:bg-accent-hover text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    <Plus className="w-4 h-4" /> Add Document
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/60 rounded-xl shadow-sm overflow-hidden">
                                            {(selected.payload.documents || []).length === 0 ? (
                                                <div className="p-5 text-sm text-zinc-500">No documents attached yet.</div>
                                            ) : (
                                                <div className="overflow-auto">
                                                    <table className="min-w-[760px] w-full text-xs">
                                                        <thead className="bg-zinc-950/80 border-b border-zinc-800 backdrop-blur-sm">
                                                            <tr className="text-[11px] uppercase tracking-wider text-zinc-400">
                                                                <th className="text-left px-5 py-3.5 font-semibold">Type</th>
                                                                <th className="text-left px-5 py-3.5 font-semibold">Title</th>
                                                                <th className="text-left px-5 py-3.5 font-semibold">Issued</th>
                                                                <th className="text-left px-5 py-3.5 font-semibold">Link</th>
                                                                <th className="px-5 py-3.5" />
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-zinc-800/50 bg-zinc-900/40">
                                                            {(selected.payload.documents || []).map((d, idx) => (
                                                                <tr key={`${d.added_at}-${idx}`} className="hover:bg-accent/5 transition-colors group">
                                                                    <td className="px-5 py-3.5 text-left text-zinc-400 capitalize">{d.type.replace(/_/g, " ")}</td>
                                                                    <td className="px-5 py-3.5 text-left font-medium text-zinc-200">{d.title}</td>
                                                                    <td className="px-5 py-3.5 text-left text-zinc-400">{d.issued_at ? d.issued_at.slice(0, 10) : "—"}</td>
                                                                    <td className="px-5 py-3.5 text-left">
                                                                        <a href={d.url} target="_blank" rel="noreferrer" className="text-accent hover:text-accent-hover transition-colors inline-flex items-center gap-1.5 font-medium">
                                                                            <LinkIcon className="w-3.5 h-3.5" /> View
                                                                        </a>
                                                                    </td>
                                                                    <td className="px-5 py-3.5 text-right">
                                                                        <button onClick={() => deleteDocument(idx)}
                                                                            disabled={isSubmittingAction}
                                                                            aria-label="Delete Document"
                                                                            className="text-zinc-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/10 disabled:opacity-50">
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === "rates" && selected && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <p className="text-sm font-semibold text-zinc-50">Floating rate adjustments</p>
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs text-zinc-500">Recast</label>
                                                <select
                                                    value={selected.payload.recast_strategy}
                                                    onChange={(e) => updateSelectedPayload({ recast_strategy: e.target.value as RecastStrategy })}
                                                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                                >
                                                    <option value="keep_tenure_adjust_emi">Keep tenure, adjust EMI</option>
                                                    <option value="keep_emi_adjust_tenure">Keep EMI, adjust tenure</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/60 rounded-xl p-5 shadow-sm">
                                            {selected.payload.interest_type !== "floating" ? (
                                                <div className="text-sm text-zinc-500">This loan is fixed-rate.</div>
                                            ) : (
                                                <>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        <div>
                                                            <label className="block text-[11px] text-zinc-500 mb-1.5">Effective date</label>
                                                            <input type="date" value={adjDate} onChange={(e) => setAdjDate(e.target.value)}
                                                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[11px] text-zinc-500 mb-1.5">New rate (% p.a.)</label>
                                                            <input value={adjRate} onChange={(e) => setAdjRate(e.target.value)} inputMode="decimal"
                                                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[11px] text-zinc-500 mb-1.5">Note</label>
                                                            <input value={adjNote} onChange={(e) => setAdjNote(e.target.value)}
                                                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40" />
                                                        </div>
                                                    </div>
                                                    <div className="mt-3">
                                                        <button onClick={addRateAdjustment}
                                                            disabled={isSubmittingAction}
                                                            aria-label="Add Rate Adjustment"
                                                            className="px-4 py-2.5 rounded-xl text-sm bg-accent hover:bg-accent-hover text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                                                            {isSubmittingAction ? (
                                                                <>
                                                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                                    Adding...
                                                                </>
                                                            ) : "Add rate change"}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/60 rounded-xl shadow-sm overflow-hidden">
                                            {(selected.payload.rate_adjustments || []).length === 0 ? (
                                                <div className="p-5 text-sm text-zinc-500">No rate changes added yet.</div>
                                            ) : (
                                                <div className="overflow-auto">
                                                    <table className="min-w-[720px] w-full text-xs">
                                                        <thead className="bg-zinc-950/80 border-b border-zinc-800 backdrop-blur-sm">
                                                            <tr className="text-[11px] uppercase tracking-wider text-zinc-400">
                                                                <th className="text-left px-5 py-3.5 font-semibold">Effective</th>
                                                                <th className="text-right px-5 py-3.5 font-semibold">Rate%</th>
                                                                <th className="text-left px-5 py-3.5 font-semibold">Note</th>
                                                                <th className="px-5 py-3.5" />
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-zinc-800/50 bg-zinc-900/40">
                                                            {(selected.payload.rate_adjustments || []).map((a, idx) => (
                                                                <tr key={`${a.effective_date}-${idx}`} className="hover:bg-accent/5 transition-colors group">
                                                                    <td className="px-5 py-3.5 text-left text-zinc-300 font-medium">{a.effective_date.slice(0, 10)}</td>
                                                                    <td className="px-5 py-3.5 text-right font-mono text-zinc-200">{a.annual_interest_rate.toFixed(2)}</td>
                                                                    <td className="px-5 py-3.5 text-left text-zinc-400">{a.note || "—"}</td>
                                                                    <td className="px-5 py-3.5 text-right">
                                                                        <button onClick={() => deleteRateAdjustment(idx)}
                                                                            disabled={isSubmittingAction}
                                                                            aria-label="Delete Rate Adjustment"
                                                                            className="text-zinc-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/10 disabled:opacity-50">
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
