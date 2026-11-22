import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RainOverview } from "../components/RainOverview";
import { buildRainAnalytics } from "../utils";

describe("RainOverview", () => {
  it("keeps the trend visible while secondary statistics start collapsed", () => {
    const analytics = buildRainAnalytics(
      [],
      null,
      "mm",
      new Date("2026-08-20T00:00:00.000Z"),
    );
    render(
      <RainOverview analytics={analytics} displayUnit="mm" chartType="bar" />,
    );

    expect(
      screen.getByRole("heading", { name: "Monthly rainfall" }),
    ).toBeVisible();
    expect(screen.getByText("Last 30 days")).toBeVisible();
    expect(screen.getByText("Largest reading")).not.toBeVisible();
    expect(
      screen.getByText("Rainfall statistics").closest("details"),
    ).not.toHaveAttribute("open");
  });
});
