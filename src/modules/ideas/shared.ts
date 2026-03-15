export interface IdeaPayload {
    title: string;
    description?: string;
    notes?: string;
    category?: string;
    status: string;
    tags: string[];
    priority: string;
    promoted_to_portfolio?: boolean;
    promoted_at?: string;
    order?: number;
}

export interface IdeaRecord {
    _id: string;
    created_at: string;
    updated_at?: string;
    payload: IdeaPayload;
}

export const IDEA_STATUS_LABELS: Record<string, string> = {
    raw: "Raw",
    exploring: "Exploring",
    archived: "Archived",
};

export const IDEA_STATUS_STYLES: Record<string, string> = {
    raw: "bg-zinc-500/15 text-zinc-300 border-zinc-500/25",
    exploring: "bg-blue-500/15 text-blue-300 border-blue-500/25",
    archived: "bg-zinc-500/15 text-zinc-500 border-zinc-500/25",
};

export const IDEA_PRIORITY_STYLES: Record<string, string> = {
    high: "bg-danger/15 text-danger border-danger/25",
    medium: "bg-warning/15 text-warning border-warning/25",
    low: "bg-success/15 text-success border-success/25",
};

export function formatIdeaTimestamp(iso?: string): string | null {
    if (!iso) return null;

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;

    return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}
