import { render, screen } from "@testing-library/react";
import { LayoutDashboard } from "lucide-react";
import { describe, expect, it } from "vitest";
import WidgetCard from "../WidgetCard";

describe("WidgetCard", () => {
  it("allows long titles to shrink instead of overflowing narrow cards", () => {
    render(
      <WidgetCard
        title="Very Long Module Name That Needs To Fit"
        icon={LayoutDashboard}
      >
        <p>Widget content</p>
      </WidgetCard>,
    );

    expect(
      screen.getByText("Very Long Module Name That Needs To Fit"),
    ).toHaveClass("min-w-0", "truncate");
  });

  it("uses a pulsing skeleton instead of blank widget content while loading", () => {
    render(
      <WidgetCard
        title="Loading Module"
        icon={LayoutDashboard}
        loading
        footer={<span>Loaded footer</span>}
      >
        <p>Loaded content</p>
      </WidgetCard>,
    );

    const status = screen.getByRole("status", {
      name: "Loading Loading Module widget",
    });

    expect(status).toHaveClass("animate-pulse");
    expect(screen.queryByText("Loaded content")).toBeNull();
    expect(screen.queryByText("Loaded footer")).toBeNull();
  });
});
