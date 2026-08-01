import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { navigationState } from "@/test/mocks/navigation";
import SettingsPage from "../page";

const setTheme = vi.fn();

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "one-dark", setTheme }),
}));

vi.mock("@/components/settings/AboutSettingsTab", () => ({
  AboutSettingsTab: () => <section>About Life OS</section>,
}));

vi.mock("@/components/settings/NotificationSettingsTab", () => ({
  NotificationSettingsTab: () => <section>Notifications settings</section>,
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
  },
}));

const response = (data: unknown) =>
  ({
    json: async () => data,
  }) as Response;

const systemConfig = {
  active_theme: "one-dark",
  color_mode: "dark",
  site_title: "Life OS",
  moduleRegistry: {
    expenses: { enabled: true, isPublic: false },
  },
  moduleOrder: ["expenses"],
};

describe("SettingsPage", () => {
  beforeEach(() => {
    setTheme.mockClear();
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();

      if (url === "/api/system") {
        return Promise.resolve(response({ data: systemConfig }));
      }

      if (url === "/api/db-stats") {
        return Promise.resolve(response({ success: true, data: null }));
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
  });

  it("registers About as the sixth settings tab with ARIA tab semantics", () => {
    global.fetch = vi.fn(() => new Promise<Response>(() => {}));

    render(<SettingsPage />);

    const tabList = screen.getByRole("tablist", {
      name: /settings sections/i,
    });
    const tabs = within(tabList).getAllByRole("tab");

    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Themes",
      "Modules",
      "Branding",
      "Notifications",
      "Data",
      "About",
    ]);

    const themesTab = within(tabList).getByRole("tab", { name: "Themes" });
    const themesPanel = screen.getByRole("tabpanel", { name: "Themes" });

    expect(themesTab).toHaveAttribute("aria-selected", "true");
    expect(themesTab).toHaveAttribute("aria-controls", themesPanel.id);
    expect(themesPanel).toHaveAttribute("aria-labelledby", themesTab.id);
  });

  it("selects About from the query string without fetching database stats", async () => {
    navigationState.searchParams = new URLSearchParams("tab=about");

    render(<SettingsPage />);

    const aboutTab = screen.getByRole("tab", { name: "About" });

    await waitFor(() =>
      expect(aboutTab).toHaveAttribute("aria-selected", "true"),
    );
    expect(screen.getByRole("tabpanel", { name: "About" })).toHaveTextContent(
      "About Life OS",
    );
    expect(global.fetch).not.toHaveBeenCalledWith("/api/db-stats");
  });

  it("keeps database statistics isolated to the Data tab", async () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Data" }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith("/api/db-stats"),
    );
    fireEvent.click(screen.getByRole("tab", { name: "About" }));

    expect(
      vi
        .mocked(global.fetch)
        .mock.calls.filter(([input]) => input.toString() === "/api/db-stats"),
    ).toHaveLength(1);
  });
});
