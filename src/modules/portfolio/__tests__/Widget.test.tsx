import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PortfolioWidget from "../Widget";

describe("PortfolioWidget", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows the empty state when the summary endpoint has no profile payload", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          data: {},
        }),
    });

    render(React.createElement(PortfolioWidget));

    expect(await screen.findByText("No profile yet")).toBeInTheDocument();
    expect(
      await screen.findByText("Set up your first portfolio profile"),
    ).toBeInTheDocument();
  });

  it("shows profile readiness from the portfolio summary", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          data: {
            full_name: "Avery Stone",
            hero_title: "Product Engineer",
            sub_headline: "Building thoughtful operating systems.",
            bio: "I design and build focused tools for work, writing, and personal systems.",
            skills: ["TypeScript", "React", "Next.js", "Product"],
            social_links: [
              { platform: "GitHub", url: "https://github.com/avery" },
              { platform: "Website", url: "https://avery.example" },
            ],
            available_for_hire: true,
          },
        }),
    });

    render(React.createElement(PortfolioWidget));

    expect(await screen.findByText("100%")).toBeInTheDocument();
    expect(screen.getByText("profile ready")).toBeInTheDocument();
    expect(screen.getByText("2 verified links")).toHaveClass(
      "min-w-0",
      "truncate",
    );
  });
});
