import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { EmiLoan, ScheduleRow, ScheduleResult, RecastStrategy } from "../types";

export const CURR_SYM: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
  CHF: "CHF",
  CNY: "¥",
  BRL: "R$",
};

function formatNumber(
  num: number,
  format: "western" | "indian" = "western",
): string {
  if (format === "indian") {
    const numStr = Math.round(num).toString();
    if (numStr.length <= 3) return numStr;

    let result = "";
    let remaining = numStr;

    if (remaining.length > 3) {
      result = "," + remaining.slice(-3);
      remaining = remaining.slice(0, -3);
    } else {
      return remaining;
    }

    while (remaining.length > 2) {
      result = "," + remaining.slice(-2) + result;
      remaining = remaining.slice(0, -2);
    }

    result = remaining + result;
    return result;
  } else {
    return Math.round(num).toLocaleString("en-US");
  }
}

export function roundTo(n: number, decimals: number) {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

export function formatMoney(
  amount: number,
  sym: string,
  decimals: number,
  numberFormat: "western" | "indian" = "western",
) {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${sym}${formatNumber(safe, numberFormat)}`;
}

export function toDateInputValue(iso: string) {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function numberToWordsIndian(num: number): string {
  if (num === 0) return "Zero";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function convertLessThanOneThousand(n: number): string {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100)
      return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return (
      ones[Math.floor(n / 100)] +
      " Hundred" +
      (n % 100 ? " " + convertLessThanOneThousand(n % 100) : "")
    );
  }

  if (num < 1000) return convertLessThanOneThousand(num);
  if (num < 100000) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    return (
      convertLessThanOneThousand(thousands) +
      " Thousand" +
      (remainder ? " " + convertLessThanOneThousand(remainder) : "")
    );
  }
  if (num < 10000000) {
    const lakhs = Math.floor(num / 100000);
    const remainder = num % 100000;
    return (
      convertLessThanOneThousand(lakhs) +
      " Lakh" +
      (remainder
        ? " " +
          convertLessThanOneThousand(Math.floor(remainder / 1000)) +
          " Thousand" +
          (remainder % 1000
            ? " " + convertLessThanOneThousand(remainder % 1000)
            : "")
        : "")
    );
  }
  if (num < 1000000000) {
    const crores = Math.floor(num / 10000000);
    const remainder = num % 10000000;
    return (
      convertLessThanOneThousand(crores) +
      " Crore" +
      (remainder ? " " + numberToWordsIndian(remainder) : "")
    );
  }

  const billions = Math.floor(num / 1000000000);
  const remainder = num % 1000000000;
  return (
    convertLessThanOneThousand(billions) +
    " Billion" +
    (remainder ? " " + numberToWordsIndian(remainder) : "")
  );
}

export function amountInWords(amount: string): string {
  const cleanAmount = amount.replace(/[^\d.]/g, "");
  if (!cleanAmount) return "";

  const parts = cleanAmount.split(".");
  const integerPart = parseInt(parts[0]) || 0;
  const decimalPart = parts[1] ? parseInt(parts[1].slice(0, 2)) : 0;

  let words = numberToWordsIndian(integerPart) + " Rupees";
  if (decimalPart > 0) {
    words += " and " + numberToWordsIndian(decimalPart) + " Paise";
  }

  return words;
}

export function parseDateInputToISO(dateOnly: string) {
  return new Date(dateOnly).toISOString();
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

export function computeEmiFromFormula(
  principal: number,
  annualRate: number,
  months: number,
) {
  const r = annualRate / 12 / 100;
  if (months <= 0) return 0;
  if (r === 0) return principal / months;
  const pow = Math.pow(1 + r, months);
  return (principal * (r * pow)) / (pow - 1);
}

function getLoanBasePrincipal(loan: EmiLoan["payload"]) {
  const processingFee =
    (loan.processing_fee_amount ?? 0) +
    (loan.processing_fee_percent
      ? (loan.processing_fee_percent / 100) * loan.principal
      : 0);
  const financedFee = loan.processing_fee_financed ? processingFee : 0;
  return loan.principal + financedFee;
}

export function computeSchedule(
  loan: EmiLoan["payload"],
  decimals: number,
): ScheduleResult {
  const warnings: string[] = [];
  const basePrincipal = getLoanBasePrincipal(loan);

  const computedSuggestion =
    basePrincipal > 0 && loan.tenure_months > 0
      ? roundTo(
          computeEmiFromFormula(
            basePrincipal,
            loan.annual_interest_rate,
            loan.tenure_months,
          ),
          decimals,
        )
      : null;

  const firstDue = loan.first_due_date
    ? new Date(loan.first_due_date)
    : computeFirstDueDate(loan.start_date, loan.due_day_of_month);
  const dueDay = loan.due_day_of_month;

  const adjustments = [...(loan.rate_adjustments || [])]
    .filter(
      (a) => !!a.effective_date && Number.isFinite(a.annual_interest_rate),
    )
    .sort(
      (a, b) =>
        new Date(a.effective_date).getTime() -
        new Date(b.effective_date).getTime(),
    );

  const payments = [...(loan.payments || [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const prepayments = payments.filter(
    (p) => p.kind === "prepayment" && p.amount > 0,
  );

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

  const strategy: RecastStrategy =
    loan.interest_type === "floating"
      ? loan.recast_strategy
      : "keep_tenure_adjust_emi";

  const hardCapMonths = 1200;
  const plannedMonths = loan.tenure_months;
  let currentEmi = loan.monthly_emi;

  const recalcEmiIfNeeded = (
    monthIndex: number,
    dueDate: Date,
    currentBalance: number,
  ) => {
    if (loan.interest_type !== "floating") return;
    if (strategy !== "keep_tenure_adjust_emi") return;

    const rate = getAnnualRateForDueDate(dueDate);
    const prevRate =
      monthIndex === 0
        ? loan.annual_interest_rate
        : getAnnualRateForDueDate(
            new Date(dueDate.getFullYear(), dueDate.getMonth() - 1, dueDay, 12),
          );
    if (rate === prevRate) return;

    const remaining = Math.max(1, plannedMonths - monthIndex);
    currentEmi = computeEmiFromFormula(currentBalance, rate, remaining);
  };

  const maxMonths =
    strategy === "keep_emi_adjust_tenure" ? hardCapMonths : plannedMonths;
  let prepayCursor = 0;

  for (let i = 0; i < maxMonths && i < hardCapMonths; i++) {
    const dueDate = clampDueDay(
      firstDue.getFullYear(),
      firstDue.getMonth() + i,
      dueDay,
    );

    const annualRate = getAnnualRateForDueDate(dueDate);
    const r = annualRate / 12 / 100;

    if (
      loan.interest_type === "floating" &&
      strategy === "keep_tenure_adjust_emi"
    ) {
      recalcEmiIfNeeded(i, dueDate, balance);
    }

    let emi =
      strategy === "keep_emi_adjust_tenure" ? loan.monthly_emi : currentEmi;
    const interest = roundTo(balance * r, decimals);

    if (emi > balance + interest) {
      emi = roundTo(balance + interest, decimals);
    }

    if (strategy === "keep_tenure_adjust_emi" && i === maxMonths - 1) {
      emi = roundTo(balance + interest, decimals);
    }
    const principalPay = roundTo(emi - interest, decimals);

    if (emi <= interest + 1e-9) {
      warnings.push(
        `EMI is not sufficient to cover interest at month ${i + 1}. Schedule stopped.`,
      );
      break;
    }

    const principalApplied = Math.min(principalPay, balance);
    let closing = roundTo(balance - principalApplied, decimals);

    let prepayRaw = 0;
    const windowStart =
      i === 0
        ? Number.NEGATIVE_INFINITY
        : clampDueDay(
            firstDue.getFullYear(),
            firstDue.getMonth() + i - 1,
            dueDay,
          ).getTime();
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

export function getOutstandingAsOf(schedule: ScheduleRow[], asOf: Date) {
  if (schedule.length === 0)
    return {
      outstanding: 0,
      nextDue: null as ScheduleRow | null,
      lastDue: null as ScheduleRow | null,
    };
  const next =
    schedule.find((r) => new Date(r.due_date).getTime() >= asOf.getTime()) ||
    null;
  const last =
    [...schedule]
      .reverse()
      .find((r) => new Date(r.due_date).getTime() < asOf.getTime()) || null;
  const outstanding = last ? last.closing_balance : schedule[0].opening_balance;
  return { outstanding, nextDue: next, lastDue: last };
}

export function toCSV(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    if (s.includes('"') || s.includes(",") || s.includes("\n"))
      return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => esc(r[h])).join(","));
  }
  return lines.join("\n");
}

export function downloadTextFile(
  filename: string,
  text: string,
  mime = "text/plain",
) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function calculateInterestSaved(
  schedule: ScheduleRow[],
  originalInterest: number,
) {
  const currentTotalInterest = schedule.reduce(
    (sum, row) => sum + row.interest,
    0,
  );
  return Math.max(0, originalInterest - currentTotalInterest);
}

export function calculateQuickStats(
  loans: EmiLoan[],
  now: Date,
  decimals: number,
) {
  const active = loans.filter((l) => l.payload.status === "active");
  const currencies: Record<string, number> = {};
  let nearest: { loan: EmiLoan; row: ScheduleRow } | null = null;

  active.forEach((l) => {
    const schedule = computeSchedule(l.payload, decimals);
    const { outstanding, nextDue } = getOutstandingAsOf(schedule.rows, now);
    currencies[l.payload.currency] =
      (currencies[l.payload.currency] || 0) + outstanding;

    if (nextDue) {
      if (
        !nearest ||
        new Date(nextDue.due_date).getTime() <
          new Date(nearest.row.due_date).getTime()
      ) {
        nearest = { loan: l, row: nextDue };
      }
    }
  });

  return {
    activeCount: active.length,
    outstandingByCurrency: Object.entries(currencies).map(
      ([currency, amount]) => ({
        currency,
        amount,
      }),
    ),
    nearestDue: nearest,
  };
}

export function calculateTotalInterestSavedAcrossAll(
  loans: EmiLoan[],
  decimals: number,
) {
  return loans.reduce((acc, loan) => {
    const schedule = computeSchedule(loan.payload, decimals);
    const originalPayload = {
      ...loan.payload,
      payments: loan.payload.payments.filter((p) => p.kind !== "prepayment"),
    };
    const originalSchedule = computeSchedule(originalPayload, decimals);
    return (
      acc +
      calculateInterestSaved(
        schedule.rows,
        originalSchedule.totals.total_interest,
      )
    );
  }, 0);
}

export function getLoanCards(
  loans: EmiLoan[],
  now: Date,
  searchQuery: string,
  decimals: number,
) {
  const filtered = loans.filter(
    (l) =>
      l.payload.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.payload.lender_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  return filtered.map((loan) => {
    const schedule = computeSchedule(loan.payload, decimals);
    const { outstanding, nextDue } = getOutstandingAsOf(schedule.rows, now);
    const totalPrincipal = loan.payload.principal;
    const progress = Math.min(
      1,
      Math.max(0, (totalPrincipal - outstanding) / totalPrincipal),
    );
    return { loan, outstanding, nextDue, progress };
  });
}

export async function exportSchedulePDF(
  loanTitle: string,
  schedule: ScheduleResult,
  currencySym: string,
  decimals: number,
  numberFormat: "western" | "indian",
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(`Amortization Schedule: ${loanTitle}`, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);

  const headers = [
    ["#", "Due Date", "Principal", "Interest", "Extra", "Balance"],
  ];
  const body = schedule.rows.map((r: ScheduleRow) => [
    r.index,
    r.due_date.slice(0, 10),
    formatMoney(r.principal, currencySym, decimals, numberFormat),
    formatMoney(r.interest, currencySym, decimals, numberFormat),
    r.prepayment > 0
      ? formatMoney(r.prepayment, currencySym, decimals, numberFormat)
      : "—",
    formatMoney(r.closing_balance, currencySym, decimals, numberFormat),
  ]);

  autoTable(doc, {
    head: headers,
    body: body,
    startY: 30,
    theme: "striped",
    headStyles: { fillColor: [63, 63, 70] },
    foot: [
      [
        "TOTAL",
        "",
        formatMoney(
          schedule.totals.total_principal,
          currencySym,
          decimals,
          numberFormat,
        ),
        formatMoney(
          schedule.totals.total_interest,
          currencySym,
          decimals,
          numberFormat,
        ),
        formatMoney(
          schedule.totals.total_prepayment,
          currencySym,
          decimals,
          numberFormat,
        ),
        formatMoney(
          schedule.totals.total_principal + schedule.totals.total_interest,
          currencySym,
          decimals,
          numberFormat,
        ),
      ],
    ],
    footStyles: {
      fillColor: [39, 39, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
  });

  doc.save(`${loanTitle.replace(/\s+/g, "_")}_schedule.pdf`);
}
