import type { IdeaRecord } from "./shared";

export const IDEA_BOARD_STATUSES = ["raw", "exploring", "archived"] as const;

export type IdeaBoardStatus = (typeof IDEA_BOARD_STATUSES)[number];

const IDEA_STATUS_SET = new Set<string>(IDEA_BOARD_STATUSES);

function sortIdeasWithinColumn(a: IdeaRecord, b: IdeaRecord): number {
  const orderA = a.payload.order ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.payload.order ?? Number.MAX_SAFE_INTEGER;

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function buildColumns(
  ideas: IdeaRecord[],
): Record<IdeaBoardStatus, IdeaRecord[]> {
  const columns = {
    raw: [] as IdeaRecord[],
    exploring: [] as IdeaRecord[],
    archived: [] as IdeaRecord[],
  };

  ideas.forEach((idea) => {
    if (isIdeaBoardStatus(idea.payload.status)) {
      columns[idea.payload.status].push(idea);
    }
  });

  IDEA_BOARD_STATUSES.forEach((status) => {
    columns[status].sort(sortIdeasWithinColumn);
  });

  return columns;
}

function rebuildBoard(
  columns: Record<IdeaBoardStatus, IdeaRecord[]>,
): IdeaRecord[] {
  return IDEA_BOARD_STATUSES.flatMap((status) =>
    columns[status].map((idea, index) => ({
      ...idea,
      payload: {
        ...idea.payload,
        status,
        order: index,
      },
    })),
  );
}

export function isIdeaBoardStatus(value: string): value is IdeaBoardStatus {
  return IDEA_STATUS_SET.has(value);
}

export function getIdeaBoardStatus(
  value: string,
  ideas: IdeaRecord[],
): IdeaBoardStatus | null {
  if (isIdeaBoardStatus(value)) {
    return value;
  }

  const matchedIdea = ideas.find((idea) => idea._id === value);
  if (!matchedIdea || !isIdeaBoardStatus(matchedIdea.payload.status)) {
    return null;
  }

  return matchedIdea.payload.status;
}

export function normalizeIdeaBoardOrder(ideas: IdeaRecord[]): IdeaRecord[] {
  return rebuildBoard(buildColumns(ideas));
}

export function projectIdeaBoardMove({
  ideas,
  activeId,
  overId,
  insertAfter = false,
}: {
  ideas: IdeaRecord[];
  activeId: string;
  overId: string;
  insertAfter?: boolean;
}): IdeaRecord[] {
  const activeStatus = getIdeaBoardStatus(activeId, ideas);
  const overStatus = getIdeaBoardStatus(overId, ideas);

  if (!activeStatus || !overStatus) {
    return normalizeIdeaBoardOrder(ideas);
  }

  const columns = buildColumns(ideas);
  const sourceColumn = [...columns[activeStatus]];
  const activeIndex = sourceColumn.findIndex((idea) => idea._id === activeId);

  if (activeIndex === -1) {
    return normalizeIdeaBoardOrder(ideas);
  }

  const [activeIdea] = sourceColumn.splice(activeIndex, 1);

  if (!activeIdea) {
    return normalizeIdeaBoardOrder(ideas);
  }

  columns[activeStatus] = sourceColumn;

  const targetColumn =
    activeStatus === overStatus ? sourceColumn : [...columns[overStatus]];
  const nextIdea =
    activeStatus === overStatus
      ? activeIdea
      : {
          ...activeIdea,
          payload: {
            ...activeIdea.payload,
            status: overStatus,
          },
        };

  let targetIndex = targetColumn.length;

  if (!isIdeaBoardStatus(overId)) {
    const overIdeaIndex = targetColumn.findIndex((idea) => idea._id === overId);
    if (overIdeaIndex !== -1) {
      targetIndex = overIdeaIndex + (insertAfter ? 1 : 0);
    }
  }

  targetColumn.splice(Math.min(targetIndex, targetColumn.length), 0, nextIdea);
  columns[overStatus] = targetColumn;

  return rebuildBoard(columns);
}
