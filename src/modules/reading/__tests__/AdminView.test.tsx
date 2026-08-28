import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ReadingListAdminView from "../AdminView";

const readingItem = {
  _id: "reading-1",
  module_type: "reading_item",
  is_public: false,
  created_at: "2026-08-28T00:00:00.000Z",
  updated_at: "2026-08-28T00:00:00.000Z",
  payload: {
    url: "https://example.com/retryable-reading-item",
    title: "Retryable reading item",
    source_domain: "example.com",
    priority: "high",
    type: "article",
    is_read: false,
    tags: [],
  },
};

describe("ReadingListAdminView", () => {
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

  it("renders the Reading List view", async () => {
    render(<ReadingListAdminView />);
    await waitFor(
      () => {
        expect(screen.queryByText(/Loading/i)).toBeNull();
      },
      { timeout: 2000 },
    );

    expect(screen.getByText(/Reading Queue/i)).toBeDefined();
  });

  it("keeps a failed queue load distinct from an empty queue and retries it", async () => {
    let readingLoadAttempts = 0;
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === "/api/system") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        });
      }
      if (url === "/api/content?module_type=reading_item") {
        readingLoadAttempts += 1;
        if (readingLoadAttempts === 1) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: "Service unavailable" }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [readingItem] }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<ReadingListAdminView />);

    expect(
      await screen.findByRole("alert", {
        name: /couldn't load your reading queue/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Queue is empty for current filters."),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /retry loading reading queue/i }),
    );

    expect(
      await screen.findByText(readingItem.payload.title),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(readingLoadAttempts).toBe(2);
      expect(
        screen.queryByRole("alert", {
          name: /couldn't load your reading queue/i,
        }),
      ).not.toBeInTheDocument();
    });
  });

  it("keeps loaded items visible when a refresh after marking one as read fails", async () => {
    let readingLoadAttempts = 0;
    global.fetch = vi.fn().mockImplementation((url, init) => {
      if (url === "/api/system") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        });
      }
      if (url === `/api/content/${readingItem._id}` && init?.method === "PUT") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: readingItem }),
        });
      }
      if (url === "/api/content?module_type=reading_item") {
        readingLoadAttempts += 1;
        return Promise.resolve(
          readingLoadAttempts === 1
            ? {
                ok: true,
                json: () => Promise.resolve({ data: [readingItem] }),
              }
            : {
                ok: false,
                json: () =>
                  Promise.resolve({ error: "Service unavailable" }),
              },
        );
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<ReadingListAdminView />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Mark as read" }),
    );

    expect(
      await screen.findByRole("alert", {
        name: /couldn't load your reading queue/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(readingItem.payload.title)).toBeInTheDocument();
  });
});
