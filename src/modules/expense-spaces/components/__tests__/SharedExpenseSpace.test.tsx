import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SharedExpenseSpace from "../SharedExpenseSpace";

const result = {
  space: {
    name: "Holiday",
    currency: "USD",
    number_format: "western",
    budget: { amount: 1000, cadence: "total" },
    categories: [{ id: "food", name: "Food", subcategories: [] }],
  },
  summary: { total: 20, month: 20, count: 1 },
  entries: [
    {
      id: "entry",
      description: "Lunch",
      paid_to: "Cafe",
      amount: 20,
      currency: "USD",
      category_id: "food",
      date: "2026-01-01",
      tags: [],
      receipts: [{ filename: "receipt.pdf", index: 0 }],
    },
  ],
  total: 1,
  page: 1,
  documents: [{ id: "doc", filename: "invoice.pdf", size: 100 }],
  documentTotal: 1,
  docsPage: 1,
};
afterEach(() => vi.unstubAllGlobals());
describe("shared expense space", () => {
  it("renders a read-only ledger and requests the selected category and search", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => result });
    vi.stubGlobal("fetch", fetcher);
    render(<SharedExpenseSpace token={"a".repeat(43)} />);
    expect(
      await screen.findByRole("heading", { name: "Holiday" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /invoice.pdf/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/attachment/document/doc"),
    );
    expect(
      screen.queryByRole("button", { name: /edit|delete|add expense/i }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "food" },
    });
    fireEvent.change(screen.getByLabelText("Search expenses"), {
      target: { value: "Lunch" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() =>
      expect(fetcher.mock.calls.at(-1)?.[0]).toContain("category=food"),
    );
    expect(fetcher.mock.calls.at(-1)?.[0]).toContain("search=Lunch");
  });
  it("shows an unavailable message for a revoked link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );
    render(<SharedExpenseSpace token="invalid" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "paused or deleted",
    );
  });
});
