import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Switch } from "../Switch";

describe("Switch", () => {
  it("keeps a mobile-sized tap target around the compact track", () => {
    render(
      React.createElement(Switch, {
        "aria-label": "Enable widget",
        checked: true,
      }),
    );

    const control = screen.getByRole("switch", { name: "Enable widget" });
    const track = control.querySelector("[data-slot='switch-track']");

    expect(control).toHaveClass("min-h-11", "min-w-11");
    expect(track).toHaveClass("h-5", "w-9");
  });
});
