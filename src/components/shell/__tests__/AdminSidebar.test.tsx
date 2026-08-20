import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { navigationState } from "@/test/mocks/navigation";
import { getOrderedAdminModules } from "@/lib/admin-modules";
import AdminSidebar, { ADMIN_SIDEBAR_CACHE_KEY } from "../AdminSidebar";

function getModuleNames(modulesNav: HTMLElement) {
  return within(modulesNav)
    .getAllByRole("link")
    .map((link) => link.textContent?.trim())
    .filter((name): name is string => Boolean(name));
}

describe("AdminSidebar", () => {
  beforeEach(() => {
    navigationState.pathname = "/admin/blog";
    global.fetch = vi
      .fn()
      .mockResolvedValue({ json: async () => ({ data: {} }) } as Response);
    document.head.innerHTML = "";
    localStorage.clear();
  });

  it("renders the default shell links and marks the active module", async () => {
    render(<AdminSidebar />);

    const mainNav = await screen.findByRole("navigation", {
      name: "Main navigation",
    });
    const modulesNav = await screen.findByRole("navigation", { name: "Modules" });
    const dashboardLinks = within(mainNav).getAllByRole("link", {
      name: "Dashboard",
    });
    const blogLinks = within(modulesNav).getAllByRole("link", { name: "Blog" });
    const systemSettingsLink = screen.getByRole("link", {
      name: "System Settings",
    });

    expect(dashboardLinks).toHaveLength(1);
    expect(dashboardLinks[0]).toHaveAttribute("href", "/admin");
    expect(blogLinks).toHaveLength(1);
    expect(blogLinks[0]).toHaveAttribute("aria-current", "page");
    expect(systemSettingsLink).toHaveAttribute("href", "/admin/settings");
    expect(screen.getByRole("heading", { level: 2, name: "Life OS" }))
      .toBeInTheDocument();
  });

  it("falls back to defaults when system config fetch fails", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("system down"));
    render(<AdminSidebar />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(
      await screen.findByRole("navigation", { name: "Main navigation" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Life OS" }))
      .toBeInTheDocument();
  });

  it("applies a custom title and excludes disabled modules", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: async () => ({
        data: {
          site_title: "Ops Console",
          moduleRegistry: {
            blog: { enabled: false, isPublic: false },
            expenses: { enabled: false, isPublic: false },
            portfolio: { enabled: true, isPublic: true },
          },
        },
      } as const),
    } as Response);

    render(<AdminSidebar />);

    const modulesNav = await screen.findByRole("navigation", { name: "Modules" });

    expect(
      await screen.findByRole("heading", { level: 2, name: "Ops Console" }),
    ).toBeInTheDocument();
    expect(within(modulesNav).queryByRole("link", { name: "Blog" }))
      .not.toBeInTheDocument();
    expect(within(modulesNav).queryByRole("link", { name: "Expenses" }))
      .not.toBeInTheDocument();
    expect(within(modulesNav).getByRole("link", { name: "Portfolio" }))
      .toBeInTheDocument();
  });

  it("uses cached sidebar order immediately and refreshes cache for next load", async () => {
    localStorage.setItem(
      ADMIN_SIDEBAR_CACHE_KEY,
      JSON.stringify(["portfolio", "blog", "expenses"]),
    );

    let resolveConfig: (value: Response) => void;
    vi
      .mocked(global.fetch)
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveConfig = resolve as (value: Response) => void;
          }) as Promise<Response>,
      );

    render(<AdminSidebar />);

    const modulesNav = await screen.findByRole("navigation", { name: "Modules" });
    expect(getModuleNames(modulesNav)).toEqual([
      "Portfolio",
      "Blog",
      "Expenses",
    ]);

    const nextConfig = {
      orderingStrategy: "name",
      moduleOrder: ["expenses", "blog", "portfolio", "recurring-expenses"],
    } as const;
    resolveConfig({
      json: async () => ({
        data: nextConfig,
      } as const),
    } as Response);

    await waitFor(() => {
      expect(getModuleNames(modulesNav)).toEqual([
        "Portfolio",
        "Blog",
        "Expenses",
      ]);
      expect(
        JSON.parse(localStorage.getItem(ADMIN_SIDEBAR_CACHE_KEY) || "[]"),
      ).toEqual(
        getOrderedAdminModules({
          orderingStrategy: nextConfig.orderingStrategy,
          moduleOrder: nextConfig.moduleOrder,
        }).map((module) => module.key),
      );
    });
  });

  it("updates favicon links when site_icon is configured", async () => {
    const iconLink = document.createElement("link");
    const appleLink = document.createElement("link");
    iconLink.rel = "icon";
    iconLink.href = "/old-icon.ico";
    appleLink.rel = "apple-touch-icon";
    appleLink.href = "/old-icon.png";
    document.head.append(iconLink, appleLink);

    vi.mocked(global.fetch).mockResolvedValue({
      json: async () => ({
        data: {
          site_icon: "/assets/icons/site.ico",
        },
      } as const),
    } as Response);

    render(<AdminSidebar />);

    await waitFor(() => {
      expect(iconLink.href).toContain("/assets/icons/site.ico");
      expect(appleLink.href).toContain("/assets/icons/site.ico");
    });
  });

  it("opens and closes the mobile sidebar on event and close button", async () => {
    render(<AdminSidebar />);

    expect(screen.getAllByRole("navigation", { name: "Modules" })).toHaveLength(1);

    window.dispatchEvent(new Event("open-mobile-sidebar"));
    await waitFor(() => {
      expect(screen.getAllByRole("navigation", { name: "Modules" })).toHaveLength(2);
      expect(screen.getAllByRole("navigation", { name: "Main navigation" })).toHaveLength(
        2,
      );
    });

    const closeButton = await screen.findByRole("button", {
      name: /close navigation menu/i,
    });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.getAllByRole("navigation", { name: "Modules" })).toHaveLength(1);
      expect(screen.getAllByRole("navigation", { name: "Main navigation" })).toHaveLength(
        1,
      );
      expect(
        screen.queryByRole("button", { name: /close navigation menu/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("calls logout endpoint when the sidebar logout action is used", async () => {
    const fetchMock = vi.spyOn(global, "fetch");
    render(<AdminSidebar />);

    const logoutButton = await screen.findByRole("button", { name: /logout/i });
    fireEvent.click(logoutButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", {
        method: "POST",
      }),
    );
  });
});
