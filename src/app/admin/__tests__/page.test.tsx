import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboard from "../page";

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    const modulePath = loader.toString().match(/modules\/([^/]+)\/Widget/)?.[1];
    const MockWidget = () =>
      modulePath ? <div data-testid={`widget-${modulePath}`} /> : null;
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
    "shopping-list": {
      name: "Shopping List",
      icon: "ShoppingBag",
      defaultPublic: false,
      contentType: "shopping_list",
      description: "Shared purchase lists.",
      tags: ["groceries"],
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
            "shopping-list": { enabled: true, isPublic: false },
          },
          widgetRegistry: {
            expenses: true,
            blog: false,
            "shopping-list": true,
          },
          moduleOrder: ["expenses", "blog", "shopping-list"],
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

  it("groups dashboard customization controls in a labelled list", async () => {
    render(<AdminDashboard />);

    fireEvent.click(
      screen.getByRole("button", { name: /customize dashboard/i }),
    );

    const widgetList = await screen.findByRole("list", {
      name: /dashboard widgets/i,
    });

    expect(widgetList).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("renders the shopping list widget when enabled", async () => {
    render(<AdminDashboard />);

    await waitFor(() =>
      expect(screen.getByTestId("widget-shopping-list")).toBeInTheDocument(),
    );
  });
});
