import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TodoAdminView from "../AdminView";

const mockTodo = {
  _id: "todo-1",
  module_type: "todo" as const,
  is_public: false,
  created_at: "2026-08-28T00:00:00.000Z",
  updated_at: "2026-08-28T00:00:00.000Z",
  payload: {
    title: "Review project plan",
    priority: "medium" as const,
    completed: false,
  },
};

describe("TodoAdminView", () => {
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

  it("renders the Todo Manager view", async () => {
    render(<TodoAdminView />);
    await waitFor(
      () => {
        expect(screen.queryByText(/Loading/i)).toBeNull();
      },
      { timeout: 2000 },
    );

    // Check for "Enlightened" Todo UI elements
    expect(
      screen.getByPlaceholderText(/What objective will you conquer/i),
    ).toBeDefined();
    expect(screen.getByText(/Focus Score/i)).toBeDefined();
    expect(screen.getByText(/Clean Slate/i)).toBeDefined();
  });

  it("keeps a failed load distinct from an empty task list and retries it", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Service unavailable" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockTodo] }),
      });

    render(<TodoAdminView />);

    expect(
      await screen.findByRole("alert", {
        name: /couldn't load your objectives/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Clean Slate/i)).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /retry loading objectives/i }),
    );

    expect(await screen.findByText(mockTodo.payload.title)).toBeInTheDocument();
  });

  it("shows a locally created task after the initial load fails", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Service unavailable" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTodo }),
      });

    render(<TodoAdminView />);

    await screen.findByRole("alert", {
      name: /couldn't load your objectives/i,
    });

    fireEvent.change(screen.getByRole("textbox", { name: "Task title" }), {
      target: { value: mockTodo.payload.title },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add task" }));

    expect(await screen.findByText(mockTodo.payload.title)).toBeInTheDocument();
  });

  it("keeps loaded objectives available when a recovery refresh fails", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockTodo] }),
      })
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Service unavailable" }),
      });

    render(<TodoAdminView />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Mark as complete" }),
    );

    expect(
      await screen.findByRole("alert", {
        name: /couldn't load your objectives/i,
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /done filter/i }));

    expect(await screen.findByText(mockTodo.payload.title)).toBeInTheDocument();
  });
});
