import type { IdeaRecord } from "./shared";

export interface IdeaMetrics {
  total: number;
  promoted: number;
  active: number;
  archived: number;
  exploring: number;
  raw: number;
  highPriority: number;
  reviewCount: number;
  topCategory: string | null;
}

interface IdeaFilterState {
  searchQuery: string;
  statusFilter: string;
  priorityFilter: string;
  categoryFilter: string;
}

const IDEA_REVIEW_STATUSES = new Set(["raw", "exploring"]);

function getIdeaTimestampValue(idea: IdeaRecord): number {
  return new Date(idea.updated_at ?? idea.created_at).getTime();
}

function getIdeaPriorityRank(priority: string): number {
  switch (priority) {
    case "high":
      return 0;
    case "medium":
      return 1;
    default:
      return 2;
  }
}

function isIdeaReviewCandidate(idea: IdeaRecord): boolean {
  return IDEA_REVIEW_STATUSES.has(idea.payload.status);
}

export function normalizeIdeaCategories(categories: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  categories.forEach((category) => {
    const value = category.trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return;
    seen.add(key);
    normalized.push(value);
  });

  return normalized;
}

export function getIdeaMetrics(ideas: IdeaRecord[]): IdeaMetrics {
  const categoryCounts = new Map<string, number>();

  const metrics = ideas.reduce<IdeaMetrics>(
    (acc, idea) => {
      acc.total += 1;

      if (idea.payload.promoted_to_portfolio) {
        acc.promoted += 1;
      }

      if (idea.payload.status === "archived") {
        acc.archived += 1;
      } else {
        acc.active += 1;
      }

      if (idea.payload.status === "exploring") {
        acc.exploring += 1;
      }

      if (idea.payload.status === "raw") {
        acc.raw += 1;
      }

      if (
        idea.payload.priority === "high" &&
        idea.payload.status !== "archived"
      ) {
        acc.highPriority += 1;
      }

      if (isIdeaReviewCandidate(idea)) {
        acc.reviewCount += 1;
      }

      if (idea.payload.category) {
        categoryCounts.set(
          idea.payload.category,
          (categoryCounts.get(idea.payload.category) ?? 0) + 1,
        );
      }

      return acc;
    },
    {
      total: 0,
      promoted: 0,
      active: 0,
      archived: 0,
      exploring: 0,
      raw: 0,
      highPriority: 0,
      reviewCount: 0,
      topCategory: null,
    },
  );

  metrics.topCategory =
    [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return metrics;
}

export function getIdeaSpotlight(ideas: IdeaRecord[]): IdeaRecord | null {
  return (
    [...ideas]
      .filter((idea) => idea.payload.status !== "archived")
      .sort((a, b) => {
        const priorityDiff =
          getIdeaPriorityRank(a.payload.priority) -
          getIdeaPriorityRank(b.payload.priority);
        if (priorityDiff !== 0) return priorityDiff;

        if (a.payload.status !== b.payload.status) {
          return a.payload.status === "exploring" ? -1 : 1;
        }

        return getIdeaTimestampValue(b) - getIdeaTimestampValue(a);
      })[0] ?? null
  );
}

export function getIdeaReviewQueue(
  ideas: IdeaRecord[],
  limit = 3,
): IdeaRecord[] {
  return [...ideas]
    .filter(isIdeaReviewCandidate)
    .sort((a, b) => {
      const priorityDiff =
        getIdeaPriorityRank(a.payload.priority) -
        getIdeaPriorityRank(b.payload.priority);
      if (priorityDiff !== 0) return priorityDiff;

      if (a.payload.status !== b.payload.status) {
        return a.payload.status === "exploring" ? -1 : 1;
      }

      return getIdeaTimestampValue(b) - getIdeaTimestampValue(a);
    })
    .slice(0, limit);
}

export function getIdeaCategoryOptions(
  ideas: IdeaRecord[],
  seededCategories: string[] = [],
): string[] {
  const categories = ideas
    .map((idea) => idea.payload.category ?? "")
    .filter(Boolean);

  return normalizeIdeaCategories([...seededCategories, ...categories]);
}

export function filterIdeas(
  ideas: IdeaRecord[],
  filters: IdeaFilterState,
): IdeaRecord[] {
  const query = filters.searchQuery.trim().toLowerCase();

  return ideas.filter((idea) => {
    if (
      filters.statusFilter !== "all" &&
      idea.payload.status !== filters.statusFilter
    ) {
      return false;
    }

    if (
      filters.priorityFilter !== "all" &&
      idea.payload.priority !== filters.priorityFilter
    ) {
      return false;
    }

    if (
      filters.categoryFilter !== "all" &&
      (idea.payload.category ?? "") !== filters.categoryFilter
    ) {
      return false;
    }

    if (!query) return true;

    const haystack = [
      idea.payload.title,
      idea.payload.description ?? "",
      idea.payload.notes ?? "",
      idea.payload.category ?? "",
      ...idea.payload.tags,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function sortIdeasForReview(ideas: IdeaRecord[]): IdeaRecord[] {
  return [...ideas].sort((a, b) => {
    const priorityDiff =
      getIdeaPriorityRank(a.payload.priority) -
      getIdeaPriorityRank(b.payload.priority);
    if (priorityDiff !== 0) return priorityDiff;

    return getIdeaTimestampValue(b) - getIdeaTimestampValue(a);
  });
}
