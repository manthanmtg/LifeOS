export interface Expense {
  _id: string;
  payload: {
    amount: number;
    currency: string;
    description: string;
    merchant?: string;
    account?: Prediction["account"];
    category: string;
    subcategory?: string;
    tags?: string[];
    date: string;
    type: "income" | "expense";
    is_recurring: boolean;
  };
  created_at: string;
}

export interface ExpenseSettings {
  categories: string[];
  defaultCurrency: string;
  monthlyBudget: number;
  numberFormat: "western" | "indian";
  [key: string]: unknown;
}

export interface DashboardTabProps {
  expenses: Expense[];
  loading: boolean;
  settings: ExpenseSettings;
  onRefresh: () => void;
  onUpdateSettings: (settings: Partial<ExpenseSettings>) => void;
}

export interface AnalyticsTabProps {
  expenses: Expense[];
  loading: boolean;
  settings: ExpenseSettings;
}

export interface SettingsTabProps {
  settings: ExpenseSettings;
  onUpdateSettings: (updates: Partial<ExpenseSettings>) => Promise<void>;
}

export interface Prediction {
  description: string;
  merchant?: string;
  account:
    | "Cash"
    | "Debit Card"
    | "Credit Card"
    | "Bank Transfer"
    | "UPI"
    | "Other";
  category: string;
  subcategory?: string;
  tags: string[];
  frequency: number;
}

export const DEFAULT_CATEGORIES = [
  "Housing",
  "Food",
  "Transportation",
  "Utilities",
  "Entertainment",
  "Tech/Recurring",
  "Health",
  "Other",
  "Shopping",
  "Education",
  "Travel",
  "Insurance",
  "Investments",
  "Subscriptions",
  "Personal Care",
  "Gifts/Donations",
  "Taxes",
  "Business Expenses",
  "Home Maintenance",
  "Childcare",
  "Pet Care",
];

export const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "INR",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "CNY",
  "BRL",
];

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

export const CATEGORY_COLORS: Record<string, string> = {
  Housing: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Food: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  Transportation: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  Utilities: "bg-warning/15 text-warning border-warning/20",
  Entertainment: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  "Tech/Recurring": "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  Health: "bg-success/15 text-success border-success/20",
  Other: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  Shopping: "bg-rose-500/15 text-rose-400 border-rose-500/20",
  Education: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  Travel: "bg-teal-500/15 text-teal-400 border-teal-500/20",
  Insurance: "bg-warning/15 text-warning border-warning/20",
  Investments: "bg-success/15 text-success border-success/20",
  Subscriptions: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  "Personal Care": "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/20",
  "Gifts/Donations": "bg-pink-500/15 text-pink-400 border-pink-500/20",
  Taxes: "bg-danger/15 text-danger border-danger/20",
  "Business Expenses": "bg-slate-500/15 text-slate-400 border-slate-500/20",
  "Home Maintenance": "bg-stone-500/15 text-stone-400 border-stone-500/20",
  Childcare: "bg-lime-500/15 text-lime-400 border-lime-500/20",
  "Pet Care": "bg-orange-500/15 text-orange-400 border-orange-500/20",
};

export const DYNAMIC_COLORS = [
  "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "bg-orange-500/15 text-orange-400 border-orange-500/20",
  "bg-purple-500/15 text-purple-400 border-purple-500/20",
  "bg-warning/15 text-warning border-warning/20",
  "bg-pink-500/15 text-pink-400 border-pink-500/20",
  "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  "bg-success/15 text-success border-success/20",
  "bg-rose-500/15 text-rose-400 border-rose-500/20",
  "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  "bg-teal-500/15 text-teal-400 border-teal-500/20",
];

export function getCategoryColor(cat: string, allCats: string[]): string {
  if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat];
  const idx = allCats.indexOf(cat);
  return (
    DYNAMIC_COLORS[idx % DYNAMIC_COLORS.length] ||
    "bg-zinc-500/15 text-zinc-400 border-zinc-500/20"
  );
}

export function formatNumber(
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
    }
    while (remaining.length > 2) {
      result = "," + remaining.slice(-2) + result;
      remaining = remaining.slice(0, -2);
    }
    return remaining + result;
  }
  return Math.round(num).toLocaleString("en-US");
}
