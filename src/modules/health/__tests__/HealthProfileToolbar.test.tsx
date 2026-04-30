import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HealthProfileToolbar from "../components/HealthProfileToolbar";

describe("HealthProfileToolbar", () => {
  it("exposes the search field and active filter state to assistive technology", () => {
    render(
      <HealthProfileToolbar
        filterOptions={[
          { key: "all", label: "All", count: 3 },
          { key: "attention", label: "Needs Attention", count: 1 },
        ]}
        listFilter="attention"
        onFilterChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        visibleCount={1}
        totalCount={3}
      />,
    );

    expect(
      screen.getByRole("searchbox", { name: "Search health profiles" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Needs Attention · 1" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "All · 3" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
