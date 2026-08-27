import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CalculatorsPublicView from "../PublicView";

vi.mock("@/hooks/useModuleSettings", () => ({
  useModuleSettings: () => ({
    settings: {
      enabledCategories: {},
      enabledCalculators: {},
    },
    updateSettings: vi.fn(),
    saving: false,
    loaded: true,
  }),
}));

describe("CalculatorsPublicView", () => {
  beforeEach(() => {
    document.body.style.overflow = "";
  });

  it("shows a filter-specific empty state and clears filters back to results", () => {
    render(<CalculatorsPublicView items={[]} />);

    fireEvent.change(
      screen.getByRole("textbox", { name: /search calculators/i }),
      {
        target: { value: "does-not-exist" },
      },
    );

    expect(
      screen.getByText("No calculators match your current filters."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /clear filters/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(
      screen.getByRole("button", { name: /open sip calculator/i }),
    ).toBeInTheDocument();
  });

  it("keeps keyboard focus in an open calculator and restores its launcher", () => {
    render(<CalculatorsPublicView items={[]} />);

    const opener = screen.getByRole("button", {
      name: /open sip calculator/i,
    });
    opener.focus();
    fireEvent.click(opener);

    const dialog = screen.getByRole("dialog", { name: /sip calculator/i });
    const closeButton = screen.getByRole("button", {
      name: /close calculator/i,
    });
    const lastFocusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
      ),
    ).at(-1);

    expect(closeButton).toHaveFocus();
    expect(lastFocusable).toBeDefined();

    lastFocusable?.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
