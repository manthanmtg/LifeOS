import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SnippetsAdminView from "../AdminView";

describe("SnippetsAdminView", () => {
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

  it("renders the Snippets view", async () => {
    render(<SnippetsAdminView />);
    await waitFor(
      () => {
        expect(screen.queryByText(/Loading/i)).toBeNull();
      },
      { timeout: 2000 },
    );

    expect(
      screen.getByRole("heading", { name: /Snippet/i, level: 1 }),
    ).toBeDefined();
  });

  it("keeps a failed library load distinct from an empty library and retries it", async () => {
    const snippet = {
      _id: "snippet-1",
      created_at: "2026-08-28T00:00:00.000Z",
      payload: {
        title: "Retryable fetch helper",
        code: "export const load = () => fetch('/api');",
        language: "typescript",
        tags: [],
        is_favorite: false,
      },
    };
    let snippetLoadAttempts = 0;

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === "/api/system") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        });
      }
      if (url === "/api/content?module_type=snippet") {
        snippetLoadAttempts += 1;
        if (snippetLoadAttempts === 1) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: "Service unavailable" }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [snippet] }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<SnippetsAdminView />);

    expect(
      await screen.findByRole("alert", {
        name: /couldn't load your snippet library/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("No snippets found")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /retry loading snippets/i }),
    );

    expect(await screen.findByText(snippet.payload.title)).toBeInTheDocument();
    await waitFor(() => {
      expect(snippetLoadAttempts).toBe(2);
      expect(
        screen.queryByRole("alert", {
          name: /couldn't load your snippet library/i,
        }),
      ).not.toBeInTheDocument();
    });
  });

  it("keeps loaded snippets visible when a refresh after favoriting fails", async () => {
    const snippet = {
      _id: "snippet-1",
      created_at: "2026-08-28T00:00:00.000Z",
      payload: {
        title: "Preserved fetch helper",
        code: "export const load = () => fetch('/api');",
        language: "typescript",
        tags: [],
        is_favorite: false,
      },
    };
    let snippetLoadAttempts = 0;

    global.fetch = vi.fn().mockImplementation((url, init) => {
      if (url === "/api/system") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        });
      }
      if (url === `/api/content/${snippet._id}` && init?.method === "PUT") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: snippet }),
        });
      }
      if (url === "/api/content?module_type=snippet") {
        snippetLoadAttempts += 1;
        return Promise.resolve(
          snippetLoadAttempts === 1
            ? {
                ok: true,
                json: () => Promise.resolve({ data: [snippet] }),
              }
            : {
                ok: false,
                json: () => Promise.resolve({ error: "Service unavailable" }),
              },
        );
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<SnippetsAdminView />);

    fireEvent.click(await screen.findByTitle("Star"));

    expect(
      await screen.findByRole("alert", {
        name: /couldn't load your snippet library/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(snippet.payload.title)).toBeInTheDocument();
    expect(snippetLoadAttempts).toBe(2);
  });
});
