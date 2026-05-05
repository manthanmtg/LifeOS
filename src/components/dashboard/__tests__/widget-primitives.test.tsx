import { render, screen } from "@testing-library/react";
import { Presentation } from "lucide-react";
import { describe, expect, it } from "vitest";
import { WidgetHighlight } from "../widget-primitives";

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
