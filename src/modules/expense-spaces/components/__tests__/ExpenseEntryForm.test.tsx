import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExpenseEntryForm from "../ExpenseEntryForm";
import type { ExpenseSpaceDocument, ExpenseSpaceEntryInput } from "../../types";

const foodId = "22222222-2222-4222-8222-222222222222";
const groceriesId = "33333333-3333-4333-8333-333333333333";
const travelId = "44444444-4444-4444-8444-444444444444";
const fuelId = "55555555-5555-4555-8555-555555555555";

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
        id: foodId,
        name: "Food",
        is_active: true,
        subcategories: [
          { id: groceriesId, name: "Groceries", is_active: true },
        ],
      },
      {
        id: travelId,
        name: "Travel",
        is_active: true,
        subcategories: [{ id: fuelId, name: "Fuel", is_active: true }],
      },
    ],
  },
};

function fillRequired() {
  fireEvent.change(screen.getByLabelText(/amount/i), {
    target: { value: "125" },
  });
  fireEvent.change(screen.getByLabelText(/^date/i), {
    target: { value: "2026-08-19" },
  });
  fireEvent.change(screen.getByLabelText(/description/i), {
    target: { value: "Floor tiles" },
  });
  fireEvent.change(screen.getByLabelText(/paid to/i), {
    target: { value: "Supplier" },
  });
  fireEvent.change(screen.getByLabelText(/^category/i), {
    target: { value: foodId },
  });
}

describe("ExpenseEntryForm", () => {
  it("reports missing required details without calling save", async () => {
    const onSave = vi.fn();
    render(
      <ExpenseEntryForm
        open
        space={space}
        onClose={vi.fn()}
        onSave={onSave}
        onSaveSpaceTaxonomy={vi.fn()}
        payeeSuggestions={[]}
      />,
    );

    fireEvent.submit(screen.getByRole("form", { name: /expense details/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /amount, date, description, paid to, and category are required/i,
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows only subcategories owned by the selected category", () => {
    render(
      <ExpenseEntryForm
        open
        space={space}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onSaveSpaceTaxonomy={vi.fn()}
        payeeSuggestions={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText(/^category/i), {
      target: { value: travelId },
    });

    expect(screen.getByRole("option", { name: "Fuel" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Groceries" })).toBeNull();
  });

  it("persists inline taxonomy before saving the expense", async () => {
    const calls: string[] = [];
    const onSaveSpaceTaxonomy = vi.fn(async (payload) => {
      calls.push("taxonomy");
      return {
        ...space,
        payload: { ...space.payload, categories: payload.categories },
      };
    });
    const onSave = vi.fn<(input: ExpenseSpaceEntryInput) => Promise<void>>(
      async () => {
        calls.push("entry");
      },
    );
    render(
      <ExpenseEntryForm
        open
        space={space}
        onClose={vi.fn()}
        onSave={onSave}
        onSaveSpaceTaxonomy={onSaveSpaceTaxonomy}
        payeeSuggestions={[]}
      />,
    );
    fillRequired();
    fireEvent.click(
      screen.getByRole("button", { name: /add category inline/i }),
    );
    fireEvent.change(screen.getByLabelText(/new category name/i), {
      target: { value: "Fixtures" },
    });
    fireEvent.submit(screen.getByRole("form", { name: /expense details/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(calls).toEqual(["taxonomy", "entry"]);
    expect(onSave.mock.calls[0][0]).toMatchObject({
      amount: 125,
      description: "Floor tiles",
      paid_to: "Supplier",
      date: "2026-08-19",
      category_id: expect.any(String),
    });
  });

  it("accepts a new inline category without selecting an existing category", async () => {
    const onSaveSpaceTaxonomy = vi.fn(async (payload) => ({
      ...space,
      payload: { ...space.payload, categories: payload.categories },
    }));
    const onSave = vi.fn<(input: ExpenseSpaceEntryInput) => Promise<void>>(
      async () => {},
    );
    render(
      <ExpenseEntryForm
        open
        space={space}
        onClose={vi.fn()}
        onSave={onSave}
        onSaveSpaceTaxonomy={onSaveSpaceTaxonomy}
        payeeSuggestions={[]}
      />,
    );
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "125" },
    });
    fireEvent.change(screen.getByLabelText(/^date/i), {
      target: { value: "2026-08-19" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Floor tiles" },
    });
    fireEvent.change(screen.getByLabelText(/paid to/i), {
      target: { value: "Supplier" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /add category inline/i }),
    );
    fireEvent.change(screen.getByLabelText(/new category name/i), {
      target: { value: "Fixtures" },
    });
    fireEvent.submit(screen.getByRole("form", { name: /expense details/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSaveSpaceTaxonomy).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].category_id).toEqual(expect.any(String));
  });

  it("prevents duplicate submissions while retaining the draft after failure", async () => {
    let rejectSave: (error: Error) => void = () => {};
    const pending = new Promise<void>((_resolve, reject) => {
      rejectSave = reject;
    });
    const onSave = vi.fn(() => pending);
    render(
      <ExpenseEntryForm
        open
        space={space}
        onClose={vi.fn()}
        onSave={onSave}
        onSaveSpaceTaxonomy={vi.fn()}
        payeeSuggestions={[]}
      />,
    );
    fillRequired();
    const form = screen.getByRole("form", { name: /expense details/i });
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: /saving expense/i }),
    ).toBeDisabled();
    rejectSave(new Error("Save failed; try again"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Save failed; try again",
    );
    expect(screen.getByLabelText(/description/i)).toHaveValue("Floor tiles");
  });

  it("keeps archived historical taxonomy selectable while editing", () => {
    const archivedSpace: ExpenseSpaceDocument = {
      ...space,
      payload: {
        ...space.payload,
        categories: [
          {
            ...space.payload.categories[0],
            is_active: false,
            subcategories: [
              {
                ...space.payload.categories[0].subcategories[0],
                is_active: false,
              },
            ],
          },
        ],
      },
    };
    render(
      <ExpenseEntryForm
        open
        space={archivedSpace}
        entry={{
          _id: "507f1f77bcf86cd799439012",
          module_type: "expense_space_entry",
          is_public: false,
          created_at: "2026-08-01T00:00:00.000Z",
          updated_at: "2026-08-01T00:00:00.000Z",
          payload: {
            space_key: space.payload.space_key,
            amount: 10,
            currency: "INR",
            description: "Old groceries",
            paid_to: "Market",
            category_id: foodId,
            subcategory_id: groceriesId,
            date: "2026-08-01",
            tags: [],
          },
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onSaveSpaceTaxonomy={vi.fn()}
        payeeSuggestions={[]}
      />,
    );

    expect(
      screen.getByRole("option", { name: "Food (Archived)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Groceries (Archived)" }),
    ).toBeInTheDocument();
  });
});
