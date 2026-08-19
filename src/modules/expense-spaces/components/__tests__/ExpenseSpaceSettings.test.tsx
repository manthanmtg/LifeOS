import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExpenseSpaceSettings from "../ExpenseSpaceSettings";
import { ExpenseSpacesApiError } from "../../api";
import type { ExpenseSpaceDocument } from "../../types";

const usedCategoryId = "22222222-2222-4222-8222-222222222222";
const unusedCategoryId = "33333333-3333-4333-8333-333333333333";

const space: ExpenseSpaceDocument = {
  _id: "507f1f77bcf86cd799439011",
  module_type: "expense_space",
  is_public: false,
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-18T00:00:00.000Z",
  payload: {
    space_key: "11111111-1111-4111-8111-111111111111",
    name: "House Renovation",
    currency: "INR",
    number_format: "indian",
    status: "active",
    categories: [
      {
        id: usedCategoryId,
        name: "Materials",
        is_active: true,
        subcategories: [],
      },
      {
        id: unusedCategoryId,
        name: "Planning",
        is_active: true,
        subcategories: [],
      },
    ],
  },
};

function renderSettings(
  overrides: Partial<React.ComponentProps<typeof ExpenseSpaceSettings>> = {},
) {
  const props: React.ComponentProps<typeof ExpenseSpaceSettings> = {
    space,
    entryCount: 1,
    usedCategoryIds: [usedCategoryId],
    usedSubcategoryIds: [],
    onUpdate: vi.fn().mockResolvedValue(space),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onReload: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(<ExpenseSpaceSettings {...props} />);
  return props;
}

describe("ExpenseSpaceSettings", () => {
  it("locks currency and distinguishes used from removable taxonomy", () => {
    renderSettings();

    expect(screen.getByLabelText(/currency/i)).toBeDisabled();
    expect(screen.getByText(/locked after the first expense/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: /archive materials category/i }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /remove materials category/i }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: /remove planning category/i }),
    ).toBeVisible();
  });

  it("renames, archives, and removes taxonomy in the local draft", async () => {
    const props = renderSettings({ entryCount: 0, usedCategoryIds: [] });

    fireEvent.change(screen.getByLabelText(/category name materials/i), {
      target: { value: "Supplies" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /archive supplies category/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /remove planning category/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /add category/i }));
    fireEvent.change(screen.getByLabelText(/category name new category/i), {
      target: { value: "Active work" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => expect(props.onUpdate).toHaveBeenCalledTimes(1));
    expect(vi.mocked(props.onUpdate).mock.calls[0][0]).toMatchObject({
      name: "House Renovation",
      categories: [
        expect.objectContaining({ name: "Supplies", is_active: false }),
        expect.objectContaining({ name: "Active work", is_active: true }),
      ],
      expected_updated_at: space.updated_at,
    });
    expect(screen.getByRole("status")).toHaveTextContent(/settings saved/i);
  });

  it("surfaces stale-write recovery and reloads current settings", async () => {
    const onReload = vi.fn().mockResolvedValue(undefined);
    renderSettings({
      onReload,
      onUpdate: vi
        .fn()
        .mockRejectedValue(
          new ExpenseSpacesApiError("Changed in another tab", 409),
        ),
    });

    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /changed in another tab/i,
    );
    fireEvent.click(screen.getByRole("button", { name: /reload settings/i }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("restores an archived space through the same concurrency-safe update", async () => {
    const onUpdate = vi.fn().mockResolvedValue(space);
    renderSettings({
      space: { ...space, payload: { ...space.payload, status: "archived" } },
      onUpdate,
    });

    fireEvent.click(screen.getByRole("button", { name: /restore space/i }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
    expect(onUpdate.mock.calls[0][0]).toMatchObject({ status: "active" });
  });

  it("requires exact-name confirmation for permanent deletion", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    renderSettings({ onDelete });

    fireEvent.click(
      screen.getByRole("button", { name: /permanently delete space/i }),
    );
    const confirm = screen.getByLabelText(/type house renovation to confirm/i);
    fireEvent.change(confirm, { target: { value: "house renovation" } });
    expect(
      screen.getByRole("button", { name: /delete house renovation forever/i }),
    ).toBeDisabled();

    fireEvent.change(confirm, { target: { value: "House Renovation" } });
    fireEvent.click(
      screen.getByRole("button", { name: /delete house renovation forever/i }),
    );

    await waitFor(() =>
      expect(onDelete).toHaveBeenCalledWith("House Renovation"),
    );
  });
});
