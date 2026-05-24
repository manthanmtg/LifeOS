import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import QuickAddTodo from "../components/QuickAddTodo";
import React from "react";

describe("QuickAddTodo", () => {
  it("submits trimmed task titles", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);

    render(React.createElement(QuickAddTodo, { onAdd, isSaving: false }));

    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: "  Call insurance  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /add task/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith("Call insurance", "medium");
    });
  });

  it("stacks quick-add controls on narrow screens", () => {
    render(
      React.createElement(QuickAddTodo, { onAdd: vi.fn(), isSaving: false }),
    );

    expect(
      screen.getByLabelText(/task title/i).closest(".relative")?.parentElement,
    ).toHaveClass("flex-col");
    expect(
      screen.getByRole("group", { name: /set task priority/i }),
    ).toHaveClass("w-full");
  });
});
