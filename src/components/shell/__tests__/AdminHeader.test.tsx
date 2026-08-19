import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { navigationState } from "@/test/mocks/navigation";
import AdminHeader from "../AdminHeader";

describe("AdminHeader", () => {
  beforeEach(() => {
    navigationState.pathname = "/admin/blog";
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ data: {} }),
    } as Response);
  });

  it("loads modules from /api/system, sorts by visit count, and marks the active module", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () =>
        ({
          data: {
            pageVisits: {
              expenses: 120,
              blog: 80,
              calculators: 90,
              reading: 50,
              bookshelf: 40,
              ideas: 30,
              snippets: 20,
              health: 10,
              todo: 5,
              habits: 1,
            },
            moduleRegistry: {
              expenses: { enabled: true, isPublic: false },
              blog: { enabled: true, isPublic: false },
              calculators: { enabled: true, isPublic: false },
              reading: { enabled: true, isPublic: false },
              bookshelf: { enabled: true, isPublic: false },
              ideas: { enabled: true, isPublic: false },
              snippets: { enabled: true, isPublic: false },
              health: { enabled: true, isPublic: false },
              todo: { enabled: true, isPublic: false },
              habits: { enabled: true, isPublic: false },
            },
          },
        }) as const,
    } as Response);

    render(<AdminHeader />);

    const mobileNav = await screen.findByRole("navigation", {
      name: "Mobile quick access",
    });
    const desktopNav = await screen.findByRole("navigation", {
      name: "Quick access",
    });

    const mobileLinks = within(mobileNav).getAllByRole("link");
    const desktopLinks = within(desktopNav).getAllByRole("link");
    const orderedNames = [
      "Expenses",
      "Calculators",
      "Blog",
      "Reading",
      "Bookshelf",
      "Ideas",
      "Snippets",
      "Health",
    ];

    expect(mobileLinks).toHaveLength(8);
    expect(desktopLinks).toHaveLength(8);
    expect(
      mobileLinks.map(
        (link) =>
          link.getAttribute("aria-label") || link.textContent?.trim() || "",
      ),
    ).toEqual(orderedNames);
    expect(desktopLinks.map((link) => link.textContent?.trim() || "")).toEqual(
      orderedNames,
    );

    const activeLinks = screen.getAllByRole("link", { name: "Blog" });
    expect(activeLinks).toHaveLength(2);
    activeLinks.forEach((link) => {
      expect(link).toHaveAttribute("aria-current", "page");
    });
  });

  it("hides disabled modules from quick access while preserving order for remaining modules", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () =>
        ({
          data: {
            pageVisits: {
              expenses: 99,
              blog: 80,
              calculators: 70,
              reading: 60,
              bookshelf: 50,
              ideas: 40,
              snippets: 30,
              health: 20,
              todo: 10,
            },
            moduleRegistry: {
              expenses: { enabled: false, isPublic: false },
              blog: { enabled: true, isPublic: false },
              calculators: { enabled: true, isPublic: false },
              reading: { enabled: true, isPublic: false },
              bookshelf: { enabled: true, isPublic: false },
              ideas: { enabled: true, isPublic: false },
              snippets: { enabled: true, isPublic: false },
              health: { enabled: true, isPublic: false },
              todo: { enabled: true, isPublic: false },
            },
          },
        }) as const,
    } as Response);

    render(<AdminHeader />);

    const mobileNav = await screen.findByRole("navigation", {
      name: "Mobile quick access",
    });
    const mobileLinks = within(mobileNav).getAllByRole("link");
    const names = mobileLinks.map(
      (link) =>
        link.getAttribute("aria-label") || link.textContent?.trim() || "",
    );

    expect(names).not.toContain("Expenses");
    expect(names).toEqual([
      "Blog",
      "Calculators",
      "Reading",
      "Bookshelf",
      "Ideas",
      "Snippets",
      "Health",
      "Todo",
    ]);
  });

  it("falls back to registry defaults when system config fetch fails", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("system down"));

    render(<AdminHeader />);

    const mobileNav = await screen.findByRole("navigation", {
      name: "Mobile quick access",
    });
    const desktopNav = await screen.findByRole("navigation", {
      name: "Quick access",
    });

    const fallbackNames = [
      "Portfolio",
      "Blog",
      "Expenses",
      "Recurring Expenses",
      "Expense Spaces",
      "EMI Tracker",
      "Calculators",
      "Reading",
    ];

    const mobileLinks = within(mobileNav).getAllByRole("link");
    const desktopLinks = within(desktopNav).getAllByRole("link");

    expect(mobileLinks).toHaveLength(8);
    expect(desktopLinks).toHaveLength(8);
    expect(
      mobileLinks.map(
        (link) =>
          link.getAttribute("aria-label") || link.textContent?.trim() || "",
      ),
    ).toEqual(fallbackNames);
    expect(desktopLinks.map((link) => link.textContent?.trim() || "")).toEqual(
      fallbackNames,
    );

    const activeLinks = screen.getAllByRole("link", { name: "Blog" });
    activeLinks.forEach((link) => {
      expect(link).toHaveAttribute("aria-current", "page");
    });
  });

  it("dispatches global sidebar event when opening the mobile menu", async () => {
    render(<AdminHeader />);

    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const menuButton = await screen.findByRole("button", {
      name: "Open navigation menu",
    });

    await waitFor(() => expect(menuButton).toBeInTheDocument());
    fireEvent.click(menuButton);

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy.mock.calls.at(0)?.[0]).toBeInstanceOf(Event);
    expect(dispatchSpy.mock.calls.at(0)?.[0].type).toBe("open-mobile-sidebar");
  });

  it("fetches system config exactly once per mount", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    render(<AdminHeader />);

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(fetchSpy).toHaveBeenCalledWith("/api/system");
  });
});
