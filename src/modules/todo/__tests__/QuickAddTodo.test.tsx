import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import QuickAddTodo from "../components/QuickAddTodo";
import React from "react";

describe("QuickAddTodo", () => {
  it("submits trimmed task titles", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);

    render(<QuickAddTodo onAdd={onAdd} isSaving={false} />);

    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: "  Call insurance  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /add task/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith("Call insurance", "medium");
    });
  });
});
