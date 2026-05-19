import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsTab } from "../SettingsTab";

describe("SettingsTab", () => {
  it("shows the close parenthesis operator as a plain glyph", () => {
    render(
      <SettingsTab
        settings={{ crops: [], sources: [] }}
        updateSettings={vi.fn().mockResolvedValue(undefined)}
        saving={false}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /create new crop type/i }),
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        /pick a function below, or type your formula/i,
      ),
      { target: { value: "SUM(weight" } },
    );

    const closeParen = screen.getByTitle("Close bracket");
    expect(closeParen).toHaveTextContent(")");
    expect(closeParen).not.toHaveTextContent("&quot;");
  });
});
