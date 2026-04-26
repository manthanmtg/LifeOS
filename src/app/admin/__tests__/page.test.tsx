import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboard from "../page";

vi.mock("next/dynamic", () => ({
  default: () => {
    const MockWidget = () => null;
    return MockWidget;
  },
}));

vi.mock("@/registry", () => ({
  moduleRegistry: {
    expenses: {
      name: "Expenses",
      icon: "DollarSign",
      defaultPublic: false,
      contentType: "expense",
      description: "Track spending.",
      tags: ["finance"],
    },
    blog: {
      name: "Blog",
      icon: "FileText",
      defaultPublic: true,
      contentType: "blog_post",
      description: "Write posts.",
      tags: ["writing"],
    },
  },
}));

describe("AdminDashboard", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        data: {
          moduleRegistry: {
            expenses: { enabled: true, isPublic: false },
            blog: { enabled: true, isPublic: true },
          },
          widgetRegistry: {
            expenses: true,
            blog: false,
          },
          moduleOrder: ["expenses", "blog"],
        },
      }),
    } as Response);
  });

  it("gives dashboard customization switches accessible names", async () => {
    render(<AdminDashboard />);

    fireEvent.click(
      screen.getByRole("button", { name: /customize dashboard/i }),
    );

    await waitFor(() =>
      expect(screen.getByText("Layout Configuration")).toBeInTheDocument(),
    );

    expect(
      screen.getByRole("switch", { name: "Show Expenses widget" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("switch", { name: "Show Blog widget" }),
    ).toHaveAttribute("aria-checked", "false");
  });
});
