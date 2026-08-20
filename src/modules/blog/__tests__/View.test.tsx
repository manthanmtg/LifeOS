import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BlogView from "../View";

describe("BlogView", () => {
  it("renders server-provided posts without a client fetch", () => {
    global.fetch = vi.fn();

    render(
      <BlogView
        initialPosts={[
          {
            _id: "post-1",
            created_at: "2026-08-20T00:00:00.000Z",
            payload: {
              title: "Rendered on the server",
              slug: "rendered-on-the-server",
              content: "A useful post.",
              status: "published",
              tags: [],
            },
          },
        ]}
      />,
    );

    expect(screen.getByText("Rendered on the server")).toBeVisible();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(
      screen.getByRole("searchbox", { name: "Search posts" }),
    ).toBeVisible();
  });
});
