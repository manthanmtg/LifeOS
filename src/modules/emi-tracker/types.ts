type InterestType = "fixed" | "floating";
export type RecastStrategy =
  | "keep_tenure_adjust_emi"
  | "keep_emi_adjust_tenure";
export type DocType =
  | "sanction_letter"
  | "noc"
  | "interest_certificate"
  | "other";
export type PaymentKind = "emi" | "prepayment";
type LoanStatus = "active" | "closed" | "archived";

export interface EmiLoan {
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
    rate_adjustments: Array<{
      effective_date: string;
      annual_interest_rate: number;
      note?: string;
    }>;
    payments: Array<{
      date: string;
      amount: number;
      kind: PaymentKind;
      note?: string;
      receipt_url?: string;
    }>;
    documents: Array<{
      type: DocType;
      title: string;
      url: string;
      issued_at?: string;
      added_at: string;
    }>;
    status: LoanStatus;
    closed_at?: string;
  };
}

export interface EmiTrackerSettings {
  defaultCurrency: string;
  defaultDueDayOfMonth: number;
  roundingDecimals: number;
  numberFormat: "western" | "indian";
  defaultRecastStrategy: RecastStrategy;
  categories: string[];
  [key: string]: unknown;
}

export type ScheduleRow = {
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

export type ScheduleResult = {
  rows: ScheduleRow[];
  totals: {
    total_emi: number;
    total_interest: number;
    total_principal: number;
    total_prepayment: number;
  };
  computed_emi_suggestion: number | null;
  warnings: string[];
};
