import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PayoffRunway from "../PayoffRunway";

describe("PayoffRunway", () => {
  it("exposes progress and payoff summary accessibly", () => {
    render(
      <PayoffRunway
        startDate="2026-01-01T00:00:00.000Z"
        today={new Date("2026-03-01T00:00:00.000Z")}
        progressPercent={40}
        baselinePayoffDate="2026-06-01T00:00:00.000Z"
        simulatedPayoffDate="2026-05-01T00:00:00.000Z"
        monthsSaved={1}
        extraMonthlyLabel="₹100"
      />,
    );

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "40",
    );
    expect(screen.getAllByText(/1 month earlier/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/with ₹100 extra monthly/i).length,
    ).toBeGreaterThan(0);
  });

  it("renders warning text instead of a misleading runway when schedule is invalid", () => {
    render(
      <PayoffRunway
        startDate="2026-01-01T00:00:00.000Z"
        today={new Date("2026-03-01T00:00:00.000Z")}
        progressPercent={0}
        baselinePayoffDate={null}
        warning="EMI is not sufficient"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      /EMI is not sufficient/i,
    );
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
