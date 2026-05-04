import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WorkspaceModal from "../WorkspaceModal";
import type { CompassTask } from "../types";

const task: CompassTask = {
  _id: "task1",
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z",
  payload: {
    title: "Plan launch",
    status: "in_progress",
    priority: "p3",
    comments: [],
    checklist: [],
    category_tags: [],
    links: [],
  },
};

describe("WorkspaceModal", () => {
  it("keeps the link editor open when an invalid URL is submitted", () => {
    const onUpdate = vi.fn();
    const { container } = render(
      <WorkspaceModal task={task} onClose={vi.fn()} onUpdate={onUpdate} />,
    );

    fireEvent.change(screen.getByPlaceholderText("https://..."), {
      target: { value: "not a url" },
    });

    const addLinkButton = container.querySelector(
      'input[placeholder="https://..."] + button',
    );

    expect(addLinkButton).not.toBeNull();
    expect(() => fireEvent.click(addLinkButton!)).not.toThrow();
    expect(screen.getByText("Enter a valid URL.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("https://...")).toHaveValue("not a url");
  });
});
