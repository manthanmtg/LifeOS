import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BlogWidget from "../Widget";

describe("BlogWidget", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("surfaces draft backlog when no posts are published", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          data: {
            total: 3,
            published: 0,
            drafts: 3,
            archived: 0,
            totalReadMinutes: 0,
            latestPublishedPost: null,
          },
        }),
    });

    render(React.createElement(BlogWidget));

    expect(
      await screen.findByText("3 drafts ready to shape"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No published posts yet"),
    ).not.toBeInTheDocument();
  });
});
