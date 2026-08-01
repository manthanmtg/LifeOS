import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PeopleAdminView from "../AdminView";

describe("PeopleAdminView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders and interacts with people tabs", async () => {
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
          json: () =>
            Promise.resolve({
              data: [
                {
                  _id: "p1",
                  _collection: "people",
                  payload: {
                    name: "John Doe",
                    relationship: "friend",
                    status: "active",
                    birthday: "1990-01-01",
                    last_contacted: "2024-01-01",
                    interests: [],
                    tags: [],
                    social_links: [],
                    interactions: [],
                    notes: "Test Note",
                  },
                },
              ],
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<PeopleAdminView />);

    await waitFor(
      () => {
        expect(screen.queryByText(/Loading/i)).toBeNull();
      },
      { timeout: 2000 },
    );

    expect(screen.getByText("People")).toBeTruthy();

    // Find person card
    const card = await screen.findByRole("heading", { name: /John Doe/i });
    fireEvent.click(card);

    // Verify detail view content
    await waitFor(() => {
      expect(screen.getByText(/Test Note/i)).toBeTruthy();
    });
    expect(screen.getByText(/friend/i)).toBeTruthy();
  });

  it("opens people reminder settings and persists relationship overrides", async () => {
    global.fetch = vi.fn().mockImplementation((url, init) => {
      if (url === "/api/system" && init?.method === "PUT") {
        return Promise.resolve({ ok: true });
      }
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

    render(<PeopleAdminView />);

    fireEvent.click(
      await screen.findByRole("button", { name: /People reminders/i }),
    );
    const friendRow = await screen.findByRole("group", {
      name: /Birthday Friend/i,
    });
    fireEvent.click(
      within(friendRow).getByRole("radio", { name: /Override/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/system",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining('"peopleSettings"'),
        }),
      ),
    );
  });
});
