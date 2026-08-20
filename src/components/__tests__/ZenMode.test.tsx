import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ZenModeProvider from "../ZenMode";

describe("ZenModeProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("keeps the zen mode indicator hidden without scheduling a mount timer", () => {
    const timeoutSpy = vi.spyOn(window, "setTimeout");

    render(
      <ZenModeProvider>
        <div>Content</div>
      </ZenModeProvider>,
    );

    expect(screen.queryByText(/Zen Mode/)).not.toBeInTheDocument();
    expect(timeoutSpy).not.toHaveBeenCalled();
  });

  it("toggles zen mode with the keyboard shortcut", () => {
    render(
      <ZenModeProvider>
        <div>Content</div>
      </ZenModeProvider>,
    );

    fireZenShortcut();
    expect(screen.getByRole("status")).toHaveTextContent(/Zen mode active/i);
    expect(screen.getByRole("button", { name: "Exit Zen Mode" })).toBeVisible();

    fireZenShortcut();
    expect(screen.queryByText(/Zen Mode/)).not.toBeInTheDocument();
  });

  it("keeps the zen mode indicator constrained on mobile screens", () => {
    render(
      <ZenModeProvider>
        <div>Content</div>
      </ZenModeProvider>,
    );

    fireZenShortcut();

    expect(screen.getByRole("status")).toHaveClass(
      "left-4",
      "right-4",
      "text-center",
      "sm:left-auto",
      "sm:w-fit",
    );
  });

  it("provides a pointer-accessible exit and exposes state on the provider", () => {
    const { container } = render(
      <ZenModeProvider>
        <div>Content</div>
      </ZenModeProvider>,
    );

    fireZenShortcut();
    expect(container.firstElementChild).toHaveAttribute(
      "data-zen-mode",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Exit Zen Mode" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute(
      "data-zen-mode",
      "false",
    );
  });

  it("removes the keyboard listener on unmount", () => {
    vi.useFakeTimers();
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = render(
      <ZenModeProvider>
        <div>Content</div>
      </ZenModeProvider>,
    );

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });
});

function fireZenShortcut() {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { ctrlKey: true, shiftKey: true, key: "Z" }),
    );
  });
}
