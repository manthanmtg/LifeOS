import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LoanEditor from "../LoanEditor";
import type { EmiLoan, EmiTrackerSettings } from "../../types";

const settings: EmiTrackerSettings = {
  defaultCurrency: "INR",
  defaultDueDayOfMonth: 5,
  roundingDecimals: 2,
  numberFormat: "indian",
  defaultRecastStrategy: "keep_emi_adjust_tenure",
  categories: ["Home", "Car"],
};

const editLoan: EmiLoan = {
  _id: "loan-1",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  payload: {
    title: "Home loan",
    lender_name: "HDFC",
    category: "Home",
    currency: "INR",
    principal: 1200,
    tenure_months: 6,
    interest_type: "fixed",
    annual_interest_rate: 0,
    monthly_emi: 200,
    processing_fee_amount: 100,
    processing_fee_financed: true,
    start_date: "2026-01-01T00:00:00.000Z",
    due_day_of_month: 5,
    recast_strategy: "keep_tenure_adjust_emi",
    rate_adjustments: [
      { effective_date: "2026-02-01T00:00:00.000Z", annual_interest_rate: 1 },
    ],
    payments: [{ date: "2026-02-05T00:00:00.000Z", amount: 200, kind: "emi" }],
    documents: [
      {
        type: "sanction_letter",
        title: "Letter",
        url: "https://example.com/doc.pdf",
        added_at: "2026-01-01T00:00:00.000Z",
      },
    ],
    status: "active",
  },
};

describe("LoanEditor", () => {
  it("edits lender, constrains due day, exposes interest type, and preserves nested arrays", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <LoanEditor
        editLoan={editLoan}
        settings={settings}
        isSaving={false}
        formError={null}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const lender = screen.getByLabelText(/lender/i);
    fireEvent.change(lender, { target: { value: "SBI" } });

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.change(screen.getByLabelText(/interest type/i), {
      target: { value: "floating" },
    });
    const dueDay = screen.getByLabelText(/due day/i);
    fireEvent.change(dueDay, { target: { value: "31" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0] as EmiLoan["payload"];
    expect(payload.lender_name).toBe("SBI");
    expect(payload.interest_type).toBe("floating");
    expect(payload.due_day_of_month).toBe(28);
    expect(payload.payments).toHaveLength(1);
    expect(payload.documents).toHaveLength(1);
    expect(payload.rate_adjustments).toHaveLength(1);
  });
});
