import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ExpenseSpaceShareManager from "../ExpenseSpaceShareManager";
import type { ExpenseSpaceSummary } from "../../types";

const space = {
  _id: "507f1f77bcf86cd799439011",
  payload: { name: "Holiday" },
} as ExpenseSpaceSummary;
const share = {
  spaceId: space._id,
  name: "Holiday",
  paused: false,
  token: "a".repeat(43),
};
const ok = (data: unknown) =>
  Promise.resolve({ ok: true, json: async () => ({ data }) } as Response);
afterEach(() => vi.unstubAllGlobals());
describe("public share manager", () => {
  it("creates, pauses, resumes and deletes the link", async () => {
    let current: typeof share | null = null;
    const fetcher = vi.fn((_url: string, options?: RequestInit) => {
      if (options?.method === "POST") current = { ...share };
      if (options?.method === "PATCH" && current)
        current = {
          ...current,
          paused: JSON.parse(String(options.body)).paused,
        };
      if (options?.method === "DELETE") current = null;
      return ok(options?.method ? {} : current ? [current] : []);
    });
    vi.stubGlobal("fetch", fetcher);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ExpenseSpaceShareManager spaces={[space]} spaceId={space._id} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Generate link" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Pause" }));
    fireEvent.click(await screen.findByRole("button", { name: "Resume" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Generate link" }),
      ).toBeInTheDocument(),
    );
    expect(
      fetcher.mock.calls
        .filter(([, options]) => options?.method)
        .map(([, options]) => options?.method),
    ).toEqual(["POST", "PATCH", "PATCH", "DELETE"]);
  });
  it("shows a retry option rather than claiming there are no shares when loading fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<ExpenseSpaceShareManager spaces={[space]} />);
    expect(
      await screen.findByRole("button", { name: "Retry loading shares" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/No public links/)).not.toBeInTheDocument();
  });
});
