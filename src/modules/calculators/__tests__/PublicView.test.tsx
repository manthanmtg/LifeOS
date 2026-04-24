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
});
