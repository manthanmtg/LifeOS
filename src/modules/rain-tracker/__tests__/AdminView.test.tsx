import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import RainTrackerAdminView from "../AdminView";

// Mock the hook and components that might cause issues
vi.mock("@/hooks/useModuleSettings", () => ({
  useModuleSettings: vi.fn(() => ({
    settings: {
      defaultUnit: "mm",
      chartType: "bar",
    },
    updateSettings: vi.fn(),
    saving: false,
    loaded: true,
  })),
}));

// Mock ResizeObserver for Recharts
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserver;

describe("RainTrackerAdminView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders loading state initially", () => {
    vi.spyOn(global, "fetch").mockImplementation(
      () => new Promise<Response>(() => {}), // Unresolved promise
    );

    const { container } = render(<RainTrackerAdminView />);
    // The skeleton has a loading animation
    expect(container.querySelector(".animate-pulse")).toBeDefined();
  });

  it("renders empty state when no areas exist", async () => {
    vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      } as Response),
    );

    render(<RainTrackerAdminView />);

    await waitFor(() => {
      expect(screen.getByText(/No areas yet/i)).toBeDefined();
      expect(
        screen.getByText(/Add an area to start logging rainfall/i),
      ).toBeDefined();
    });
  });

  it("opens the measurement guide before any area is configured and restores focus", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    render(<RainTrackerAdminView />);

    const opener = await screen.findByRole("button", {
      name: "How to measure",
    });
    opener.focus();
    fireEvent.click(opener);

    const guide = screen.getByRole("dialog", {
      name: "How to measure rainfall",
    });
    expect(within(guide).getByText("12 mm")).toBeVisible();
    expect(
      within(guide).getByRole("button", { name: "Close measurement guide" }),
    ).toHaveFocus();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(guide).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it("converts the entry to millimeters without changing the default unit", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockImplementation(
      async (url) =>
        ({
          ok: true,
          json: async () => ({
            data: String(url).includes("module_type=rain_area")
              ? [
                  {
                    _id: "area-1",
                    payload: { name: "Backyard Garden", is_active: true },
                  },
                ]
              : [],
          }),
        }) as Response,
    );

    render(<RainTrackerAdminView />);
    const logButton = await screen.findByRole("button", {
      name: "Log rainfall",
    });
    fireEvent.click(logButton);
    const form = () =>
      within(screen.getByRole("dialog", { name: "Log rainfall" }));
    const unit = () => form().getByRole("combobox", { name: "Unit" });
    const amount = () => form().getByRole("spinbutton", { name: "Rainfall" });

    expect(unit()).toHaveValue("mm");
    fireEvent.change(amount(), { target: { value: "1" } });
    fireEvent.change(unit(), { target: { value: "in" } });
    expect(amount()).toHaveValue(1);
    fireEvent.click(form().getByRole("button", { name: "Save reading" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Log rainfall" }),
      ).not.toBeInTheDocument(),
    );
    const save = fetchMock.mock.calls.find(
      ([, options]) => options?.method === "POST",
    );
    expect(save?.[0]).toBe("/api/content");
    expect(JSON.parse(String(save?.[1]?.body))).toMatchObject({
      module_type: "rain_entry",
      payload: { rainfall_unit: "mm", rainfall_amount: 25.4 },
    });

    fireEvent.click(logButton);
    expect(screen.getByRole("combobox", { name: "Unit" })).toHaveValue("mm");
  });

  it("renders areas and entries when data is fetched", async () => {
    const mockAreas = [
      {
        _id: "area-1",
        payload: {
          name: "Backyard Garden",
          location: "South Side",
          description: "Main veggie patch",
          is_active: true,
        },
      },
    ];

    const mockEntries = [
      {
        _id: "entry-1",
        payload: {
          area_id: "area-1",
          rainfall_amount: 15,
          rainfall_unit: "mm",
          date: new Date().toISOString(),
          notes: "Heavy downpour",
          source: "manual",
        },
      },
    ];

    vi.spyOn(global, "fetch").mockImplementation((url) => {
      if (url.toString().includes("module_type=rain_area")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockAreas }),
        } as Response);
      }
      if (url.toString().includes("module_type=rain_entry")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockEntries }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      } as Response);
    });

    render(<RainTrackerAdminView />);

    expect(await screen.findByRole("combobox", { name: "Area" })).toHaveValue(
      "area-1",
    );
    expect(screen.getByRole("button", { name: "Log rainfall" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Rainfall log" })).toBeVisible();

    // Check if the area details are displayed
    expect(screen.getAllByText("South Side").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Main veggie patch").length).toBeGreaterThan(0);

    // Check if entry amount is displayed (15mm)
    expect(screen.getAllByText("15.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Heavy downpour").length).toBeGreaterThan(0);

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search readings" }),
      {
        target: { value: "absent reading" },
      },
    );
    expect(screen.getByText("No matching readings")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Heavy downpour")).toBeVisible();

    const editButton = screen.getByRole("button", { name: /^Edit reading/ });
    editButton.focus();
    fireEvent.click(editButton);
    const dialog = screen.getByRole("dialog", { name: "Edit reading" });
    const amount = within(dialog).getByRole("spinbutton", { name: "Rainfall" });
    expect(amount).toHaveValue(15);
    fireEvent.change(within(dialog).getByRole("combobox", { name: "Unit" }), {
      target: { value: "cm" },
    });
    expect(screen.getByRole("spinbutton", { name: "Rainfall" })).toHaveValue(
      1.5,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Edit reading" }),
      ).not.toBeInTheDocument(),
    );
    expect(editButton).toHaveFocus();
  });

  it("shows a retryable error instead of an empty state when the initial load fails", async () => {
    vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: false,
        json: () =>
          Promise.resolve({ error: { message: "Database connection failed" } }),
      } as Response),
    );

    render(<RainTrackerAdminView />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Database connection failed",
      );
    });
    expect(
      screen.getByRole("button", { name: "Retry loading rain tracker" }),
    ).toBeVisible();
    expect(screen.queryByText(/No areas yet/i)).not.toBeInTheDocument();
  });

  it("opens a labeled area editor and focuses its first field", async () => {
    vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      } as Response),
    );

    render(<RainTrackerAdminView />);

    await waitFor(() => {
      expect(screen.getByText(/No areas yet/i)).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Add area" }));
    const dialog = screen.getByRole("dialog", { name: "Add area" });
    expect(within(dialog).getByRole("textbox", { name: "Name" })).toHaveFocus();
    expect(
      within(dialog).getByRole("button", { name: "Save area" }),
    ).toBeVisible();
  });
});
