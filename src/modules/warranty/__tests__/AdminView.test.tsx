import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import WarrantyAdminView from "../AdminView";

describe("WarrantyAdminView", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { items: [], total: 0 } }),
      }),
    );
  });

  it("shows an empty private warranty workspace with a clear add action", async () => {
    render(<WarrantyAdminView />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Warranty" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: "Add warranty item" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("No warranty items yet")).toBeInTheDocument(),
    );
  });
});
