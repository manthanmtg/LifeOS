import { render, screen } from "@testing-library/react";
import { Presentation } from "lucide-react";
import { describe, expect, it } from "vitest";
import { WidgetHighlight, WidgetMiniStats } from "../widget-primitives";

describe("WidgetHighlight", () => {
  it("allows long highlight text to shrink inside narrow widget rows", () => {
    render(
      <WidgetHighlight
        icon={Presentation}
        text="QuarterlyPlanningDeckWithAnExtremelyLongUnbrokenTitle"
      />,
    );

    expect(
      screen.getByText("QuarterlyPlanningDeckWithAnExtremelyLongUnbrokenTitle"),
    ).toHaveClass("min-w-0", "line-clamp-1");
  });
});

describe("WidgetMiniStats", () => {
  it("allows long values and labels to shrink inside narrow widget grids", () => {
    render(
      <WidgetMiniStats
        stats={[
          {
            value: "ExtremelyLongUnbrokenStatValueForMobileCards",
            label: "VeryLongUnbrokenMobileLabel",
          },
        ]}
      />,
    );

    expect(
      screen.getByText("ExtremelyLongUnbrokenStatValueForMobileCards")
        .parentElement,
    ).toHaveClass("min-w-0");
    expect(
      screen.getByText("ExtremelyLongUnbrokenStatValueForMobileCards"),
    ).toHaveClass("truncate");
    expect(screen.getByText("VeryLongUnbrokenMobileLabel")).toHaveClass(
      "truncate",
    );
  });
});
