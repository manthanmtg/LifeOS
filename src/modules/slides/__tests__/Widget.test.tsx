import { fireEvent, render, screen } from "@testing-library/react";
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
});
