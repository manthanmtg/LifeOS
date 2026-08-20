import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RainOverview } from "../components/RainOverview";
import { buildRainAnalytics } from "../utils";

describe("RainOverview responsive layout", () => {
  it("uses the overview width instead of viewport breakpoints for dense grids", () => {
    const analytics = buildRainAnalytics(
      [],
      null,
      "mm",
      new Date("2026-08-20T00:00:00.000Z"),
    );
    const { container } = render(
      <RainOverview analytics={analytics} displayUnit="mm" chartType="bar" />,
    );

    const overview = container.firstElementChild;
    const summaryGrid = screen.getByText("Total").closest(".grid");
    const insightsGrid = screen.getByText("Rainfall Trend").closest(".grid");
    const detailGrid = screen.getByText("Max Single").closest(".grid");
    const trendCard = screen
      .getByText("Rainfall Trend")
      .closest(".rounded-2xl");

    expect(overview).toHaveClass("@container/rain-overview");
    expect(summaryGrid).toHaveClass(
      "@sm/rain-overview:grid-cols-2",
      "@3xl/rain-overview:grid-cols-4",
    );
    expect(summaryGrid).not.toHaveClass("sm:grid-cols-2", "xl:grid-cols-4");
    expect(insightsGrid).toHaveClass("@5xl/rain-overview:grid-cols-5");
    expect(insightsGrid).not.toHaveClass("lg:grid-cols-5");
    expect(detailGrid).toHaveClass(
      "@sm/rain-overview:grid-cols-2",
      "@3xl/rain-overview:grid-cols-3",
      "@5xl/rain-overview:col-span-2",
    );
    expect(detailGrid).not.toHaveClass("sm:grid-cols-3", "lg:col-span-2");
    expect(trendCard).toHaveClass("@5xl/rain-overview:col-span-3");
    expect(trendCard).not.toHaveClass("lg:col-span-3");
  });
});
