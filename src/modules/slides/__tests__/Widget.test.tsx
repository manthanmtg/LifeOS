import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SlidesWidget from "../Widget";
import WidgetCard from "@/components/dashboard/WidgetCard";

vi.mock("@/components/dashboard/WidgetCard", () => ({
  default: vi.fn(
    ({
      children,
      footer,
    }: {
      children: React.ReactNode;
      footer?: React.ReactNode;
    }) => (
      <section>
        {children}
        {footer}
      </section>
    ),
  ),
}));

describe("SlidesWidget", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
  });

  it("does not rerender when its parent updates without changing props", () => {
    function Host() {
      const [count, setCount] = useState(0);

      return (
        <>
          <button type="button" onClick={() => setCount((value) => value + 1)}>
            parent rerender {count}
          </button>
          <SlidesWidget />
        </>
      );
    }

    render(<Host />);

    expect(WidgetCard).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /parent rerender/i }));

    expect(WidgetCard).toHaveBeenCalledTimes(1);
  });

  it("keeps dashboard metrics inside the single widget detail area", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        data: {
          total: 3,
          publicDecks: 2,
          uniqueTopics: 2,
          latest: {
            payload: {
              title: "Quarterly planning",
              format: "pdf",
            },
            created_at: "2026-05-01T12:00:00.000Z",
          },
        },
      }),
    });

    render(<SlidesWidget />);

    await waitFor(() => {
      expect(WidgetCard).toHaveBeenLastCalledWith(
        expect.objectContaining({ loading: false }),
        undefined,
      );
    });
    expect(WidgetCard).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ footer: expect.anything() }),
      undefined,
    );
  });
});
