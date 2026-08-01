import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LoanFilters from "../LoanFilters";

describe("LoanFilters", () => {
  it("exposes accessible search and segmented status controls", () => {
    const onQueryChange = vi.fn();
    const onStatusChange = vi.fn();

    render(
      <LoanFilters
        query=""
        onQueryChange={onQueryChange}
        status="active"
        onStatusChange={onStatusChange}
        counts={{ active: 2, closed: 1, all: 3 }}
      />,
    );

    fireEvent.change(screen.getByLabelText(/search by loan or lender/i), {
      target: { value: "hdfc" },
    });
    fireEvent.click(screen.getByRole("button", { name: /closed 1/i }));

    expect(onQueryChange).toHaveBeenCalledWith("hdfc");
    expect(onStatusChange).toHaveBeenCalledWith("closed");
    expect(screen.getByRole("button", { name: /active 2/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("uses the compact stacked density for the wide navigator", () => {
    render(
      <LoanFilters
        query="tiago"
        onQueryChange={vi.fn()}
        status="all"
        onStatusChange={vi.fn()}
        counts={{ active: 2, closed: 1, all: 3 }}
        density="navigator"
      />,
    );

    expect(screen.getByDisplayValue("tiago")).toBeInTheDocument();
    expect(screen.getByTestId("loan-filters")).toHaveClass("flex-col");
  });
});
