import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CalculatorCard from "../CalculatorCard";
import type { CalculatorDefinition } from "../types";

function createDefinition(
  compute: CalculatorDefinition["compute"] = vi.fn((values) => ({
    primaryLabel: "Projected value",
    primaryValue: `${values.amount}-${values.mode}-${values.notes}`,
    secondaryValue: `Rate ${values.rate}`,
    metrics: [
      { label: "Good metric", value: "healthy", tone: "good" as const },
      { label: "Warn metric", value: "review", tone: "warn" as const },
      { label: "Bad metric", value: "risk", tone: "bad" as const },
      { label: "Neutral metric", value: "steady", tone: "neutral" as const },
    ],
    notes: ["Keep assumptions current"],
  })),
): CalculatorDefinition {
  return {
    id: "test-calculator",
    name: "Test Calculator",
    shortName: "Test",
    categoryId: "utilities",
    description: "Calculates a predictable test value.",
    inputs: [
      {
        key: "amount",
        label: "Amount",
        kind: "number",
        defaultValue: "100",
        min: 0,
        max: 1000,
        step: 10,
        unit: "USD",
        helper: "Enter the starting amount.",
      },
      {
        key: "mode",
        label: "Mode",
        kind: "select",
        defaultValue: "monthly",
        options: [
          { label: "Monthly", value: "monthly" },
          { label: "Yearly", value: "yearly" },
        ],
        helper: "Choose the cadence.",
      },
      {
        key: "rate",
        label: "Rate",
        kind: "number",
        defaultValue: "5",
        unit: "%",
      },
      {
        key: "notes",
        label: "Scenario Notes",
        kind: "textarea",
        defaultValue: "baseline",
        placeholder: "Add notes",
      },
    ],
    compute,
  };
}

describe("CalculatorCard", () => {
  it("renders the collapsed summary using default input values", () => {
    const compute: CalculatorDefinition["compute"] = vi.fn((values) => ({
      primaryLabel: "Projected value",
      primaryValue: values.amount,
      metrics: [],
    }));

    render(
      <CalculatorCard
        definition={createDefinition(compute)}
        categoryLabel="Utilities"
      />,
    );

    expect(screen.getByText("Utilities")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Test Calculator" }));
    expect(screen.getByText("Projected value")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.queryByLabelText("Amount")).not.toBeInTheDocument();
    expect(compute).toHaveBeenLastCalledWith({
      amount: "100",
      mode: "monthly",
      rate: "5",
      notes: "baseline",
    });
  });

  it("renders inputs, helpers, metrics, and notes when expanded", () => {
    render(
      <CalculatorCard
        definition={createDefinition()}
        categoryLabel="Utilities"
        startExpanded
      />,
    );

    expect(screen.getByLabelText("Amount")).toHaveValue(100);
    expect(screen.getByLabelText("Mode")).toHaveValue("monthly");
    expect(screen.getByLabelText("Rate")).toHaveValue(5);
    expect(screen.getByLabelText("Scenario Notes")).toHaveValue("baseline");
    expect(screen.getByText("Enter the starting amount.")).toBeInTheDocument();
    expect(screen.getByText("Choose the cadence.")).toBeInTheDocument();
    expect(screen.getByText("Good metric")).toBeInTheDocument();
    expect(screen.getByText("Warn metric")).toBeInTheDocument();
    expect(screen.getByText("Bad metric")).toBeInTheDocument();
    expect(screen.getByText("Neutral metric")).toBeInTheDocument();
    expect(screen.getByText(/Keep assumptions current/)).toBeInTheDocument();
  });

  it("recomputes the result when number, select, and textarea inputs change", () => {
    const compute: CalculatorDefinition["compute"] = vi.fn((values) => ({
      primaryLabel: "Projected value",
      primaryValue: `${values.amount}|${values.mode}|${values.notes}`,
      metrics: [],
    }));

    render(
      <CalculatorCard
        definition={createDefinition(compute)}
        categoryLabel="Utilities"
        startExpanded
      />,
    );

    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "250" },
    });
    fireEvent.change(screen.getByLabelText("Mode"), {
      target: { value: "yearly" },
    });
    fireEvent.change(screen.getByLabelText("Scenario Notes"), {
      target: { value: "optimistic" },
    });

    expect(screen.getByText("250|yearly|optimistic")).toBeInTheDocument();
    expect(compute).toHaveBeenLastCalledWith({
      amount: "250",
      mode: "yearly",
      rate: "5",
      notes: "optimistic",
    });
  });

  it("resets edited values back to the definition defaults", () => {
    render(
      <CalculatorCard
        definition={createDefinition()}
        categoryLabel="Utilities"
        startExpanded
      />,
    );

    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "400" },
    });
    fireEvent.change(screen.getByLabelText("Mode"), {
      target: { value: "yearly" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByLabelText("Amount")).toHaveValue(100);
    expect(screen.getByLabelText("Mode")).toHaveValue("monthly");
    expect(screen.getByText("100-monthly-baseline")).toBeInTheDocument();
  });

  it("toggles the expanded content using the labelled disclosure button", () => {
    render(
      <CalculatorCard
        definition={createDefinition()}
        categoryLabel="Utilities"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Expand Test Calculator" }),
    );

    expect(screen.getByLabelText("Amount")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Collapse Test Calculator" }),
    );

    expect(screen.queryByLabelText("Amount")).not.toBeInTheDocument();
  });
});
