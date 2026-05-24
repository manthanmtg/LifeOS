import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routerMocks } from "@/test/mocks/navigation";
import * as adminModules from "@/lib/admin-modules";
import CommandPalette from "../CommandPalette";

vi.mock("@/lib/admin-modules", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin-modules")>();

  return {
    ...actual,
    getOrderedAdminModules: vi.fn(actual.getOrderedAdminModules),
  };
});

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.useRealTimers();
    global.fetch = vi.fn();
  });

  it("hides disabled modules from the command list", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({
        data: {
          moduleRegistry: {
            expenses: { enabled: false, isPublic: false },
          },
        },
      }),
    } as Response);

    render(<CommandPalette />);
    openPalette();

    await waitFor(() =>
      expect(
        screen.getByPlaceholderText(/Type a command/i),
      ).toBeInTheDocument(),
    );

    expect(screen.queryByText("Go to Expenses")).not.toBeInTheDocument();
    expect(screen.getByText("Go to Blog")).toBeInTheDocument();
  });

  it("defers loading system config until the palette opens", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ data: {} }),
    } as Response);

    render(<CommandPalette />);

    expect(global.fetch).not.toHaveBeenCalled();

    openPalette();

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith("/api/system"),
    );
  });

  it("filters commands and routes when a result is selected", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ data: {} }),
    } as Response);

    render(<CommandPalette />);
    openPalette();

    await waitFor(() =>
      expect(
        screen.getByPlaceholderText(/Type a command/i),
      ).toBeInTheDocument(),
    );

    const input = screen.getByPlaceholderText(/Type a command/i);
    fireEvent.change(input, { target: { value: "settings" } });
    fireEvent.click(screen.getByText(/Go to Settings/i));

    expect(routerMocks.push).toHaveBeenCalledWith("/admin/settings");
  });

  it("shows an empty state when no command matches the query", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ data: {} }),
    } as Response);

    render(<CommandPalette />);
    openPalette();

    await waitFor(() =>
      expect(
        screen.getByPlaceholderText(/Type a command/i),
      ).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByPlaceholderText(/Type a command/i), {
      target: { value: "zzzz" },
    });

    expect(screen.getByText("No results found")).toBeInTheDocument();
  });

  it("does not rebuild module commands while navigating the current list", async () => {
    const orderingSpy = vi.mocked(adminModules.getOrderedAdminModules);
    orderingSpy.mockClear();
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ data: {} }),
    } as Response);

    render(<CommandPalette />);
    openPalette();

    await screen.findByPlaceholderText(/Type a command/i);
    await waitFor(() => expect(orderingSpy).toHaveBeenCalled());

    const callsAfterLoad = orderingSpy.mock.calls.length;
    fireEvent.mouseEnter(screen.getByText("Go to Blog"));

    expect(orderingSpy).toHaveBeenCalledTimes(callsAfterLoad);
  });
});

function openPalette() {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { ctrlKey: true, key: "k" }),
    );
  });
}
