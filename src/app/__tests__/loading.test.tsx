import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import RootLoading from "../loading";

vi.mock("@/components/shell/PublicHeader", () => ({
  default: ({ initialUserName = "Life OS" }: { initialUserName?: string }) => (
    <header>{initialUserName}</header>
  ),
}));

vi.mock("@/components/shell/PublicFooter", () => ({
  default: () => <footer />,
}));

describe("RootLoading", () => {
  it("renders the portfolio skeleton without literal loading text in the header", () => {
    render(<RootLoading />);

    expect(screen.getByText("Life OS")).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });
});
