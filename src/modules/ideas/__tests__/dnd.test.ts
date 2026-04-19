import { describe, expect, it } from "vitest";

import { normalizeIdeaBoardOrder, projectIdeaBoardMove } from "../dnd";
import type { IdeaRecord } from "../shared";

function makeIdea(
  id: string,
  status: "raw" | "exploring" | "archived",
  order: number,
): IdeaRecord {
  return {
    _id: id,
    created_at: `2026-03-0${order + 1}T09:00:00.000Z`,
    updated_at: `2026-03-0${order + 1}T09:00:00.000Z`,
    payload: {
      title: id,
      status,
      order,
      priority: "medium",
      tags: [],
    },
  };
}

describe("ideas dnd helpers", () => {
  it("moves an idea into the targeted column instead of another column", () => {
    const ideas = normalizeIdeaBoardOrder([
      makeIdea("raw-1", "raw", 0),
      makeIdea("raw-2", "raw", 1),
      makeIdea("exploring-1", "exploring", 0),
      makeIdea("archived-1", "archived", 0),
    ]);

    const moved = projectIdeaBoardMove({
      ideas,
      activeId: "raw-1",
      overId: "exploring-1",
    });

    const rawIdeas = moved.filter((idea) => idea.payload.status === "raw");
    const exploringIdeas = moved.filter(
      (idea) => idea.payload.status === "exploring",
    );
    const archivedIdeas = moved.filter(
      (idea) => idea.payload.status === "archived",
    );

    expect(rawIdeas.map((idea) => idea._id)).toEqual(["raw-2"]);
    expect(exploringIdeas.map((idea) => idea._id)).toEqual([
      "raw-1",
      "exploring-1",
    ]);
    expect(archivedIdeas.map((idea) => idea._id)).toEqual(["archived-1"]);
  });

  it("appends to the end when dropping on an empty part of a column", () => {
    const ideas = normalizeIdeaBoardOrder([
      makeIdea("raw-1", "raw", 0),
      makeIdea("exploring-1", "exploring", 0),
      makeIdea("exploring-2", "exploring", 1),
    ]);

    const moved = projectIdeaBoardMove({
      ideas,
      activeId: "raw-1",
      overId: "exploring",
    });

    const exploringIdeas = moved.filter(
      (idea) => idea.payload.status === "exploring",
    );

    expect(exploringIdeas.map((idea) => idea._id)).toEqual([
      "exploring-1",
      "exploring-2",
      "raw-1",
    ]);
    expect(exploringIdeas.map((idea) => idea.payload.order)).toEqual([0, 1, 2]);
  });
});
