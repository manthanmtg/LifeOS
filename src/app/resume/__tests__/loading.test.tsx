import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ResumeLoading from "../loading";

vi.mock("@/components/shell/PublicHeader", () => ({
  default: ({ initialUserName = "Life OS" }: { initialUserName?: string }) => (
    <header>{initialUserName}</header>
  ),
}));

vi.mock("@/components/shell/PublicFooter", () => ({
  default: () => <footer />,
}));

describe("ResumeLoading", () => {
  it("renders an accessible resume skeleton without literal loading text", () => {
    render(<ResumeLoading />);

    const status = screen.getByRole("status", {
      name: /loading resume/i,
    });

    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Life OS")).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });
});
