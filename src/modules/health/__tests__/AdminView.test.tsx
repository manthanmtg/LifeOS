import { render, screen, waitFor } from "@testing-library/react";
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
});
