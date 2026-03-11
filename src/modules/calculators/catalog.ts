import {
    CalculatorCategory,
    CalculatorDefinition,
    CalculatorsModuleSettings,
    CalculatorResult,
} from "./types";

const MONTHS_PER_YEAR = 12;
const DAYS_PER_YEAR = 365;

function getNumber(values: Record<string, string>, key: string, fallback: number) {
    const raw = values[key];
    const parsed = Number.parseFloat(raw ?? "");
    if (Number.isFinite(parsed)) return parsed;
    return fallback;
}

function getString(values: Record<string, string>, key: string, fallback: string) {
    const raw = values[key];
    return typeof raw === "string" && raw.length > 0 ? raw : fallback;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function safePow(base: number, exponent: number) {
    if (!Number.isFinite(base) || !Number.isFinite(exponent)) return 0;
    if (base <= 0) return 0;
    return Math.pow(base, exponent);
}

function formatNumber(value: number, digits = 0) {
    if (!Number.isFinite(value)) return "0";
    return value.toLocaleString("en-IN", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
}

function formatMoney(value: number, digits = 0) {
    if (!Number.isFinite(value)) return "Rs 0";
    return `Rs ${formatNumber(value, digits)}`;
}

function formatPercent(value: number, digits = 2) {
    if (!Number.isFinite(value)) return "0%";
    return `${formatNumber(value, digits)}%`;
}

function computeEmi(principal: number, annualRate: number, months: number) {
    if (principal <= 0 || months <= 0) return 0;
    const monthlyRate = annualRate / MONTHS_PER_YEAR / 100;
    if (monthlyRate === 0) return principal / months;
    const growth = safePow(1 + monthlyRate, months);
    return (principal * monthlyRate * growth) / (growth - 1);
}

function computeSipFutureValue(monthlyInvestment: number, annualRate: number, years: number) {
    const months = Math.max(0, Math.round(years * MONTHS_PER_YEAR));
    if (months <= 0 || monthlyInvestment <= 0) return { value: 0, invested: 0 };

    const monthlyRate = annualRate / MONTHS_PER_YEAR / 100;
    if (monthlyRate === 0) {
        const invested = monthlyInvestment * months;
        return { value: invested, invested };
    }

    const growth = safePow(1 + monthlyRate, months);
    const value = monthlyInvestment * ((growth - 1) / monthlyRate) * (1 + monthlyRate);
    const invested = monthlyInvestment * months;
    return { value, invested };
}

function computeTaxFromSlabs(taxableIncome: number, slabs: Array<{ limit: number; rate: number }>) {
    if (taxableIncome <= 0) return 0;

    let tax = 0;
    let previousLimit = 0;

    for (const slab of slabs) {
        const upper = slab.limit;
        const taxableAtThisRate = Math.max(0, Math.min(taxableIncome, upper) - previousLimit);
        tax += taxableAtThisRate * slab.rate;
        previousLimit = upper;
        if (taxableIncome <= upper) break;
    }

    return tax;
}

function daysBetween(base: Date, current: Date) {
    return (current.getTime() - base.getTime()) / (1000 * 60 * 60 * 24);
}

function parseXirrCashFlows(input: string) {
    const lines = input
        .split(/\n|;/)
        .map((line) => line.trim())
        .filter(Boolean);

    const flows: Array<{ date: Date; amount: number }> = [];

    for (const line of lines) {
        const [datePart, amountPart] = line.split(",").map((part) => part.trim());
        if (!datePart || !amountPart) continue;

        const date = new Date(datePart);
        const amount = Number.parseFloat(amountPart);

        if (!Number.isFinite(date.getTime()) || !Number.isFinite(amount)) continue;
        flows.push({ date, amount });
    }

    return flows.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function computeXirr(flows: Array<{ date: Date; amount: number }>) {
    if (flows.length < 2) return null;

    const hasPositive = flows.some((f) => f.amount > 0);
    const hasNegative = flows.some((f) => f.amount < 0);
    if (!hasPositive || !hasNegative) return null;

    const baseDate = flows[0].date;

    const npv = (rate: number) => {
        return flows.reduce((sum, flow) => {
            const years = daysBetween(baseDate, flow.date) / DAYS_PER_YEAR;
            return sum + flow.amount / safePow(1 + rate, years);
        }, 0);
    };

    const derivative = (rate: number) => {
        return flows.reduce((sum, flow) => {
            const years = daysBetween(baseDate, flow.date) / DAYS_PER_YEAR;
            return sum + (-years * flow.amount) / safePow(1 + rate, years + 1);
        }, 0);
    };

    let guess = 0.12;
    for (let i = 0; i < 80; i += 1) {
        const value = npv(guess);
        const slope = derivative(guess);
        if (Math.abs(slope) < 1e-12) break;

        const next = guess - value / slope;
        if (!Number.isFinite(next) || next <= -0.9999 || next > 100) break;
        if (Math.abs(next - guess) < 1e-8) return next;

        guess = next;
    }

    // Bisection fallback for robustness
    let low = -0.99;
    let high = 5;
    let lowVal = npv(low);
    let highVal = npv(high);

    if (lowVal * highVal > 0) return null;

    for (let i = 0; i < 120; i += 1) {
        const mid = (low + high) / 2;
        const midVal = npv(mid);

        if (Math.abs(midVal) < 1e-8) return mid;

        if (lowVal * midVal < 0) {
            high = mid;
            highVal = midVal;
        } else {
            low = mid;
            lowVal = midVal;
        }
    }

    return (low + high) / 2;
}

export const CALCULATOR_CATEGORIES: CalculatorCategory[] = [
    {
        id: "core",
        name: "Investing & Planning",
        description: "Plan long-term wealth goals with SIP, lumpsum, and retirement cashflow tools.",
    },
    {
        id: "debt",
        name: "Loans & Debt",
        description: "Understand EMIs, prepayments, and refinancing impact before loan decisions.",
    },
    {
        id: "tax",
        name: "Tax & Benefits",
        description: "Estimate taxes and long-term benefit payouts for better planning.",
    },
    {
        id: "returns",
        name: "Returns Analysis",
        description: "Evaluate growth quality with CAGR, XIRR, and inflation-adjusted views.",
    },
    {
        id: "conversion",
        name: "Conversions",
        description: "Convert units quickly across length, weight, temperature, data, and more.",
    },
    {
        id: "utilities",
        name: "Home & Utilities",
        description: "Practical calculators for household planning, capacity, and energy decisions.",
    },
];

export const CALCULATOR_DEFINITIONS: CalculatorDefinition[] = [
    {
        id: "sip",
        name: "SIP Calculator",
        shortName: "SIP",
        categoryId: "core",
        description: "Estimate future corpus from fixed monthly investments.",
        inputs: [
            { key: "monthlyInvestment", label: "Monthly investment", kind: "number", defaultValue: "10000", min: 0, step: 100, unit: "Rs" },
            { key: "annualReturn", label: "Expected annual return", kind: "number", defaultValue: "12", min: 0, max: 50, step: 0.1, unit: "%" },
            { key: "years", label: "Investment horizon", kind: "number", defaultValue: "15", min: 1, max: 50, step: 1, unit: "years" },
        ],
        compute: (values) => {
            const monthly = getNumber(values, "monthlyInvestment", 10000);
            const annual = getNumber(values, "annualReturn", 12);
            const years = getNumber(values, "years", 15);
            const result = computeSipFutureValue(monthly, annual, years);
            const gain = result.value - result.invested;

            return {
                primaryLabel: "Projected corpus",
                primaryValue: formatMoney(result.value),
                secondaryValue: `Invested ${formatMoney(result.invested)} | Gain ${formatMoney(gain)}`,
                metrics: [
                    { label: "Total invested", value: formatMoney(result.invested) },
                    { label: "Estimated gain", value: formatMoney(gain), tone: gain >= 0 ? "good" : "bad" },
                    { label: "Wealth multiple", value: `${formatNumber(result.invested > 0 ? result.value / result.invested : 0, 2)}x` },
                ],
            };
        },
    },
    {
        id: "step-up-sip",
        name: "Step-up SIP Calculator",
        shortName: "Step-up SIP",
        categoryId: "core",
        description: "Model SIP where contribution increases each year.",
        inputs: [
            { key: "startingSip", label: "Starting monthly SIP", kind: "number", defaultValue: "8000", min: 0, step: 100, unit: "Rs" },
            { key: "stepUpPercent", label: "Annual step-up", kind: "number", defaultValue: "10", min: 0, max: 100, step: 0.5, unit: "%" },
            { key: "annualReturn", label: "Expected annual return", kind: "number", defaultValue: "12", min: 0, max: 50, step: 0.1, unit: "%" },
            { key: "years", label: "Investment horizon", kind: "number", defaultValue: "15", min: 1, max: 50, step: 1, unit: "years" },
        ],
        compute: (values) => {
            const startingSip = getNumber(values, "startingSip", 8000);
            const stepUp = getNumber(values, "stepUpPercent", 10) / 100;
            const annual = getNumber(values, "annualReturn", 12);
            const years = getNumber(values, "years", 15);
            const months = Math.max(0, Math.round(years * MONTHS_PER_YEAR));
            const monthlyRate = annual / MONTHS_PER_YEAR / 100;

            let corpus = 0;
            let invested = 0;

            for (let month = 0; month < months; month += 1) {
                const yearIndex = Math.floor(month / 12);
                const contribution = startingSip * safePow(1 + stepUp, yearIndex);
                invested += contribution;
                corpus = (corpus + contribution) * (1 + monthlyRate);
            }

            const gain = corpus - invested;
            const lastYearSip = startingSip * safePow(1 + stepUp, Math.max(0, years - 1));

            return {
                primaryLabel: "Projected corpus",
                primaryValue: formatMoney(corpus),
                secondaryValue: `Invested ${formatMoney(invested)} | Gain ${formatMoney(gain)}`,
                metrics: [
                    { label: "Last year SIP", value: formatMoney(lastYearSip, 0) },
                    { label: "Step-up rate", value: formatPercent(stepUp * 100, 1) },
                    { label: "Gain over invested", value: formatPercent(invested > 0 ? (gain / invested) * 100 : 0, 1), tone: "good" },
                ],
            };
        },
    },
    {
        id: "lumpsum",
        name: "Lumpsum Calculator",
        shortName: "Lumpsum",
        categoryId: "core",
        description: "Estimate growth of a one-time investment.",
        inputs: [
            { key: "principal", label: "Investment amount", kind: "number", defaultValue: "500000", min: 0, step: 1000, unit: "Rs" },
            { key: "annualReturn", label: "Expected annual return", kind: "number", defaultValue: "11", min: 0, max: 50, step: 0.1, unit: "%" },
            { key: "years", label: "Investment horizon", kind: "number", defaultValue: "10", min: 1, max: 50, step: 1, unit: "years" },
        ],
        compute: (values) => {
            const principal = getNumber(values, "principal", 500000);
            const annual = getNumber(values, "annualReturn", 11) / 100;
            const years = getNumber(values, "years", 10);
            const futureValue = principal * safePow(1 + annual, years);
            const gain = futureValue - principal;

            return {
                primaryLabel: "Future value",
                primaryValue: formatMoney(futureValue),
                secondaryValue: `Absolute gain ${formatMoney(gain)}`,
                metrics: [
                    { label: "Principal", value: formatMoney(principal) },
                    { label: "Gain", value: formatMoney(gain), tone: gain >= 0 ? "good" : "bad" },
                    { label: "Effective multiple", value: `${formatNumber(principal > 0 ? futureValue / principal : 0, 2)}x` },
                ],
            };
        },
    },
    {
        id: "goal-planner",
        name: "Goal Planner",
        shortName: "Goal Planner",
        categoryId: "core",
        description: "Find required monthly savings for a target amount.",
        inputs: [
            { key: "targetAmount", label: "Target amount", kind: "number", defaultValue: "5000000", min: 0, step: 10000, unit: "Rs" },
            { key: "currentSavings", label: "Current savings", kind: "number", defaultValue: "300000", min: 0, step: 1000, unit: "Rs" },
            { key: "annualReturn", label: "Expected annual return", kind: "number", defaultValue: "10", min: 0, max: 50, step: 0.1, unit: "%" },
            { key: "years", label: "Years to goal", kind: "number", defaultValue: "12", min: 1, max: 50, step: 1, unit: "years" },
        ],
        compute: (values) => {
            const target = getNumber(values, "targetAmount", 5000000);
            const current = getNumber(values, "currentSavings", 300000);
            const annual = getNumber(values, "annualReturn", 10);
            const years = getNumber(values, "years", 12);
            const months = Math.max(1, Math.round(years * MONTHS_PER_YEAR));
            const monthlyRate = annual / MONTHS_PER_YEAR / 100;

            const futureOfCurrent = current * safePow(1 + monthlyRate, months);
            const requiredFutureFromSip = Math.max(0, target - futureOfCurrent);

            let requiredMonthly = 0;
            if (requiredFutureFromSip > 0) {
                if (monthlyRate === 0) {
                    requiredMonthly = requiredFutureFromSip / months;
                } else {
                    const factor = ((safePow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
                    requiredMonthly = requiredFutureFromSip / factor;
                }
            }

            const totalMonthlyInvested = requiredMonthly * months;

            return {
                primaryLabel: "Required monthly saving",
                primaryValue: formatMoney(requiredMonthly),
                secondaryValue: `Target ${formatMoney(target)} in ${formatNumber(years, 0)} years`,
                metrics: [
                    { label: "Future value of current savings", value: formatMoney(futureOfCurrent) },
                    { label: "Monthly SIP needed", value: formatMoney(requiredMonthly), tone: requiredMonthly > 0 ? "warn" : "good" },
                    { label: "Total future contribution", value: formatMoney(totalMonthlyInvested) },
                ],
            };
        },
    },
    {
        id: "swp",
        name: "SWP Calculator",
        shortName: "SWP",
        categoryId: "core",
        description: "Estimate retirement cashflow via systematic withdrawals.",
        inputs: [
            { key: "startingCorpus", label: "Starting corpus", kind: "number", defaultValue: "10000000", min: 0, step: 10000, unit: "Rs" },
            { key: "annualReturn", label: "Expected annual return", kind: "number", defaultValue: "8", min: 0, max: 30, step: 0.1, unit: "%" },
            { key: "monthlyWithdrawal", label: "Monthly withdrawal", kind: "number", defaultValue: "60000", min: 0, step: 1000, unit: "Rs" },
            { key: "years", label: "Projection years", kind: "number", defaultValue: "25", min: 1, max: 50, step: 1, unit: "years" },
        ],
        compute: (values) => {
            const corpusStart = getNumber(values, "startingCorpus", 10000000);
            const annual = getNumber(values, "annualReturn", 8);
            const withdrawal = getNumber(values, "monthlyWithdrawal", 60000);
            const years = getNumber(values, "years", 25);
            const months = Math.max(1, Math.round(years * MONTHS_PER_YEAR));
            const monthlyRate = annual / MONTHS_PER_YEAR / 100;

            let corpus = corpusStart;
            let lastedMonths = 0;

            for (let month = 0; month < months; month += 1) {
                corpus *= 1 + monthlyRate;
                corpus -= withdrawal;
                lastedMonths += 1;
                if (corpus <= 0) {
                    corpus = 0;
                    break;
                }
            }

            const swr = corpusStart > 0 ? (withdrawal * 12 * 100) / corpusStart : 0;
            const yearsLasted = lastedMonths / 12;

            return {
                primaryLabel: corpus > 0 ? "Corpus after projection" : "Corpus depletion",
                primaryValue: corpus > 0 ? formatMoney(corpus) : `${formatNumber(yearsLasted, 1)} years`,
                secondaryValue: `Withdrawal rate ${formatPercent(swr, 2)} per year`,
                metrics: [
                    { label: "Starting corpus", value: formatMoney(corpusStart) },
                    { label: "Monthly withdrawal", value: formatMoney(withdrawal) },
                    {
                        label: "Sustainability",
                        value: corpus > 0 ? "Likely sustainable" : "Needs adjustment",
                        tone: corpus > 0 ? "good" : "warn",
                    },
                ],
            };
        },
    },
    {
        id: "emi",
        name: "EMI Calculator",
        shortName: "EMI",
        categoryId: "debt",
        description: "Compute monthly EMI and total interest for a loan.",
        inputs: [
            { key: "principal", label: "Loan amount", kind: "number", defaultValue: "2500000", min: 0, step: 10000, unit: "Rs" },
            { key: "annualRate", label: "Interest rate", kind: "number", defaultValue: "9", min: 0, max: 40, step: 0.1, unit: "%" },
            { key: "tenureYears", label: "Tenure", kind: "number", defaultValue: "20", min: 1, max: 40, step: 1, unit: "years" },
        ],
        compute: (values) => {
            const principal = getNumber(values, "principal", 2500000);
            const annualRate = getNumber(values, "annualRate", 9);
            const years = getNumber(values, "tenureYears", 20);
            const months = Math.max(1, Math.round(years * MONTHS_PER_YEAR));

            const emi = computeEmi(principal, annualRate, months);
            const totalPayment = emi * months;
            const totalInterest = totalPayment - principal;

            return {
                primaryLabel: "Monthly EMI",
                primaryValue: formatMoney(emi),
                secondaryValue: `Total interest ${formatMoney(totalInterest)}`,
                metrics: [
                    { label: "Total payment", value: formatMoney(totalPayment) },
                    { label: "Principal", value: formatMoney(principal) },
                    { label: "Interest share", value: formatPercent(totalPayment > 0 ? (totalInterest / totalPayment) * 100 : 0, 1), tone: "warn" },
                ],
            };
        },
    },
    {
        id: "prepayment",
        name: "Prepayment Calculator",
        shortName: "Prepayment",
        categoryId: "debt",
        description: "Estimate tenure reduction and interest saved from extra payments.",
        inputs: [
            { key: "principal", label: "Loan amount", kind: "number", defaultValue: "4000000", min: 0, step: 10000, unit: "Rs" },
            { key: "annualRate", label: "Interest rate", kind: "number", defaultValue: "8.5", min: 0, max: 40, step: 0.1, unit: "%" },
            { key: "tenureYears", label: "Original tenure", kind: "number", defaultValue: "20", min: 1, max: 40, step: 1, unit: "years" },
            { key: "extraMonthly", label: "Extra monthly prepayment", kind: "number", defaultValue: "10000", min: 0, step: 1000, unit: "Rs" },
            { key: "startAfterMonths", label: "Start prepayment after", kind: "number", defaultValue: "12", min: 0, max: 360, step: 1, unit: "months" },
        ],
        compute: (values) => {
            const principal = getNumber(values, "principal", 4000000);
            const annualRate = getNumber(values, "annualRate", 8.5);
            const years = getNumber(values, "tenureYears", 20);
            const extra = Math.max(0, getNumber(values, "extraMonthly", 10000));
            const startAfter = Math.max(0, Math.round(getNumber(values, "startAfterMonths", 12)));
            const months = Math.max(1, Math.round(years * MONTHS_PER_YEAR));

            const monthlyRate = annualRate / MONTHS_PER_YEAR / 100;
            const emi = computeEmi(principal, annualRate, months);

            const runSchedule = (withPrepay: boolean) => {
                let balance = principal;
                let month = 0;
                let interestPaid = 0;

                while (balance > 1e-6 && month < 720) {
                    const interest = balance * monthlyRate;
                    let principalComponent = emi - interest;
                    if (principalComponent <= 0) {
                        return { months: 720, interestPaid: Number.POSITIVE_INFINITY };
                    }

                    const extraPayment = withPrepay && month >= startAfter ? extra : 0;
                    principalComponent += extraPayment;
                    principalComponent = Math.min(principalComponent, balance);

                    balance -= principalComponent;
                    interestPaid += interest;
                    month += 1;
                }

                return { months: month, interestPaid };
            };

            const base = runSchedule(false);
            const optimized = runSchedule(true);

            const monthsSaved = Math.max(0, base.months - optimized.months);
            const interestSaved = Math.max(0, base.interestPaid - optimized.interestPaid);

            return {
                primaryLabel: "Interest saved",
                primaryValue: formatMoney(interestSaved),
                secondaryValue: `Tenure reduced by ${formatNumber(monthsSaved, 0)} months`,
                metrics: [
                    { label: "Regular tenure", value: `${formatNumber(base.months / 12, 1)} years` },
                    { label: "With prepayment", value: `${formatNumber(optimized.months / 12, 1)} years`, tone: "good" },
                    { label: "Base EMI", value: formatMoney(emi) },
                ],
            };
        },
    },
    {
        id: "dti",
        name: "Debt-to-Income Ratio Gauge",
        shortName: "DTI Gauge",
        categoryId: "debt",
        description: "Assess loan affordability and lending health quickly.",
        inputs: [
            { key: "monthlyIncome", label: "Monthly net income", kind: "number", defaultValue: "150000", min: 0, step: 1000, unit: "Rs" },
            { key: "existingEmi", label: "Existing EMIs", kind: "number", defaultValue: "30000", min: 0, step: 500, unit: "Rs" },
            { key: "proposedEmi", label: "Proposed EMI", kind: "number", defaultValue: "25000", min: 0, step: 500, unit: "Rs" },
        ],
        compute: (values) => {
            const income = getNumber(values, "monthlyIncome", 150000);
            const existing = getNumber(values, "existingEmi", 30000);
            const proposed = getNumber(values, "proposedEmi", 25000);
            const dti = income > 0 ? ((existing + proposed) / income) * 100 : 0;

            let rating = "Excellent";
            let tone: "good" | "warn" | "bad" = "good";
            if (dti > 50) {
                rating = "High risk";
                tone = "bad";
            } else if (dti > 40) {
                rating = "Stretched";
                tone = "warn";
            } else if (dti > 30) {
                rating = "Acceptable";
                tone = "warn";
            }

            return {
                primaryLabel: "DTI ratio",
                primaryValue: formatPercent(dti, 1),
                secondaryValue: `Assessment: ${rating}`,
                metrics: [
                    { label: "Total debt obligations", value: formatMoney(existing + proposed) },
                    { label: "Disposable after EMI", value: formatMoney(Math.max(0, income - existing - proposed)) },
                    { label: "Eligibility signal", value: rating, tone },
                ],
            };
        },
    },
    {
        id: "balance-transfer",
        name: "Balance Transfer Calculator",
        shortName: "Balance Transfer",
        categoryId: "debt",
        description: "Check if switching lender and rate actually saves money.",
        inputs: [
            { key: "outstanding", label: "Outstanding principal", kind: "number", defaultValue: "2200000", min: 0, step: 10000, unit: "Rs" },
            { key: "currentRate", label: "Current interest rate", kind: "number", defaultValue: "10.5", min: 0, max: 40, step: 0.1, unit: "%" },
            { key: "newRate", label: "Offered new rate", kind: "number", defaultValue: "8.9", min: 0, max: 40, step: 0.1, unit: "%" },
            { key: "remainingYears", label: "Remaining tenure", kind: "number", defaultValue: "12", min: 1, max: 40, step: 1, unit: "years" },
            { key: "transferFeePercent", label: "Transfer charges", kind: "number", defaultValue: "1", min: 0, max: 10, step: 0.1, unit: "%" },
        ],
        compute: (values) => {
            const outstanding = getNumber(values, "outstanding", 2200000);
            const currentRate = getNumber(values, "currentRate", 10.5);
            const newRate = getNumber(values, "newRate", 8.9);
            const years = getNumber(values, "remainingYears", 12);
            const feePercent = getNumber(values, "transferFeePercent", 1);
            const months = Math.max(1, Math.round(years * MONTHS_PER_YEAR));

            const emiCurrent = computeEmi(outstanding, currentRate, months);
            const emiNew = computeEmi(outstanding, newRate, months);
            const feeAmount = outstanding * (feePercent / 100);

            const interestCurrent = emiCurrent * months - outstanding;
            const interestNew = emiNew * months - outstanding;
            const effectiveCostNew = interestNew + feeAmount;
            const savings = interestCurrent - effectiveCostNew;

            return {
                primaryLabel: savings >= 0 ? "Potential savings" : "Extra cost",
                primaryValue: formatMoney(Math.abs(savings)),
                secondaryValue: savings >= 0 ? "Transfer looks beneficial" : "Transfer may not be worth it",
                metrics: [
                    { label: "Current EMI", value: formatMoney(emiCurrent) },
                    { label: "New EMI", value: formatMoney(emiNew), tone: emiNew <= emiCurrent ? "good" : "warn" },
                    { label: "Fee + processing", value: formatMoney(feeAmount) },
                ],
            };
        },
    },
    {
        id: "income-tax",
        name: "Income Tax Calculator",
        shortName: "Income Tax",
        categoryId: "tax",
        description: "Compare Old vs New regime with common deductions.",
        inputs: [
            { key: "annualIncome", label: "Annual taxable income", kind: "number", defaultValue: "1800000", min: 0, step: 10000, unit: "Rs" },
            { key: "deduction80c", label: "80C deductions", kind: "number", defaultValue: "150000", min: 0, step: 1000, unit: "Rs" },
            { key: "otherDeductions", label: "Other deductions", kind: "number", defaultValue: "50000", min: 0, step: 1000, unit: "Rs" },
        ],
        compute: (values) => {
            const income = getNumber(values, "annualIncome", 1800000);
            const deduction80c = getNumber(values, "deduction80c", 150000);
            const other = getNumber(values, "otherDeductions", 50000);

            const taxableOld = Math.max(0, income - 50000 - deduction80c - other);
            const taxableNew = Math.max(0, income - 75000);

            const oldSlabs = [
                { limit: 250000, rate: 0 },
                { limit: 500000, rate: 0.05 },
                { limit: 1000000, rate: 0.2 },
                { limit: Number.POSITIVE_INFINITY, rate: 0.3 },
            ];

            const newSlabs = [
                { limit: 300000, rate: 0 },
                { limit: 700000, rate: 0.05 },
                { limit: 1000000, rate: 0.1 },
                { limit: 1200000, rate: 0.15 },
                { limit: 1500000, rate: 0.2 },
                { limit: Number.POSITIVE_INFINITY, rate: 0.3 },
            ];

            let oldTax = computeTaxFromSlabs(taxableOld, oldSlabs);
            let newTax = computeTaxFromSlabs(taxableNew, newSlabs);

            if (taxableOld <= 500000) oldTax = 0;
            if (taxableNew <= 700000) newTax = 0;

            oldTax *= 1.04;
            newTax *= 1.04;

            const diff = Math.abs(oldTax - newTax);
            const recommended = oldTax <= newTax ? "Old Regime" : "New Regime";

            return {
                primaryLabel: "Recommended regime",
                primaryValue: recommended,
                secondaryValue: `Estimated savings ${formatMoney(diff)} per year`,
                metrics: [
                    { label: "Tax (Old)", value: formatMoney(oldTax), tone: oldTax <= newTax ? "good" : "warn" },
                    { label: "Tax (New)", value: formatMoney(newTax), tone: newTax <= oldTax ? "good" : "warn" },
                    { label: "Effective tax rate", value: formatPercent(income > 0 ? (Math.min(oldTax, newTax) / income) * 100 : 0, 2) },
                ],
                notes: [
                    "Includes a simplified slab model and 4% cess.",
                    "Use a CA filing workflow for exact liability and surcharge cases.",
                ],
            };
        },
    },
    {
        id: "hra",
        name: "HRA Calculator",
        shortName: "HRA",
        categoryId: "tax",
        description: "Estimate HRA exemption based on salary, rent, and city type.",
        inputs: [
            { key: "basicMonthly", label: "Basic salary (monthly)", kind: "number", defaultValue: "70000", min: 0, step: 1000, unit: "Rs" },
            { key: "hraMonthly", label: "HRA received (monthly)", kind: "number", defaultValue: "30000", min: 0, step: 1000, unit: "Rs" },
            { key: "rentMonthly", label: "Rent paid (monthly)", kind: "number", defaultValue: "35000", min: 0, step: 1000, unit: "Rs" },
            {
                key: "cityType",
                label: "City type",
                kind: "select",
                defaultValue: "metro",
                options: [
                    { label: "Metro", value: "metro" },
                    { label: "Non-metro", value: "non-metro" },
                ],
            },
        ],
        compute: (values) => {
            const basicMonthly = getNumber(values, "basicMonthly", 70000);
            const hraMonthly = getNumber(values, "hraMonthly", 30000);
            const rentMonthly = getNumber(values, "rentMonthly", 35000);
            const cityType = getString(values, "cityType", "metro");

            const basicAnnual = basicMonthly * 12;
            const hraAnnual = hraMonthly * 12;
            const rentAnnual = rentMonthly * 12;

            const percentLimit = cityType === "metro" ? 0.5 : 0.4;
            const component1 = hraAnnual;
            const component2 = Math.max(0, rentAnnual - basicAnnual * 0.1);
            const component3 = basicAnnual * percentLimit;

            const exemption = Math.min(component1, component2, component3);
            const taxableHra = Math.max(0, hraAnnual - exemption);

            return {
                primaryLabel: "HRA exemption",
                primaryValue: formatMoney(exemption),
                secondaryValue: `Taxable HRA ${formatMoney(taxableHra)}`,
                metrics: [
                    { label: "Actual HRA", value: formatMoney(component1) },
                    { label: "Rent - 10% Basic", value: formatMoney(component2) },
                    { label: `${cityType === "metro" ? "50%" : "40%"} of Basic`, value: formatMoney(component3) },
                ],
            };
        },
    },
    {
        id: "gratuity",
        name: "Gratuity Calculator",
        shortName: "Gratuity",
        categoryId: "tax",
        description: "Estimate gratuity payout for eligible service tenure.",
        inputs: [
            { key: "lastDrawnBasicDa", label: "Last drawn Basic + DA", kind: "number", defaultValue: "90000", min: 0, step: 1000, unit: "Rs" },
            { key: "yearsOfService", label: "Completed years of service", kind: "number", defaultValue: "8", min: 0, max: 45, step: 1, unit: "years" },
        ],
        compute: (values) => {
            const salary = getNumber(values, "lastDrawnBasicDa", 90000);
            const years = Math.floor(getNumber(values, "yearsOfService", 8));
            const eligible = years >= 5;
            const gratuity = eligible ? (salary * 15 * years) / 26 : 0;

            return {
                primaryLabel: "Estimated gratuity",
                primaryValue: formatMoney(gratuity),
                secondaryValue: eligible ? "Eligible under 5+ year rule" : "Becomes eligible after 5 years",
                metrics: [
                    { label: "Service years", value: `${formatNumber(years, 0)} years` },
                    { label: "Formula", value: "(Basic + DA) x 15/26 x years" },
                    { label: "Eligibility", value: eligible ? "Eligible" : "Not yet", tone: eligible ? "good" : "warn" },
                ],
            };
        },
    },
    {
        id: "nps",
        name: "NPS Calculator",
        shortName: "NPS",
        categoryId: "tax",
        description: "Project NPS corpus, lump sum, and pension potential.",
        inputs: [
            { key: "monthlyContribution", label: "Monthly contribution", kind: "number", defaultValue: "15000", min: 0, step: 500, unit: "Rs" },
            { key: "annualReturn", label: "Expected annual return", kind: "number", defaultValue: "10", min: 0, max: 30, step: 0.1, unit: "%" },
            { key: "years", label: "Years to retirement", kind: "number", defaultValue: "25", min: 1, max: 45, step: 1, unit: "years" },
            { key: "annuityPercent", label: "Annuity allocation", kind: "number", defaultValue: "40", min: 0, max: 100, step: 1, unit: "%" },
            { key: "annuityReturn", label: "Expected annuity return", kind: "number", defaultValue: "6.5", min: 0, max: 20, step: 0.1, unit: "%" },
        ],
        compute: (values) => {
            const monthly = getNumber(values, "monthlyContribution", 15000);
            const annual = getNumber(values, "annualReturn", 10);
            const years = getNumber(values, "years", 25);
            const annuityPercent = clamp(getNumber(values, "annuityPercent", 40), 0, 100);
            const annuityReturn = getNumber(values, "annuityReturn", 6.5);

            const sip = computeSipFutureValue(monthly, annual, years);
            const annuityCorpus = sip.value * (annuityPercent / 100);
            const lumpSum = sip.value - annuityCorpus;
            const monthlyPension = (annuityCorpus * (annuityReturn / 100)) / 12;

            return {
                primaryLabel: "Maturity corpus",
                primaryValue: formatMoney(sip.value),
                secondaryValue: `Lump sum ${formatMoney(lumpSum)} | Monthly pension ${formatMoney(monthlyPension)}`,
                metrics: [
                    { label: "Annuity corpus", value: formatMoney(annuityCorpus) },
                    { label: "Lump sum withdrawal", value: formatMoney(lumpSum), tone: "good" },
                    { label: "Contribution invested", value: formatMoney(sip.invested) },
                ],
            };
        },
    },
    {
        id: "cagr",
        name: "CAGR Calculator",
        shortName: "CAGR",
        categoryId: "returns",
        description: "Measure annualized growth rate between start and end values.",
        inputs: [
            { key: "startValue", label: "Beginning value", kind: "number", defaultValue: "500000", min: 0, step: 1000, unit: "Rs" },
            { key: "endValue", label: "Ending value", kind: "number", defaultValue: "950000", min: 0, step: 1000, unit: "Rs" },
            { key: "years", label: "Duration", kind: "number", defaultValue: "5", min: 0.5, max: 50, step: 0.5, unit: "years" },
        ],
        compute: (values) => {
            const start = Math.max(1e-9, getNumber(values, "startValue", 500000));
            const end = Math.max(0, getNumber(values, "endValue", 950000));
            const years = Math.max(0.1, getNumber(values, "years", 5));
            const cagr = (safePow(end / start, 1 / years) - 1) * 100;

            return {
                primaryLabel: "CAGR",
                primaryValue: formatPercent(cagr, 2),
                secondaryValue: `From ${formatMoney(start)} to ${formatMoney(end)} in ${formatNumber(years, 1)} years`,
                metrics: [
                    { label: "Absolute return", value: formatPercent(((end - start) / start) * 100, 2) },
                    { label: "Wealth multiple", value: `${formatNumber(end / start, 2)}x` },
                    { label: "Annualized growth", value: formatPercent(cagr, 2), tone: cagr >= 0 ? "good" : "bad" },
                ],
            };
        },
    },
    {
        id: "xirr",
        name: "XIRR Calculator",
        shortName: "XIRR",
        categoryId: "returns",
        description: "Calculate annualized return for irregular cash flow dates.",
        inputs: [
            {
                key: "cashFlows",
                label: "Cash flows (YYYY-MM-DD, amount)",
                kind: "textarea",
                defaultValue: "2022-01-01, -100000\n2022-07-15, -50000\n2023-12-01, -25000\n2025-03-01, 230000",
                helper: "Use negative amounts for investments and positive for withdrawals/redemption.",
                placeholder: "2024-01-01, -50000\\n2025-06-01, 60000",
            },
        ],
        compute: (values) => {
            const cashFlowInput = getString(values, "cashFlows", "");
            const flows = parseXirrCashFlows(cashFlowInput);
            const xirr = computeXirr(flows);

            const inflow = flows.filter((f) => f.amount > 0).reduce((sum, flow) => sum + flow.amount, 0);
            const outflow = flows.filter((f) => f.amount < 0).reduce((sum, flow) => sum + Math.abs(flow.amount), 0);

            const result: CalculatorResult = {
                primaryLabel: "XIRR",
                primaryValue: xirr === null ? "Insufficient data" : formatPercent(xirr * 100, 2),
                secondaryValue: `Flows parsed: ${formatNumber(flows.length, 0)}`,
                metrics: [
                    { label: "Total invested", value: formatMoney(outflow) },
                    { label: "Total received", value: formatMoney(inflow) },
                    { label: "Net gain", value: formatMoney(inflow - outflow), tone: inflow >= outflow ? "good" : "warn" },
                ],
                notes: xirr === null
                    ? ["Provide at least one negative and one positive cash flow for valid XIRR."]
                    : undefined,
            };

            return result;
        },
    },
    {
        id: "inflation-adjusted",
        name: "Inflation-Adjusted Calculator",
        shortName: "Inflation",
        categoryId: "returns",
        description: "Understand future cost and real return after inflation.",
        inputs: [
            { key: "currentAmount", label: "Current amount", kind: "number", defaultValue: "1000000", min: 0, step: 1000, unit: "Rs" },
            { key: "inflationRate", label: "Inflation rate", kind: "number", defaultValue: "6", min: 0, max: 30, step: 0.1, unit: "%" },
            { key: "expectedReturn", label: "Expected portfolio return", kind: "number", defaultValue: "10", min: 0, max: 40, step: 0.1, unit: "%" },
            { key: "years", label: "Years", kind: "number", defaultValue: "12", min: 1, max: 50, step: 1, unit: "years" },
        ],
        compute: (values) => {
            const amount = getNumber(values, "currentAmount", 1000000);
            const inflation = getNumber(values, "inflationRate", 6) / 100;
            const nominalReturn = getNumber(values, "expectedReturn", 10) / 100;
            const years = getNumber(values, "years", 12);

            const futureCost = amount * safePow(1 + inflation, years);
            const futureNominal = amount * safePow(1 + nominalReturn, years);
            const realReturn = ((1 + nominalReturn) / (1 + inflation) - 1) * 100;
            const realFutureValue = futureNominal / safePow(1 + inflation, years);

            return {
                primaryLabel: "Future cost (inflation-adjusted)",
                primaryValue: formatMoney(futureCost),
                secondaryValue: `Real annual return ${formatPercent(realReturn, 2)}`,
                metrics: [
                    { label: "Nominal future value", value: formatMoney(futureNominal) },
                    { label: "Real value in today's money", value: formatMoney(realFutureValue) },
                    { label: "Purchasing-power impact", value: formatMoney(futureCost - amount), tone: "warn" },
                ],
            };
        },
    },
    {
        id: "rule-of-72",
        name: "Rule of 72",
        shortName: "Rule 72",
        categoryId: "returns",
        description: "Quick estimate of years required to double money.",
        inputs: [
            { key: "annualRate", label: "Annual return rate", kind: "number", defaultValue: "12", min: 0.1, max: 50, step: 0.1, unit: "%" },
        ],
        compute: (values) => {
            const annualRate = Math.max(0.1, getNumber(values, "annualRate", 12));
            const estimateYears = 72 / annualRate;
            const exactYears = Math.log(2) / Math.log(1 + annualRate / 100);

            return {
                primaryLabel: "Years to double",
                primaryValue: formatNumber(estimateYears, 2),
                secondaryValue: `Exact compounding estimate ${formatNumber(exactYears, 2)} years`,
                metrics: [
                    { label: "Rule-72 estimate", value: `${formatNumber(estimateYears, 2)} years` },
                    { label: "Exact formula", value: `${formatNumber(exactYears, 2)} years` },
                    { label: "Difference", value: `${formatNumber(Math.abs(exactYears - estimateYears), 2)} years` },
                ],
            };
        },
    },
    {
        id: "solar-roi",
        name: "Electricity Bill & Solar ROI",
        shortName: "Solar ROI",
        categoryId: "utilities",
        description: "Estimate annual savings and payback from rooftop solar setup.",
        inputs: [
            { key: "monthlyUnits", label: "Monthly electricity usage", kind: "number", defaultValue: "900", min: 0, step: 10, unit: "kWh" },
            { key: "gridRate", label: "Grid tariff", kind: "number", defaultValue: "9", min: 0, step: 0.1, unit: "Rs/kWh" },
            { key: "solarKw", label: "Solar system size", kind: "number", defaultValue: "2.75", min: 0.1, max: 25, step: 0.05, unit: "kW" },
            { key: "systemCost", label: "System cost", kind: "number", defaultValue: "180000", min: 0, step: 1000, unit: "Rs" },
            { key: "annualMaintenance", label: "Annual maintenance", kind: "number", defaultValue: "5000", min: 0, step: 500, unit: "Rs" },
            { key: "sunHours", label: "Average sun hours/day", kind: "number", defaultValue: "4.5", min: 1, max: 8, step: 0.1, unit: "hours" },
        ],
        compute: (values) => {
            const monthlyUnits = getNumber(values, "monthlyUnits", 900);
            const gridRate = getNumber(values, "gridRate", 9);
            const solarKw = getNumber(values, "solarKw", 2.75);
            const systemCost = getNumber(values, "systemCost", 180000);
            const annualMaintenance = getNumber(values, "annualMaintenance", 5000);
            const sunHours = getNumber(values, "sunHours", 4.5);

            const monthlyGeneration = solarKw * sunHours * 30;
            const monthlyOffset = Math.min(monthlyUnits, monthlyGeneration);
            const annualSavingsGross = monthlyOffset * gridRate * 12;
            const annualSavingsNet = annualSavingsGross - annualMaintenance;
            const payback = annualSavingsNet > 0 ? systemCost / annualSavingsNet : Number.POSITIVE_INFINITY;

            let lifetimeSavings = -systemCost;
            const degradation = 0.005;
            for (let year = 0; year < 25; year += 1) {
                const annualGeneration = monthlyGeneration * 12 * safePow(1 - degradation, year);
                const annualOffset = Math.min(monthlyUnits * 12, annualGeneration);
                const yearSavings = annualOffset * gridRate - annualMaintenance;
                lifetimeSavings += yearSavings;
            }

            return {
                primaryLabel: "Estimated annual net savings",
                primaryValue: formatMoney(annualSavingsNet),
                secondaryValue: Number.isFinite(payback) ? `Simple payback ${formatNumber(payback, 1)} years` : "Payback not achieved with current inputs",
                metrics: [
                    { label: "Monthly solar generation", value: `${formatNumber(monthlyGeneration, 0)} kWh` },
                    { label: "Monthly bill offset", value: `${formatNumber(monthlyOffset, 0)} kWh` },
                    { label: "25-year net savings", value: formatMoney(lifetimeSavings), tone: lifetimeSavings >= 0 ? "good" : "warn" },
                ],
            };
        },
    },
    {
        id: "home-theater",
        name: "Home Theater Screen Size/Distance",
        shortName: "Home Theater",
        categoryId: "utilities",
        description: "Find optimal screen size based on room and seating distance.",
        inputs: [
            { key: "roomWidth", label: "Room width", kind: "number", defaultValue: "10", min: 4, max: 40, step: 0.5, unit: "ft" },
            { key: "roomLength", label: "Room length", kind: "number", defaultValue: "16", min: 6, max: 80, step: 0.5, unit: "ft" },
            { key: "seatingDistance", label: "Seating distance", kind: "number", defaultValue: "10", min: 4, max: 40, step: 0.5, unit: "ft" },
            {
                key: "aspect",
                label: "Aspect ratio",
                kind: "select",
                defaultValue: "16:9",
                options: [
                    { label: "16:9", value: "16:9" },
                    { label: "21:9", value: "21:9" },
                ],
            },
        ],
        compute: (values) => {
            const roomWidthFt = getNumber(values, "roomWidth", 10);
            const roomLengthFt = getNumber(values, "roomLength", 16);
            const seatingFt = getNumber(values, "seatingDistance", 10);
            const aspect = getString(values, "aspect", "16:9");

            const [aspectWRaw, aspectHRaw] = aspect.split(":");
            const aspectW = Number.parseFloat(aspectWRaw);
            const aspectH = Number.parseFloat(aspectHRaw);
            const validAspect = Number.isFinite(aspectW) && Number.isFinite(aspectH) && aspectW > 0 && aspectH > 0;
            const widthFactor = validAspect ? Math.sqrt(aspectW * aspectW + aspectH * aspectH) / aspectW : 1.147;

            const distanceInches = seatingFt * 12;
            const widthFor30 = 2 * distanceInches * Math.tan((30 * Math.PI) / 360);
            const widthFor40 = 2 * distanceInches * Math.tan((40 * Math.PI) / 360);
            const diagMin = widthFor30 * widthFactor;
            const diagMax = widthFor40 * widthFactor;

            const maxWallWidthInches = roomWidthFt * 12 * 0.9;
            const maxWallDiagonal = maxWallWidthInches * widthFactor;
            const recommended = Math.min(diagMax, maxWallDiagonal);

            return {
                primaryLabel: "Recommended diagonal",
                primaryValue: `${formatNumber(recommended, 0)} in`,
                secondaryValue: `Comfort range ${formatNumber(diagMin, 0)} in - ${formatNumber(Math.min(diagMax, maxWallDiagonal), 0)} in`,
                metrics: [
                    { label: "Room size", value: `${formatNumber(roomWidthFt, 1)} x ${formatNumber(roomLengthFt, 1)} ft` },
                    { label: "Seating distance", value: `${formatNumber(seatingFt, 1)} ft` },
                    { label: "Wall-constrained max", value: `${formatNumber(maxWallDiagonal, 0)} in` },
                ],
            };
        },
    },
    {
        id: "ac-tonnage",
        name: "AC Tonnage Calculator",
        shortName: "AC Tonnage",
        categoryId: "utilities",
        description: "Estimate cooling tonnage and BTU needs for room renovation.",
        inputs: [
            { key: "roomLength", label: "Room length", kind: "number", defaultValue: "16", min: 4, max: 80, step: 0.5, unit: "ft" },
            { key: "roomWidth", label: "Room width", kind: "number", defaultValue: "10", min: 4, max: 80, step: 0.5, unit: "ft" },
            { key: "ceilingHeight", label: "Ceiling height", kind: "number", defaultValue: "10", min: 7, max: 16, step: 0.1, unit: "ft" },
            { key: "occupants", label: "Occupants", kind: "number", defaultValue: "3", min: 1, max: 12, step: 1, unit: "count" },
            {
                key: "sunExposure",
                label: "Sun exposure",
                kind: "select",
                defaultValue: "medium",
                options: [
                    { label: "Low", value: "low" },
                    { label: "Medium", value: "medium" },
                    { label: "High", value: "high" },
                ],
            },
            { key: "applianceWatts", label: "Electronics load", kind: "number", defaultValue: "900", min: 0, max: 10000, step: 50, unit: "W" },
        ],
        compute: (values) => {
            const length = getNumber(values, "roomLength", 16);
            const width = getNumber(values, "roomWidth", 10);
            const height = getNumber(values, "ceilingHeight", 10);
            const occupants = Math.max(1, Math.round(getNumber(values, "occupants", 3)));
            const sunExposure = getString(values, "sunExposure", "medium");
            const applianceWatts = getNumber(values, "applianceWatts", 900);

            const area = length * width;
            const baseBtu = area * 20 * (height / 8);
            const sunFactor = sunExposure === "low" ? 0.9 : sunExposure === "high" ? 1.15 : 1;
            const occupantBtu = Math.max(0, occupants - 2) * 600;
            const applianceBtu = applianceWatts * 3.412 * 0.7;

            const totalBtu = (baseBtu * sunFactor) + occupantBtu + applianceBtu;
            const tonnage = totalBtu / 12000;
            const recommendedTonnage = Math.ceil(tonnage * 2) / 2;

            let guidance = "Comfortable";
            let tone: "good" | "warn" = "good";
            if (tonnage > 2.2) {
                guidance = "High load room";
                tone = "warn";
            }

            return {
                primaryLabel: "Recommended AC size",
                primaryValue: `${formatNumber(recommendedTonnage, 1)} ton`,
                secondaryValue: `Cooling load ${formatNumber(totalBtu, 0)} BTU/hr`,
                metrics: [
                    { label: "Room area", value: `${formatNumber(area, 0)} sq ft` },
                    { label: "Calculated tonnage", value: `${formatNumber(tonnage, 2)} ton` },
                    { label: "Load classification", value: guidance, tone },
                ],
                notes: [
                    "For exposed top-floor rooms, consider one size up.",
                    "Professional heat-load calculation is recommended before purchase.",
                ],
            };
        },
    },
    {
        id: "length-converter",
        name: "Length Converter",
        shortName: "Length",
        categoryId: "conversion",
        description: "Convert between millimeter, centimeter, meter, kilometer, inch, foot, yard, and mile.",
        inputs: [
            { key: "value", label: "Value", kind: "number", defaultValue: "1", step: 0.01 },
            {
                key: "fromUnit",
                label: "From",
                kind: "select",
                defaultValue: "m",
                options: [
                    { label: "Millimeter (mm)", value: "mm" },
                    { label: "Centimeter (cm)", value: "cm" },
                    { label: "Meter (m)", value: "m" },
                    { label: "Kilometer (km)", value: "km" },
                    { label: "Inch (in)", value: "in" },
                    { label: "Foot (ft)", value: "ft" },
                    { label: "Yard (yd)", value: "yd" },
                    { label: "Mile (mi)", value: "mi" },
                ],
            },
            {
                key: "toUnit",
                label: "To",
                kind: "select",
                defaultValue: "ft",
                options: [
                    { label: "Millimeter (mm)", value: "mm" },
                    { label: "Centimeter (cm)", value: "cm" },
                    { label: "Meter (m)", value: "m" },
                    { label: "Kilometer (km)", value: "km" },
                    { label: "Inch (in)", value: "in" },
                    { label: "Foot (ft)", value: "ft" },
                    { label: "Yard (yd)", value: "yd" },
                    { label: "Mile (mi)", value: "mi" },
                ],
            },
        ],
        compute: (values) => {
            const value = getNumber(values, "value", 1);
            const from = getString(values, "fromUnit", "m");
            const to = getString(values, "toUnit", "ft");

            const toMeters: Record<string, number> = {
                mm: 0.001,
                cm: 0.01,
                m: 1,
                km: 1000,
                in: 0.0254,
                ft: 0.3048,
                yd: 0.9144,
                mi: 1609.344,
            };

            const meters = value * (toMeters[from] || 1);
            const converted = meters / (toMeters[to] || 1);

            return {
                primaryLabel: "Converted value",
                primaryValue: `${formatNumber(converted, 6)} ${to}`,
                secondaryValue: `${formatNumber(value, 6)} ${from} equals ${formatNumber(converted, 6)} ${to}`,
                metrics: [
                    { label: "In meters", value: `${formatNumber(meters, 6)} m` },
                    { label: "From unit", value: from.toUpperCase() },
                    { label: "To unit", value: to.toUpperCase() },
                ],
            };
        },
    },
    {
        id: "weight-converter",
        name: "Weight Converter",
        shortName: "Weight",
        categoryId: "conversion",
        description: "Convert between milligram, gram, kilogram, tonne, ounce, and pound.",
        inputs: [
            { key: "value", label: "Value", kind: "number", defaultValue: "1", step: 0.01 },
            {
                key: "fromUnit",
                label: "From",
                kind: "select",
                defaultValue: "kg",
                options: [
                    { label: "Milligram (mg)", value: "mg" },
                    { label: "Gram (g)", value: "g" },
                    { label: "Kilogram (kg)", value: "kg" },
                    { label: "Tonne (t)", value: "t" },
                    { label: "Ounce (oz)", value: "oz" },
                    { label: "Pound (lb)", value: "lb" },
                ],
            },
            {
                key: "toUnit",
                label: "To",
                kind: "select",
                defaultValue: "lb",
                options: [
                    { label: "Milligram (mg)", value: "mg" },
                    { label: "Gram (g)", value: "g" },
                    { label: "Kilogram (kg)", value: "kg" },
                    { label: "Tonne (t)", value: "t" },
                    { label: "Ounce (oz)", value: "oz" },
                    { label: "Pound (lb)", value: "lb" },
                ],
            },
        ],
        compute: (values) => {
            const value = getNumber(values, "value", 1);
            const from = getString(values, "fromUnit", "kg");
            const to = getString(values, "toUnit", "lb");

            const toKg: Record<string, number> = {
                mg: 0.000001,
                g: 0.001,
                kg: 1,
                t: 1000,
                oz: 0.0283495231,
                lb: 0.45359237,
            };

            const kilograms = value * (toKg[from] || 1);
            const converted = kilograms / (toKg[to] || 1);

            return {
                primaryLabel: "Converted value",
                primaryValue: `${formatNumber(converted, 6)} ${to}`,
                secondaryValue: `${formatNumber(value, 6)} ${from} equals ${formatNumber(converted, 6)} ${to}`,
                metrics: [
                    { label: "In kilograms", value: `${formatNumber(kilograms, 6)} kg` },
                    { label: "From unit", value: from.toUpperCase() },
                    { label: "To unit", value: to.toUpperCase() },
                ],
            };
        },
    },
    {
        id: "temperature-converter",
        name: "Temperature Converter",
        shortName: "Temperature",
        categoryId: "conversion",
        description: "Convert between Celsius, Fahrenheit, and Kelvin.",
        inputs: [
            { key: "value", label: "Temperature", kind: "number", defaultValue: "25", step: 0.1 },
            {
                key: "fromUnit",
                label: "From",
                kind: "select",
                defaultValue: "c",
                options: [
                    { label: "Celsius (C)", value: "c" },
                    { label: "Fahrenheit (F)", value: "f" },
                    { label: "Kelvin (K)", value: "k" },
                ],
            },
            {
                key: "toUnit",
                label: "To",
                kind: "select",
                defaultValue: "f",
                options: [
                    { label: "Celsius (C)", value: "c" },
                    { label: "Fahrenheit (F)", value: "f" },
                    { label: "Kelvin (K)", value: "k" },
                ],
            },
        ],
        compute: (values) => {
            const value = getNumber(values, "value", 25);
            const from = getString(values, "fromUnit", "c");
            const to = getString(values, "toUnit", "f");

            const toCelsius = (input: number, unit: string) => {
                if (unit === "f") return (input - 32) * (5 / 9);
                if (unit === "k") return input - 273.15;
                return input;
            };

            const fromCelsius = (input: number, unit: string) => {
                if (unit === "f") return input * (9 / 5) + 32;
                if (unit === "k") return input + 273.15;
                return input;
            };

            const celsius = toCelsius(value, from);
            const converted = fromCelsius(celsius, to);

            return {
                primaryLabel: "Converted temperature",
                primaryValue: `${formatNumber(converted, 2)} ${to.toUpperCase()}`,
                secondaryValue: `${formatNumber(value, 2)} ${from.toUpperCase()} equals ${formatNumber(converted, 2)} ${to.toUpperCase()}`,
                metrics: [
                    { label: "In Celsius", value: `${formatNumber(celsius, 2)} C` },
                    { label: "Freezing point delta", value: `${formatNumber(celsius - 0, 2)} C` },
                    { label: "Boiling point delta", value: `${formatNumber(100 - celsius, 2)} C` },
                ],
            };
        },
    },
    {
        id: "data-converter",
        name: "Data Size Converter",
        shortName: "Data Size",
        categoryId: "conversion",
        description: "Convert between bit, byte, KB, MB, GB, TB, and PB.",
        inputs: [
            { key: "value", label: "Value", kind: "number", defaultValue: "1", step: 0.01 },
            {
                key: "fromUnit",
                label: "From",
                kind: "select",
                defaultValue: "gb",
                options: [
                    { label: "Bit (b)", value: "b" },
                    { label: "Byte (B)", value: "B" },
                    { label: "Kilobyte (KB)", value: "kb" },
                    { label: "Megabyte (MB)", value: "mb" },
                    { label: "Gigabyte (GB)", value: "gb" },
                    { label: "Terabyte (TB)", value: "tb" },
                    { label: "Petabyte (PB)", value: "pb" },
                ],
            },
            {
                key: "toUnit",
                label: "To",
                kind: "select",
                defaultValue: "mb",
                options: [
                    { label: "Bit (b)", value: "b" },
                    { label: "Byte (B)", value: "B" },
                    { label: "Kilobyte (KB)", value: "kb" },
                    { label: "Megabyte (MB)", value: "mb" },
                    { label: "Gigabyte (GB)", value: "gb" },
                    { label: "Terabyte (TB)", value: "tb" },
                    { label: "Petabyte (PB)", value: "pb" },
                ],
            },
        ],
        compute: (values) => {
            const value = getNumber(values, "value", 1);
            const from = getString(values, "fromUnit", "gb");
            const to = getString(values, "toUnit", "mb");

            const toBytes: Record<string, number> = {
                b: 1 / 8,
                B: 1,
                kb: 1024,
                mb: 1024 * 1024,
                gb: 1024 * 1024 * 1024,
                tb: 1024 * 1024 * 1024 * 1024,
                pb: 1024 * 1024 * 1024 * 1024 * 1024,
            };

            const bytes = value * (toBytes[from] || 1);
            const converted = bytes / (toBytes[to] || 1);

            return {
                primaryLabel: "Converted size",
                primaryValue: `${formatNumber(converted, 6)} ${to}`,
                secondaryValue: `${formatNumber(value, 6)} ${from} equals ${formatNumber(converted, 6)} ${to}`,
                metrics: [
                    { label: "In bytes", value: `${formatNumber(bytes, 2)} B` },
                    { label: "From unit", value: from },
                    { label: "To unit", value: to },
                ],
            };
        },
    },
    {
        id: "area-converter",
        name: "Area Converter",
        shortName: "Area",
        categoryId: "conversion",
        description: "Convert between sq mm, sq cm, sq m, sq km, sq ft, sq yd, acre, and hectare.",
        inputs: [
            { key: "value", label: "Value", kind: "number", defaultValue: "100", step: 0.01 },
            {
                key: "fromUnit",
                label: "From",
                kind: "select",
                defaultValue: "sqm",
                options: [
                    { label: "Square millimeter (sq mm)", value: "sqmm" },
                    { label: "Square centimeter (sq cm)", value: "sqcm" },
                    { label: "Square meter (sq m)", value: "sqm" },
                    { label: "Square kilometer (sq km)", value: "sqkm" },
                    { label: "Square foot (sq ft)", value: "sqft" },
                    { label: "Square yard (sq yd)", value: "sqyd" },
                    { label: "Acre", value: "acre" },
                    { label: "Hectare", value: "hectare" },
                ],
            },
            {
                key: "toUnit",
                label: "To",
                kind: "select",
                defaultValue: "sqft",
                options: [
                    { label: "Square millimeter (sq mm)", value: "sqmm" },
                    { label: "Square centimeter (sq cm)", value: "sqcm" },
                    { label: "Square meter (sq m)", value: "sqm" },
                    { label: "Square kilometer (sq km)", value: "sqkm" },
                    { label: "Square foot (sq ft)", value: "sqft" },
                    { label: "Square yard (sq yd)", value: "sqyd" },
                    { label: "Acre", value: "acre" },
                    { label: "Hectare", value: "hectare" },
                ],
            },
        ],
        compute: (values) => {
            const value = getNumber(values, "value", 100);
            const from = getString(values, "fromUnit", "sqm");
            const to = getString(values, "toUnit", "sqft");

            const toSqMeters: Record<string, number> = {
                sqmm: 0.000001,
                sqcm: 0.0001,
                sqm: 1,
                sqkm: 1_000_000,
                sqft: 0.09290304,
                sqyd: 0.83612736,
                acre: 4046.8564224,
                hectare: 10_000,
            };

            const sqMeters = value * (toSqMeters[from] || 1);
            const converted = sqMeters / (toSqMeters[to] || 1);

            return {
                primaryLabel: "Converted area",
                primaryValue: `${formatNumber(converted, 6)} ${to}`,
                secondaryValue: `${formatNumber(value, 6)} ${from} equals ${formatNumber(converted, 6)} ${to}`,
                metrics: [
                    { label: "In square meters", value: `${formatNumber(sqMeters, 6)} sq m` },
                    { label: "From unit", value: from },
                    { label: "To unit", value: to },
                ],
            };
        },
    },
    {
        id: "volume-converter",
        name: "Volume Converter",
        shortName: "Volume",
        categoryId: "conversion",
        description: "Convert between milliliter, liter, cubic meter, cubic inch, cubic foot, cup, and gallon.",
        inputs: [
            { key: "value", label: "Value", kind: "number", defaultValue: "1", step: 0.01 },
            {
                key: "fromUnit",
                label: "From",
                kind: "select",
                defaultValue: "l",
                options: [
                    { label: "Milliliter (mL)", value: "ml" },
                    { label: "Liter (L)", value: "l" },
                    { label: "Cubic meter (m3)", value: "m3" },
                    { label: "Cubic inch (in3)", value: "in3" },
                    { label: "Cubic foot (ft3)", value: "ft3" },
                    { label: "Cup", value: "cup" },
                    { label: "US Gallon", value: "gal" },
                ],
            },
            {
                key: "toUnit",
                label: "To",
                kind: "select",
                defaultValue: "gal",
                options: [
                    { label: "Milliliter (mL)", value: "ml" },
                    { label: "Liter (L)", value: "l" },
                    { label: "Cubic meter (m3)", value: "m3" },
                    { label: "Cubic inch (in3)", value: "in3" },
                    { label: "Cubic foot (ft3)", value: "ft3" },
                    { label: "Cup", value: "cup" },
                    { label: "US Gallon", value: "gal" },
                ],
            },
        ],
        compute: (values) => {
            const value = getNumber(values, "value", 1);
            const from = getString(values, "fromUnit", "l");
            const to = getString(values, "toUnit", "gal");

            const toLiters: Record<string, number> = {
                ml: 0.001,
                l: 1,
                m3: 1000,
                in3: 0.016387064,
                ft3: 28.316846592,
                cup: 0.2365882365,
                gal: 3.785411784,
            };

            const liters = value * (toLiters[from] || 1);
            const converted = liters / (toLiters[to] || 1);

            return {
                primaryLabel: "Converted volume",
                primaryValue: `${formatNumber(converted, 6)} ${to}`,
                secondaryValue: `${formatNumber(value, 6)} ${from} equals ${formatNumber(converted, 6)} ${to}`,
                metrics: [
                    { label: "In liters", value: `${formatNumber(liters, 6)} L` },
                    { label: "From unit", value: from },
                    { label: "To unit", value: to },
                ],
            };
        },
    },
    {
        id: "speed-converter",
        name: "Speed Converter",
        shortName: "Speed",
        categoryId: "conversion",
        description: "Convert between meter/sec, kilometer/hour, mile/hour, foot/sec, and knot.",
        inputs: [
            { key: "value", label: "Value", kind: "number", defaultValue: "60", step: 0.01 },
            {
                key: "fromUnit",
                label: "From",
                kind: "select",
                defaultValue: "kmh",
                options: [
                    { label: "Meter per second (m/s)", value: "ms" },
                    { label: "Kilometer per hour (km/h)", value: "kmh" },
                    { label: "Mile per hour (mph)", value: "mph" },
                    { label: "Foot per second (ft/s)", value: "fts" },
                    { label: "Knot (kn)", value: "kn" },
                ],
            },
            {
                key: "toUnit",
                label: "To",
                kind: "select",
                defaultValue: "mph",
                options: [
                    { label: "Meter per second (m/s)", value: "ms" },
                    { label: "Kilometer per hour (km/h)", value: "kmh" },
                    { label: "Mile per hour (mph)", value: "mph" },
                    { label: "Foot per second (ft/s)", value: "fts" },
                    { label: "Knot (kn)", value: "kn" },
                ],
            },
        ],
        compute: (values) => {
            const value = getNumber(values, "value", 60);
            const from = getString(values, "fromUnit", "kmh");
            const to = getString(values, "toUnit", "mph");

            const toMetersPerSecond: Record<string, number> = {
                ms: 1,
                kmh: 0.2777777778,
                mph: 0.44704,
                fts: 0.3048,
                kn: 0.5144444444,
            };

            const metersPerSecond = value * (toMetersPerSecond[from] || 1);
            const converted = metersPerSecond / (toMetersPerSecond[to] || 1);

            return {
                primaryLabel: "Converted speed",
                primaryValue: `${formatNumber(converted, 6)} ${to}`,
                secondaryValue: `${formatNumber(value, 6)} ${from} equals ${formatNumber(converted, 6)} ${to}`,
                metrics: [
                    { label: "In m/s", value: `${formatNumber(metersPerSecond, 6)} m/s` },
                    { label: "From unit", value: from },
                    { label: "To unit", value: to },
                ],
            };
        },
    },
    {
        id: "time-converter",
        name: "Time Converter",
        shortName: "Time",
        categoryId: "conversion",
        description: "Convert between seconds, minutes, hours, days, weeks, months, and years.",
        inputs: [
            { key: "value", label: "Value", kind: "number", defaultValue: "1", step: 0.01 },
            {
                key: "fromUnit",
                label: "From",
                kind: "select",
                defaultValue: "hour",
                options: [
                    { label: "Second", value: "second" },
                    { label: "Minute", value: "minute" },
                    { label: "Hour", value: "hour" },
                    { label: "Day", value: "day" },
                    { label: "Week", value: "week" },
                    { label: "Month (avg)", value: "month" },
                    { label: "Year (avg)", value: "year" },
                ],
            },
            {
                key: "toUnit",
                label: "To",
                kind: "select",
                defaultValue: "day",
                options: [
                    { label: "Second", value: "second" },
                    { label: "Minute", value: "minute" },
                    { label: "Hour", value: "hour" },
                    { label: "Day", value: "day" },
                    { label: "Week", value: "week" },
                    { label: "Month (avg)", value: "month" },
                    { label: "Year (avg)", value: "year" },
                ],
            },
        ],
        compute: (values) => {
            const value = getNumber(values, "value", 1);
            const from = getString(values, "fromUnit", "hour");
            const to = getString(values, "toUnit", "day");

            const toSeconds: Record<string, number> = {
                second: 1,
                minute: 60,
                hour: 3600,
                day: 86400,
                week: 604800,
                month: 2629746, // 30.44 days average month
                year: 31556952, // 365.2425 days average year
            };

            const seconds = value * (toSeconds[from] || 1);
            const converted = seconds / (toSeconds[to] || 1);

            return {
                primaryLabel: "Converted time",
                primaryValue: `${formatNumber(converted, 6)} ${to}`,
                secondaryValue: `${formatNumber(value, 6)} ${from} equals ${formatNumber(converted, 6)} ${to}`,
                metrics: [
                    { label: "In seconds", value: `${formatNumber(seconds, 2)} s` },
                    { label: "From unit", value: from },
                    { label: "To unit", value: to },
                ],
            };
        },
    },
];

export function buildDefaultCalculatorsSettings(): CalculatorsModuleSettings {
    const enabledCategories: Record<string, boolean> = {};
    const enabledCalculators: Record<string, boolean> = {};

    for (const category of CALCULATOR_CATEGORIES) {
        enabledCategories[category.id] = true;
    }

    for (const calculator of CALCULATOR_DEFINITIONS) {
        enabledCalculators[calculator.id] = true;
    }

    return {
        enabledCategories,
        enabledCalculators,
    };
}

export function getCalculatorById(id: string) {
    return CALCULATOR_DEFINITIONS.find((calculator) => calculator.id === id);
}
