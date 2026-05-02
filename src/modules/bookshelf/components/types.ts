export const STATUSES = [
  "want_to_read",
  "reading",
  "completed",
  "abandoned",
] as const;

export type BookStatus = (typeof STATUSES)[number];

export interface BookPayload {
  title: string;
  author: string;
  isbn?: string;
  cover_url?: string;
  status: BookStatus;
  total_pages?: number;
  current_page: number;
  rating?: number;
  started_at?: string;
  finished_at?: string;
  summary?: string;
  notes?: string;
  tags: string[];
}

export interface Book {
  _id: string;
  created_at: string;
  payload: BookPayload;
}

export interface BookshelfSettings {
  defaultStatus: BookStatus;
  yearlyGoal: number;
  [key: string]: unknown;
}

export const BOOKSHELF_DEFAULTS: BookshelfSettings = {
  defaultStatus: "want_to_read",
  yearlyGoal: 0,
};

export const STATUS_LABELS: Record<BookStatus, string> = {
  want_to_read: "Want to Read",
  reading: "Reading",
  completed: "Completed",
  abandoned: "Abandoned",
};

export const STATUS_STYLES: Record<BookStatus, string> = {
  want_to_read: "bg-accent/15 text-accent border-accent/25",
  reading: "bg-warning/15 text-warning border-warning/25",
  completed: "bg-success/15 text-success border-success/25",
  abandoned: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
};

export interface BookshelfStats {
  total: number;
  reading: number;
  completed: number;
  wantToRead: number;
  abandoned: number;
  goal: number;
  goalProgress: number;
  avgRating: number;
  totalPagesRead: number;
  avgPagesPerBook: number;
  completionRate: number;
  monthlyCompletions: number[];
}

export function parseOptionalPositiveIntegerField(
  input: string,
  label: string,
) {
  const trimmed = input.trim();
  if (!trimmed) return { value: undefined };

  const value = Number(trimmed);
  if (!Number.isInteger(value) || value <= 0) {
    return { error: `${label} must be a positive whole number` };
  }

  return { value };
}

export function parseNonNegativeIntegerField(input: string, label: string) {
  const trimmed = input.trim();
  if (!trimmed) return { value: 0 };

  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 0) {
    return { error: `${label} must be zero or a positive whole number` };
  }

  return { value };
}

export function toDateInputValue(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function toISODate(dateInput: string): string | undefined {
  if (!dateInput) return undefined;
  const parsed = new Date(dateInput);
  if (!Number.isFinite(parsed.getTime())) return undefined;
  return parsed.toISOString();
}
