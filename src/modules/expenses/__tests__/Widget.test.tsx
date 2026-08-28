import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { _resetSystemCache } from "@/hooks/useModuleSettings";
import ExpensesWidget from "../Widget";

describe("ExpensesWidget", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    _resetSystemCache();

    global.fetch = vi.fn().mockImplementation((url) => {
      if (String(url) === "/api/system") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        });
      }

      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Service unavailable" }),
      });
    });
  });

  it("surfaces an unavailable summary instead of displaying a zero-spend state", async () => {
    render(<ExpensesWidget />);

    expect(
      await screen.findByText("Unable to load expense summary"),
    ).toBeInTheDocument();
    expect(screen.getByText("expense summary unavailable")).toBeInTheDocument();
    expect(screen.queryByText("$0")).not.toBeInTheDocument();
    expect(screen.queryByText("No expenses yet")).not.toBeInTheDocument();
  });
});
