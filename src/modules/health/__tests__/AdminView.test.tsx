import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

// Mock react-easy-crop (used by ImageCropper, not installed in test env)
vi.mock("react-easy-crop", () => ({
  default: () => React.createElement("div", { "data-testid": "mock-cropper" }),
}));

// Mock react-pdf (used by PdfThumbnail, not installed in test env)
vi.mock("react-pdf", () => ({
  Document: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
  Page: () => React.createElement("div"),
  pdfjs: { GlobalWorkerOptions: {} },
}));

import HealthAdminView from "../AdminView";

describe("HealthAdminView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/content")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    // Mock crypto.randomUUID
    vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });
  });

  it("renders the Health view header", async () => {
    render(<HealthAdminView />);
    await waitFor(
      () => {
        expect(screen.queryByText(/Loading/i)).toBeNull();
      },
      { timeout: 3000 },
    );
    expect(screen.getByRole("heading", { name: /Health/i })).toBeDefined();
  });

  it("shows empty state when no profiles exist", async () => {
    render(<HealthAdminView />);
    await waitFor(
      () => {
        expect(screen.getByText(/No health profiles yet/i)).toBeDefined();
      },
      { timeout: 3000 },
    );
  });

  it("shows Add Profile button", async () => {
    render(<HealthAdminView />);
    await waitFor(
      () => {
        expect(screen.getByText(/Add.*Profile/i)).toBeDefined();
      },
      { timeout: 3000 },
    );
  });

  it("shows a saving state and prevents a second vaccination save", async () => {
    const profile = {
      _id: "profile-1",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      payload: {
        name: "Milo",
        type: "pet",
        blood_group: "unknown",
        allergies: [],
        conditions: [],
        medications: [],
        vaccinations: [],
        visits: [],
        lab_results: [],
        measurements: [],
        documents: [],
        tags: [],
      },
    };
    global.fetch = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "PATCH") {
          return new Promise(() => undefined);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [profile] }),
        });
      });

    render(<HealthAdminView />);
    await screen.findByText("Milo");
    fireEvent.click(screen.getByText("Milo"));
    fireEvent.click(await screen.findByRole("button", { name: "Vaccines" }));
    fireEvent.click(screen.getByRole("button", { name: /Add vaccine/i }));
    fireEvent.change(screen.getByPlaceholderText("e.g., COVID-19 Booster"), {
      target: { value: "Rabies" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Saving..." })).toHaveProperty(
        "disabled",
        true,
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Saving..." }));
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("saves a vaccination repeat without resending the profile picture", async () => {
    const profile = {
      _id: "profile-1",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      payload: {
        name: "Cookie",
        type: "pet",
        blood_group: "unknown",
        profile_pic: {
          data: "large-base64-profile-picture",
          content_type: "image/jpeg",
        },
        allergies: [],
        conditions: [],
        medications: [],
        vaccinations: [
          {
            id: "vaccination-1",
            name: "Rabies",
            date_administered: "2026-01-01T00:00:00.000Z",
            next_due: "2099-01-01T00:00:00.000Z",
            repeat_interval_months: 12,
          },
        ],
        visits: [],
        lab_results: [],
        measurements: [],
        documents: [],
        tags: [],
      },
    };
    global.fetch = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { success: true } }),
          });
        }
        if (url === "/api/content/profile-1") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: profile }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [profile] }),
        });
      });

    render(<HealthAdminView />);
    fireEvent.click(await screen.findByText("Cookie"));
    fireEvent.click(await screen.findByRole("button", { name: "Vaccines" }));
    fireEvent.click(
      screen.getByRole("button", { name: /Mark repeat done/i, hidden: true }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(
        vi
          .mocked(global.fetch)
          .mock.calls.some(
            ([, init]) => init?.method === "PATCH" || init?.method === "PUT",
          ),
      ).toBe(true);
    });
    const writeCall = vi
      .mocked(global.fetch)
      .mock.calls.find(
        ([, init]) => init?.method === "PATCH" || init?.method === "PUT",
      );
    expect(writeCall?.[1]?.method).toBe("PATCH");
    const body = JSON.parse(String(writeCall?.[1]?.body));
    expect(Object.keys(body.payload)).toEqual(["vaccinations"]);
    expect(body.payload).not.toHaveProperty("profile_pic");
  });
});
