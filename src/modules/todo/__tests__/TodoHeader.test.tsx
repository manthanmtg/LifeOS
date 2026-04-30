import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TodoHeader from "../components/TodoHeader";
import React from "react";

describe("TodoHeader", () => {
  const renderHeader = (
    props: Partial<React.ComponentProps<typeof TodoHeader>> = {},
  ) =>
    render(
      React.createElement(TodoHeader, {
        onAddTodo: vi.fn(),
        viewMode: "list",
        onViewModeChange: vi.fn(),
        ...props,
      }),
    );

  it("keeps the portal breadcrumb as a normal link", () => {
    renderHeader();

    const portalLink = screen.getByRole("link", {
      name: /back to admin portal/i,
    });

    expect(portalLink).toHaveAttribute("href", "/admin");
  });

  it("keeps the view mode controls and new task action available", () => {
    const onAddTodo = vi.fn();
    const onViewModeChange = vi.fn();

    renderHeader({ onAddTodo, onViewModeChange });

    fireEvent.click(screen.getByRole("button", { name: /grid view/i }));
    fireEvent.click(screen.getByRole("button", { name: /new task/i }));

    expect(onViewModeChange).toHaveBeenCalledWith("grid");
    expect(onAddTodo).toHaveBeenCalledTimes(1);
  });
});
