import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Widget from "../Widget";

describe("Expense Spaces widget", () => {
  beforeEach(() => vi.resetAllMocks());

  it("shows a compact skeleton while the summary is loading", () => {
    global.fetch = vi.fn(() => new Promise<Response>(() => {}));
    render(<Widget />);

    expect(
      screen.getByRole("status", { name: /loading expense spaces widget/i }),
    ).toHaveAttribute("aria-busy", "true");
  });

  it("renders active spaces and three compact supporting metrics", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            active_spaces: 2,
            entries_this_month: 18,
            spaces_with_budgets: 1,
            currencies_in_use: 2,
          },
        }),
    } as Response);

    render(<Widget />);

    expect(await screen.findAllByText("2")).toHaveLength(2);
    expect(screen.getByText("active spaces")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("this month")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("budgets")).toBeInTheDocument();
    expect(screen.getByText("currencies")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/widgets/summary?module_type=expense_space",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("surfaces API failures instead of displaying misleading zeros", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Database unavailable" }),
    } as Response);
    render(<Widget />);

    expect(await screen.findByText(/summary unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("uses the whole 280px-safe card as the only interactive target", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            active_spaces: 0,
            entries_this_month: 0,
            spaces_with_budgets: 0,
            currencies_in_use: 0,
          },
        }),
    } as Response);
    render(<Widget />);

    const link = await screen.findByRole("link", {
      name: /open expense spaces module/i,
    });
    expect(link).toHaveAttribute("href", "/admin/expense-spaces");
    expect(link.querySelector("button, input, select, textarea")).toBeNull();
    expect(link.firstElementChild).toHaveStyle({ maxHeight: "280px" });
  });
});
