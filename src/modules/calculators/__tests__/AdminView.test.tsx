import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CalculatorsAdminView from "../AdminView";
import { _resetSystemCache } from "@/hooks/useModuleSettings";
import React from "react";

describe("CalculatorsAdminView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    _resetSystemCache();
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

  it("renders the Calculators view", async () => {
    render(<CalculatorsAdminView />);
    await waitFor(
      () => {
        expect(screen.queryByText(/Loading/i)).toBeNull();
      },
      { timeout: 2000 },
    );

    expect(screen.getByText(/Calculators Module/i)).toBeDefined();
  });

  it("shows a skeleton while calculator settings load", () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === "/api/system") {
        return new Promise(() => {});
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<CalculatorsAdminView />);

    expect(screen.getByLabelText("Loading calculator settings")).toBeDefined();
    expect(screen.queryByText(/Calculators Module/i)).toBeNull();
  });
});
