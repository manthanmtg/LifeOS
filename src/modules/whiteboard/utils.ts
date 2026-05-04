export type ColorLabel =
  | "none"
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "purple"
  | "orange";

export type SortOption = "updated" | "created" | "name" | "favorites";

export interface ContentDoc {
  _id: string;
  module_type: string;
  is_public: boolean;
  payload: {
    name: string;
    description?: string;
    tags: string[];
    is_favorite: boolean;
    color_label: ColorLabel;
    elements: Record<string, unknown>[];
    app_state: Record<string, unknown>;
    files: Record<string, unknown>;
  };
  created_at: string;
  updated_at: string;
}

export const COLOR_LABELS: { value: ColorLabel; dot: string; label: string }[] = [
  { value: "none", dot: "bg-zinc-600", label: "None" },
  { value: "red", dot: "bg-danger", label: "Red" },
  { value: "blue", dot: "bg-accent", label: "Blue" },
  { value: "green", dot: "bg-success", label: "Green" },
  { value: "yellow", dot: "bg-warning", label: "Yellow" },
  { value: "purple", dot: "bg-zinc-500", label: "Purple" },
  { value: "orange", dot: "bg-zinc-400", label: "Orange" },
];

export const COLOR_BORDER: Record<string, string> = {
  none: "",
  red: "border-l-danger/60",
  blue: "border-l-accent/60",
  green: "border-l-success/60",
  yellow: "border-l-warning/60",
  purple: "border-l-zinc-500/60",
  orange: "border-l-zinc-400/60",
};

export function relativeTime(dateStr: string, now: number): string {
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}
