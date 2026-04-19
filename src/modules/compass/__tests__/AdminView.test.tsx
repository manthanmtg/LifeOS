import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CompassAdminView from "../AdminView";
import React from "react";

const mockTasks = [
  {
    _id: "task1",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    payload: {
      title: "Build dashboard",
      status: "in_progress" as const,
      priority: "p1" as const,
      comments: [],
      checklist: [
        { id: "c1", text: "Design", completed: true, comments: [] },
        { id: "c2", text: "Implement", completed: false, comments: [] },
      ],
      category_tags: ["frontend"],
      links: [],
    },
  },
  {
    _id: "task2",
    created_at: new Date(Date.now() - 2000).toISOString(),
    updated_at: new Date(Date.now() - 2000).toISOString(),
    payload: {
      title: "Write tests",
      status: "backlog" as const,
      priority: "p3" as const,
      comments: [],
      checklist: [],
      category_tags: [],
      links: [],
    },
  },
  {
    _id: "task3",
    created_at: new Date(Date.now() - 3000).toISOString(),
    updated_at: new Date(Date.now() - 3000).toISOString(),
    payload: {
      title: "Deploy to production",
      status: "review" as const,
      priority: "p2" as const,
      comments: [],
      checklist: [],
      category_tags: ["devops"],
      links: [],
    },
  },
  {
    _id: "task4",
    created_at: new Date(Date.now() - 4000).toISOString(),
    updated_at: new Date(Date.now() - 4000).toISOString(),
    payload: {
      title: "Old feature",
      status: "done" as const,
      priority: "p4" as const,
      comments: [],
      checklist: [],
      category_tags: [],
      links: [],
    },
  },
];

describe("CompassAdminView", () => {
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

  it("renders the Compass view with kanban columns", async () => {
    render(<CompassAdminView />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).toBeNull();
    });
    expect(screen.getByText("Backlog")).toBeDefined();
    // "In Progress" appears in both the column header and the metrics — use getAllByText
    expect(screen.getAllByText("In Progress").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Review").length).toBeGreaterThan(0);
    expect(screen.getByText("Done")).toBeDefined();
  });

  it("renders metrics after loading tasks", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockTasks }),
    });

    render(<CompassAdminView />);
    await waitFor(() => {
      // "Completion" is unique to metrics
      expect(screen.getByText("Completion")).toBeDefined();
    });
    // Metrics should show
    expect(screen.getByText("Attention")).toBeDefined();
  });

  it("shows task titles in correct columns", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockTasks }),
    });

    render(<CompassAdminView />);
    await waitFor(() => {
      expect(screen.getByText("Build dashboard")).toBeDefined();
    });
    expect(screen.getByText("Write tests")).toBeDefined();
    expect(screen.getByText("Deploy to production")).toBeDefined();
    expect(screen.getByText("Old feature")).toBeDefined();
  });

  it("shows quick add input", async () => {
    render(<CompassAdminView />);
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Type an idea and press Enter..."),
      ).toBeDefined();
    });
  });

  it("toggles focus mode button", async () => {
    render(<CompassAdminView />);
    await waitFor(() => {
      expect(screen.getByText("Focus Mode")).toBeDefined();
    });
    fireEvent.click(screen.getByText("Focus Mode"));
    expect(screen.getByText("Exit Focus")).toBeDefined();
  });

  it("toggles filter panel", async () => {
    render(<CompassAdminView />);
    await waitFor(() => {
      expect(screen.getByText("Filter")).toBeDefined();
    });
    fireEvent.click(screen.getByText("Filter"));
    expect(screen.getByText("Priority:")).toBeDefined();
    expect(screen.getByText("All")).toBeDefined();
    expect(screen.getAllByText("P1").length).toBeGreaterThan(0);
  });

  it("filters tasks by priority", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockTasks }),
    });

    render(<CompassAdminView />);
    await waitFor(() => {
      expect(screen.getByText("Build dashboard")).toBeDefined();
    });

    // Open filters and select P1
    fireEvent.click(screen.getByText("Filter"));
    fireEvent.click(screen.getAllByText("P1")[0]);

    // Only the P1 task should show in in_progress column
    expect(screen.getByText("Build dashboard")).toBeDefined();
    // P3 task in backlog should be hidden
    expect(screen.queryByText("Write tests")).toBeNull();
  });

  it("shows empty drop zones when no tasks", async () => {
    render(<CompassAdminView />);
    await waitFor(() => {
      const dropZones = screen.getAllByText("Drop here");
      expect(dropZones.length).toBeGreaterThan(0);
    });
  });

  it("submits quick add form", async () => {
    const postMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: {} }),
    });
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      if (opts?.method === "POST") return postMock(url, opts);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });
    });

    render(<CompassAdminView />);
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Type an idea and press Enter..."),
      ).toBeDefined();
    });

    const input = screen.getByPlaceholderText(
      "Type an idea and press Enter...",
    );
    fireEvent.change(input, { target: { value: "New task" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledTimes(1);
    });
  });
});
