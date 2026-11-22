import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import PortfolioShowcase, { PortfolioProfile } from "../PortfolioShowcase";
import PortfolioPublicView from "../PublicView";

const baseProfile: PortfolioProfile = {
  full_name: "Ada Lovelace",
  hero_title: "Building thoughtful systems",
  sub_headline: "Engineer and product thinker",
  bio: "I build focused software with a strong product lens.",
  skills: ["TypeScript", "React"],
  social_links: [],
  available_for_hire: true,
};

describe("PortfolioShowcase", () => {
  it("does not render the contact CTA without a usable social link", () => {
    render(
      React.createElement(PortfolioShowcase, {
        profile: {
          ...baseProfile,
          social_links: [{ platform: "LinkedIn", url: " " }],
        },
      }),
    );

    expect(
      screen.queryByRole("link", { name: /contact|get in touch/i }),
    ).not.toBeInTheDocument();
  });

  it("renders the contact CTA as a link when a social link is available", () => {
    render(
      React.createElement(PortfolioShowcase, {
        profile: {
          ...baseProfile,
          social_links: [
            { platform: "Website", url: "https://example.com/contact" },
          ],
        },
      }),
    );

    expect(screen.getByRole("link", { name: /get in touch/i })).toHaveAttribute(
      "href",
      "https://example.com/contact",
    );
  });

  it("only links to portfolio sections that have content", () => {
    render(
      React.createElement(PortfolioShowcase, {
        profile: { ...baseProfile, bio: " ", skills: [" "] },
      }),
    );

    expect(
      screen.queryByRole("navigation", { name: "Portfolio sections" }),
    ).not.toBeInTheDocument();
  });

  it("exposes an active resume in the public module view", () => {
    render(
      React.createElement(PortfolioPublicView, {
        items: [{ payload: baseProfile }],
        resumeAvailable: true,
      }),
    );

    expect(screen.getByRole("link", { name: "View Résumé" })).toHaveAttribute(
      "href",
      "/resume",
    );
  });
});
