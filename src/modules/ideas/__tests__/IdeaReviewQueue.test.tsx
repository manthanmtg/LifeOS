import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import IdeaReviewQueue from "../components/IdeaReviewQueue";
import type { IdeaRecord } from "../shared";

function makeIdea(id: string, title: string): IdeaRecord {
  return {
    _id: id,
    created_at: "2026-03-01T09:00:00.000Z",
    updated_at: "2026-03-02T10:15:00.000Z",
    payload: {
      title,
      description: "A captured idea worth reviewing.",
      status: "raw",
      priority: "medium",
      tags: [],
    },
  };
}

describe("IdeaReviewQueue", () => {
  it("describes hidden review candidates without implying they are high priority", () => {
    render(
      <IdeaReviewQueue
        reviewQueue={[
          makeIdea("idea-1", "First idea"),
          makeIdea("idea-2", "Second idea"),
        ]}
        reviewCount={4}
        onSelectIdea={vi.fn()}
      />,
    );

    expect(screen.getByText("2 more review candidates")).toBeInTheDocument();
    expect(screen.queryByText(/high-priority/)).not.toBeInTheDocument();
  });

  it("opens the selected idea from the queue", () => {
    const onSelectIdea = vi.fn();
    const idea = makeIdea("idea-1", "First idea");

    render(
      <IdeaReviewQueue
        reviewQueue={[idea]}
        reviewCount={1}
        onSelectIdea={onSelectIdea}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /first idea/i }));

    expect(onSelectIdea).toHaveBeenCalledWith(idea);
  });
});
