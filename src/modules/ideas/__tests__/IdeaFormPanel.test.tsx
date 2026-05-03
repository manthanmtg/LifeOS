import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import IdeaFormPanel from "../components/IdeaFormPanel";

const baseProps = {
  editingId: null,
  title: "",
  setTitle: vi.fn(),
  description: "",
  setDescription: vi.fn(),
  notes: "",
  setNotes: vi.fn(),
  category: "",
  setCategory: vi.fn(),
  status: "raw",
  setStatus: vi.fn(),
  priority: "medium",
  setPriority: vi.fn(),
  tagsInput: "",
  setTagsInput: vi.fn(),
  isSubmitting: false,
  formError: "",
  categories: ["Product"],
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
};

describe("IdeaFormPanel", () => {
  it("exposes the tag entry hint as the tags field description", () => {
    render(<IdeaFormPanel {...baseProps} />);

    expect(screen.getByLabelText(/tags/i)).toHaveAccessibleDescription(
      /separate tags with commas/i,
    );
  });
});
