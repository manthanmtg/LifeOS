import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SnippetsWidget from "../Widget";

describe("SnippetsWidget", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows a useful empty state when no snippets exist", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          data: {
            total: 0,
            favorites: 0,
            languageCount: 0,
          },
        }),
    });

    render(React.createElement(SnippetsWidget));

    expect(await screen.findByText("No snippets yet")).toBeInTheDocument();
    expect(
      screen.getByText("Save reusable code as you go"),
    ).toBeInTheDocument();
    expect(screen.queryByText("0 languages collected")).not.toBeInTheDocument();
  });
});
