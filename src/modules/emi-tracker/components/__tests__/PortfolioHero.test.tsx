import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioHero from "../PortfolioHero";
import type { PortfolioViewModel } from "../../lib/emi-view-model";

const baseModel: PortfolioViewModel = {
  activeCount: 2,
  closedCount: 1,
  allCount: 3,
  currencies: [
    {
      currency: "INR",
      outstanding: 1000,
      monthlyCommitment: 200,
      originalPrincipal: 1200,
      principalPaid: 200,
    },
  ],
  nearestDue: {
    loanId: "loan-1",
    loanTitle: "Home loan",
    currency: "INR",
    amount: 200,
    dueDate: "2026-02-05T00:00:00.000Z",
  },
  totalInterestSaved: 50,
};

describe("PortfolioHero", () => {
  it("renders a single-currency portfolio summary and next due context", () => {
    render(
      <PortfolioHero
        model={baseModel}
        defaultCurrency="INR"
        decimals={2}
        numberFormat="indian"
      />,
    );

    expect(screen.getByText(/Total outstanding/i)).toBeInTheDocument();
    const amount = screen.getByText("₹1,000");
    expect(amount).toBeInTheDocument();
    expect(amount).toHaveAttribute("data-financial-value", "portfolio-total");
    expect(amount).toHaveClass("whitespace-nowrap");
    expect(amount).not.toHaveClass("break-words");
    expect(screen.getByText(/Next EMI/i)).toBeInTheDocument();
    expect(screen.getByText(/Monthly commitment/i)).toBeInTheDocument();
    expect(screen.getByText(/Home loan/i)).toBeInTheDocument();
  });

  it("keeps interest saved out of the portfolio summary", () => {
    render(
      <PortfolioHero
        model={baseModel}
        defaultCurrency="INR"
        decimals={2}
        numberFormat="indian"
      />,
    );

    expect(screen.queryByText(/Interest saved/i)).not.toBeInTheDocument();
  });

  it("does not imply a converted total for mixed currencies", () => {
    render(
      <PortfolioHero
        model={{
          ...baseModel,
          currencies: [
            ...baseModel.currencies,
            {
              currency: "USD",
              outstanding: 500,
              monthlyCommitment: 100,
              originalPrincipal: 600,
              principalPaid: 100,
            },
          ],
        }}
        defaultCurrency="INR"
        decimals={2}
        numberFormat="western"
      />,
    );

    expect(screen.getByText(/2 currencies tracked/i)).toBeInTheDocument();
    expect(screen.getByText(/INR/)).toBeInTheDocument();
    expect(screen.getByText(/USD/)).toBeInTheDocument();
    expect(screen.getByText("₹1,000")).toHaveClass("whitespace-nowrap");
    expect(screen.getByText("$500")).toHaveClass("whitespace-nowrap");
  });
});
