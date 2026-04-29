import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { cn } from "@/lib/utils";
import { Button } from "../Button";

vi.mock("@/lib/utils", () => ({
  cn: vi.fn((...classes: Array<string | false | null | undefined>) =>
    classes.filter(Boolean).join(" "),
  ),
}));

describe("Button", () => {
  it("skips rerenders when stable props do not change", () => {
    const onClick = vi.fn();

    function Harness() {
      const [, setRevision] = React.useState(0);

      return (
        <>
          <Button onClick={onClick}>Save</Button>
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
          >
            rerender
          </button>
        </>
      );
    }

    render(<Harness />);

    expect(cn).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "rerender" }));

    expect(cn).toHaveBeenCalledTimes(1);
  });
});
