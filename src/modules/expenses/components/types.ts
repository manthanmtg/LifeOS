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
  Housing: "bg-accent/15 text-accent border-accent/20",
  Food: "bg-warning/15 text-warning border-warning/20",
  Transportation: "bg-accent/15 text-accent border-accent/20",
  Utilities: "bg-warning/15 text-warning border-warning/20",
  Entertainment: "bg-danger/15 text-danger border-danger/20",
  "Tech/Recurring": "bg-accent/15 text-accent border-accent/20",
  Health: "bg-success/15 text-success border-success/20",
  Other: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  Shopping: "bg-danger/15 text-danger border-danger/20",
  Education: "bg-accent/15 text-accent border-accent/20",
  Travel: "bg-success/15 text-success border-success/20",
  Insurance: "bg-warning/15 text-warning border-warning/20",
  Investments: "bg-success/15 text-success border-success/20",
  Subscriptions: "bg-accent/15 text-accent border-accent/20",
  "Personal Care": "bg-success/15 text-success border-success/20",
  "Gifts/Donations": "bg-warning/15 text-warning border-warning/20",
  Taxes: "bg-danger/15 text-danger border-danger/20",
  "Business Expenses": "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  "Home Maintenance": "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  Childcare: "bg-success/15 text-success border-success/20",
  "Pet Care": "bg-warning/15 text-warning border-warning/20",
};

const DYNAMIC_COLORS = [
  "bg-accent/15 text-accent border-accent/20",
  "bg-warning/15 text-warning border-warning/20",
  "bg-success/15 text-success border-success/20",
  "bg-danger/15 text-danger border-danger/20",
  "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
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
