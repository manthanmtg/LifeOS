export type ExpenseSpaceStatus = "active" | "archived";
export type ExpenseSpaceNumberFormat = "western" | "indian";
export type ExpenseSpaceBudgetCadence = "total" | "monthly";

export type ExpensePaymentMethod =
  | "Cash"
  | "Debit Card"
  | "Credit Card"
  | "Bank Transfer"
  | "UPI"
  | "Cheque"
  | "Other";

export interface ExpenseSpaceSubcategory {
  id: string;
  name: string;
  is_active: boolean;
}

export interface ExpenseSpaceCategory {
  id: string;
  name: string;
  is_active: boolean;
  subcategories: ExpenseSpaceSubcategory[];
}

export interface ExpenseSpaceBudget {
  amount: number;
  cadence: ExpenseSpaceBudgetCadence;
}

export interface ExpenseSpacePayload {
  space_key: string;
  name: string;
  description?: string;
  currency: string;
  number_format: ExpenseSpaceNumberFormat;
  budget?: ExpenseSpaceBudget;
  status: ExpenseSpaceStatus;
  categories: ExpenseSpaceCategory[];
}

export interface ExpenseSpaceEntryPayload {
  space_key: string;
  amount: number;
  currency: string;
  description: string;
  paid_to: string;
  category_id: string;
  subcategory_id?: string;
  date: string;
  payment_method?: ExpensePaymentMethod;
  reference?: string;
  notes?: string;
  tags: string[];
  receipt_url?: string;
}

export interface ExpenseSpaceDocument {
  _id: string;
  module_type: "expense_space";
  is_public: false;
  created_at: string;
  updated_at: string;
  payload: ExpenseSpacePayload;
}

export interface ExpenseSpaceEntryDocument {
  _id: string;
  module_type: "expense_space_entry";
  is_public: false;
  created_at: string;
  updated_at: string;
  payload: ExpenseSpaceEntryPayload;
}

export interface ExpenseSpaceSummary extends ExpenseSpaceDocument {
  summary: {
    entry_count: number;
    total_spend: number;
    this_month_spend: number;
    last_entry_date: string | null;
    top_category?: string;
  };
}

export interface ExpenseSpaceDetail extends ExpenseSpaceDocument {
  entry_count: number;
  used_category_ids?: string[];
  used_subcategory_ids?: string[];
}

export interface ExpenseSpaceCreateInput {
  name: string;
  description?: string;
  currency: string;
  number_format: ExpenseSpaceNumberFormat;
  budget?: ExpenseSpaceBudget;
  categories?: Array<{
    id?: string;
    name: string;
    is_active?: boolean;
    subcategories?: Array<{
      id?: string;
      name: string;
      is_active?: boolean;
    }>;
  }>;
}

export interface ExpenseSpaceUpdateInput {
  name: string;
  description?: string;
  currency: string;
  number_format: ExpenseSpaceNumberFormat;
  budget?: ExpenseSpaceBudget;
  status: ExpenseSpaceStatus;
  categories: ExpenseSpaceCategory[];
  expected_updated_at: string;
}

export type ExpenseSpaceEntryInput = Omit<
  ExpenseSpaceEntryPayload,
  "space_key" | "currency"
>;

export interface ExpenseEntryFilters {
  page: number;
  pageSize: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  subcategoryId?: string;
  paidTo?: string;
  paymentMethod?: ExpensePaymentMethod;
  sort: "date-desc" | "date-asc" | "amount-desc" | "amount-asc" | "paid-to-asc";
}

export interface ExpenseEntryPage {
  entries: ExpenseSpaceEntryDocument[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  facets: {
    paid_to: string[];
    payment_methods: ExpensePaymentMethod[];
  };
}

export interface ExpenseSpaceAnalytics {
  scope: "space" | "all";
  currency: string;
  range: { from: string | null; to: string | null };
  totals: { amount: number; count: number; average: number };
  by_space: Array<{ id: string; name: string; amount: number; count: number }>;
  by_category: Array<{ name: string; amount: number; count: number }>;
  by_subcategory: Array<{
    category: string;
    subcategory: string;
    amount: number;
    count: number;
  }>;
  by_paid_to: Array<{ name: string; amount: number; count: number }>;
  by_payment_method: Array<{
    name: string;
    amount: number;
    count: number;
  }>;
  by_month: Array<{ month: string; amount: number; count: number }>;
  largest_expenses: Array<{
    id: string;
    space_id: string;
    space_name: string;
    description: string;
    paid_to: string;
    amount: number;
    date: string;
  }>;
}

export interface ExpenseSpaceAnalyticsResponse extends ExpenseSpaceAnalytics {
  available_currencies: string[];
  no_conversion: true;
}

export type ExpenseSpacesView = "overview" | "analytics";
export type ExpenseSpaceTab = "expenses" | "analytics" | "settings";

export interface ExpenseSpacesWidgetSummary {
  active_spaces: number;
  entries_this_month: number;
  spaces_with_budgets: number;
  currencies_in_use: number;
}
