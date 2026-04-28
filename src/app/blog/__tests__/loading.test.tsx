import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import BlogLoading from "../loading";

vi.mock("@/components/shell/PublicHeader", () => ({
  default: ({ initialUserName = "Life OS" }: { initialUserName?: string }) => (
    <header>{initialUserName}</header>
  ),
}));

vi.mock("@/components/shell/PublicFooter", () => ({
  default: () => <footer />,
}));

describe("BlogLoading", () => {
  it("renders the skeleton without a literal loading label in the header", () => {
    render(<BlogLoading />);

    expect(screen.getByText("Life OS")).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });
});
