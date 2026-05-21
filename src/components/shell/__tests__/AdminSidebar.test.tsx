import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { navigationState } from "@/test/mocks/navigation";
import AdminSidebar from "../AdminSidebar";

describe("AdminSidebar", () => {
  beforeEach(() => {
    navigationState.pathname = "/admin/blog";
    global.fetch = vi
      .fn()
      .mockResolvedValue({ json: async () => ({ data: {} }) } as Response);
    document.head.innerHTML = "";
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

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByRole("navigation", { name: "Main navigation" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Life OS" }))
      .toBeInTheDocument();
  });

  it("applies a custom title and excludes disabled modules", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
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

  it("updates favicon links when site_icon is configured", async () => {
    const iconLink = document.createElement("link");
    const appleLink = document.createElement("link");
    iconLink.rel = "icon";
    iconLink.href = "/old-icon.ico";
    appleLink.rel = "apple-touch-icon";
    appleLink.href = "/old-icon.png";
    document.head.append(iconLink, appleLink);

    vi.mocked(global.fetch).mockResolvedValueOnce({
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
