import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PublicModuleLoading from "../loading";

vi.mock("@/components/shell/PublicHeader", () => ({
  default: ({ initialUserName = "Life OS" }: { initialUserName?: string }) => (
    <header>{initialUserName}</header>
  ),
}));

vi.mock("@/components/shell/PublicFooter", () => ({
  default: () => <footer />,
}));

describe("PublicModuleLoading", () => {
  it("renders the skeleton without literal loading text in the header", () => {
    render(<PublicModuleLoading />);

    expect(screen.getByText("Life OS")).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });
});
