import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SpreadsheetTab } from "../SpreadsheetTab";

vi.mock("framer-motion", async () => {
  const React = await vi.importActual<typeof import("react")>("react");

  const ReorderElement = ({
    as = "div",
    children,
    ...props
  }: {
    as?: React.ElementType;
    children?: React.ReactNode;
  } & Record<string, unknown>) => {
    const {
      axis,
      values,
      onReorder,
      value,
      dragListener,
      dragControls,
      ...domProps
    } = props;

    void axis;
    void values;
    void onReorder;
    void value;
    void dragListener;
    void dragControls;

    return React.createElement(as, domProps, children);
  };

  return {
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
    motion: new Proxy(
      {},
      {
        get:
          (_target, key) =>
          ({
            children,
            ...props
          }: { children?: React.ReactNode } & Record<string, unknown>) =>
            React.createElement(key as string, props, children),
      },
    ),
    Reorder: {
      Group: ReorderElement,
      Item: ReorderElement,
    },
  };
});

const crop = {
  id: "cotton",
  name: "Cotton",
  scheduleType: "yearly" as const,
  sourceFields: [],
  summaryFields: [
    {
      id: "avg_price",
      name: "Avg Price",
      type: "number" as const,
      unit: "₹/50kg bag",
    },
  ],
  calculatedFields: [],
};

const records = [
  {
    _id: "record-2025",
    payload: {
      crop_id: "cotton",
      schedule_period: "2025-26",
      source_data: {},
      summary_data: { avg_price: 3800 },
      notes: "",
    },
  },
  {
    _id: "record-2026",
    payload: {
      crop_id: "cotton",
      schedule_period: "2026-27",
      source_data: {},
      summary_data: { avg_price: 7800 },
      notes: "",
    },
  },
];

function renderSpreadsheet() {
  return render(
    <SpreadsheetTab
      activeCrop={crop}
      crops={[crop]}
      areas={[]}
      records={records}
      schedulePeriods={["2025-26", "2026-27"]}
      setActiveCropId={vi.fn()}
      onReorderPeriods={vi.fn()}
      onRefresh={vi.fn()}
    />,
  );
}

describe("SpreadsheetTab", () => {
  it("keeps period columns content-sized and renders summary inputs in two tiers", async () => {
    const { container } = renderSpreadsheet();

    await waitFor(() => {
      expect(screen.getByText("3,800")).toBeInTheDocument();
    });

    const table = container.querySelector("table");
    expect(table).toHaveClass("w-max");
    expect(table).not.toHaveClass("w-full");

    const summaryRow = screen.getByText("Period Inputs").closest("tr");
    expect(summaryRow).not.toBeNull();

    const [, firstPeriodCell, secondPeriodCell] = Array.from(
      summaryRow!.querySelectorAll("td"),
    );

    for (const cell of [firstPeriodCell, secondPeriodCell]) {
      expect(within(cell).getByText("Avg Price")).toBeInTheDocument();
      expect(within(cell).getAllByText("₹/50kg bag")).toHaveLength(1);
      expect(cell.querySelector("[data-summary-field-meta]")).not.toBeNull();
      expect(cell.querySelector("[data-summary-field-value]")).not.toBeNull();
    }

    expect(within(firstPeriodCell).getByText("3,800")).toBeInTheDocument();
    expect(
      within(firstPeriodCell).queryByText("3,800 ₹/50kg bag"),
    ).not.toBeInTheDocument();

    expect(within(secondPeriodCell).getByText("7,800")).toBeInTheDocument();
    expect(
      within(secondPeriodCell).queryByText("7,800 ₹/50kg bag"),
    ).not.toBeInTheDocument();
    expect(within(secondPeriodCell).getByText("+105.3%")).toBeInTheDocument();
  });

  it("names summary edit inputs with their field and period", async () => {
    renderSpreadsheet();

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    expect(
      await screen.findByRole("spinbutton", {
        name: "Avg Price for 2025-26",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", { name: "Avg Price for 2026-27" }),
    ).toBeInTheDocument();
  });
});
