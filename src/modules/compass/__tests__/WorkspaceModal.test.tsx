import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
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

const taskWithSubtask: CompassTask = {
  ...task,
  payload: {
    ...task.payload,
    checklist: [
      {
        id: "subtask-1",
        text: "Draft the release checklist",
        completed: false,
        comments: [],
      },
    ],
  },
};

function WorkspaceModalHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open task workspace
      </button>
      {open && (
        <WorkspaceModal
          task={task}
          onClose={() => setOpen(false)}
          onUpdate={vi.fn()}
        />
      )}
    </>
  );
}

describe("WorkspaceModal", () => {
  it("traps focus and restores the workspace opener after Escape", () => {
    render(<WorkspaceModalHarness />);

    const opener = screen.getByRole("button", {
      name: "Open task workspace",
    });
    opener.focus();
    fireEvent.click(opener);

    const dialog = screen.getByRole("dialog", {
      name: "Plan launch workspace",
    });
    const closeButton = screen.getByRole("button", {
      name: "Close task workspace",
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("opens subtask details from a semantic control and hides the workspace while nested", () => {
    render(
      <WorkspaceModal
        task={taskWithSubtask}
        onClose={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    const workspace = screen.getByRole("dialog", {
      name: "Plan launch workspace",
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Open details for checklist item Draft the release checklist",
      }),
    );

    expect(
      screen.getByRole("dialog", {
        name: "Draft the release checklist details",
      }),
    ).toBeInTheDocument();
    expect(workspace).toHaveAttribute("aria-hidden", "true");
  });

  it("closes the bulk importer with Escape without closing the workspace", () => {
    render(<WorkspaceModal task={task} onClose={vi.fn()} onUpdate={vi.fn()} />);

    const workspace = screen.getByRole("dialog", {
      name: "Plan launch workspace",
    });
    const importOpener = screen.getByRole("button", {
      name: "Open bulk import items panel",
    });
    importOpener.focus();
    fireEvent.click(importOpener);

    expect(
      screen.getByRole("dialog", { name: /bulk import checklist/i }),
    ).toHaveAttribute("aria-modal", "true");
    expect(workspace).toHaveAttribute("aria-hidden", "true");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: /bulk import checklist/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Plan launch workspace" }),
    ).toBeInTheDocument();
    expect(importOpener).toHaveFocus();
  });

  it("exposes workspace description and comment editors as keyboard-operable buttons", () => {
    render(<WorkspaceModal task={task} onClose={vi.fn()} onUpdate={vi.fn()} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Edit task description" }),
    );
    expect(screen.getByPlaceholderText("Write markdown here...")).toHaveFocus();

    fireEvent.click(
      screen.getByRole("button", { name: "Add a note or comment" }),
    );
    expect(
      screen.getByPlaceholderText("Add a comment or update note..."),
    ).toHaveFocus();
  });

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
