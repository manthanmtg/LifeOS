import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ScheduleCards from "../ScheduleCards";
import type { ScheduleRow } from "../../types";

const rows: ScheduleRow[] = Array.from({ length: 26 }, (_, index) => ({
  index: index + 1,
  due_date: new Date(Date.UTC(2026, index, 5)).toISOString(),
  opening_balance: 1000 - index * 10,
  emi: 100,
  interest: 10,
  principal: 90,
  prepayment: index === 1 ? 20 : 0,
  closing_balance: 900 - index * 10,
  annual_rate: 12,
}));

describe("ScheduleCards", () => {
  it("groups mobile schedule rows by year and progressively shows more", async () => {
    render(
      <ScheduleCards
        rows={rows}
        currencySymbol="₹"
        decimals={2}
        numberFormat="indian"
        now={new Date("2026-01-01T00:00:00.000Z")}
      />,
    );

    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(screen.queryByText("2028")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /show more/i }));

    expect(screen.getByText("2028")).toBeInTheDocument();
  });
});
