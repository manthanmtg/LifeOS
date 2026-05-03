import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import MaintenanceAdminView from "../AdminView";

describe("MaintenanceAdminView", () => {
  const sampleTask = {
    _id: "task-1",
    payload: {
      name: "Replace AC filter",
      description: "Quarterly HVAC upkeep",
      category: "hvac",
      service_type: "self",
      frequency_months: 3,
      last_completed: "2026-04-01T00:00:00.000Z",
      next_due: "2026-07-01T00:00:00.000Z",
      currency: "INR",
      priority: "medium",
      status: "upcoming",
      is_recurring: true,
      reminder_enabled: true,
      history: [],
      tags: ["seasonal"],
      notes: "",
    },
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === "/api/system") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        });
      }
      if (url.includes("/api/content")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it("renders the Maintenance Log view", async () => {
    render(React.createElement(MaintenanceAdminView));
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).toBeNull();
    });
    expect(screen.getByText(/Maintenance Log/i)).toBeDefined();
  });

  it("clears filters from an empty filtered result", async () => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes("/api/content")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [sampleTask] }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      } as Response);
    });

    render(React.createElement(MaintenanceAdminView));

    expect(await screen.findByText("Replace AC filter")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search tasks..."), {
      target: { value: "water heater" },
    });

    expect(screen.getByText("No tasks match your filters")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(screen.getByText("Replace AC filter")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search tasks...")).toHaveValue("");
  });
});
