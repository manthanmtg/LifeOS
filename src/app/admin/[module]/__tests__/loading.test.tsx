import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AdminModuleLoading from "../loading";

describe("AdminModuleLoading", () => {
  it("renders a status region with the expected loading accessibility attributes", () => {
    render(<AdminModuleLoading />);

    const loadingRegion = screen.getByRole("status");

    expect(loadingRegion).toHaveAttribute("aria-label", "Loading admin module");
    expect(loadingRegion).toHaveAttribute("aria-live", "polite");
    expect(loadingRegion).toHaveAttribute("aria-busy", "true");
  });

  it("uses the shared fade-in animation class", () => {
    render(<AdminModuleLoading />);

    const loadingRegion = screen.getByRole("status");

    expect(loadingRegion).toHaveClass("animate-fade-in-up");
    expect(loadingRegion).toHaveClass("space-y-6");
  });

  it("contains the page header skeleton placeholders", () => {
    const { container } = render(<AdminModuleLoading />);

    const headerHeightBlock = container.querySelector(
      "[class*='h-8'][class*='w-52']",
    );
    const subheadingHeightBlock = container.querySelector(
      "[class*='h-4'][class*='w-72']",
    );

    expect(headerHeightBlock).not.toBeNull();
    expect(subheadingHeightBlock).not.toBeNull();
  });

  it("renders the admin module skeleton structure inside a loading state", () => {
    const { container } = render(<AdminModuleLoading />);

    const skeletonBlocks = Array.from(container.querySelectorAll("div")).filter(
      (node) =>
        typeof node.className === "string" &&
        node.className.includes("bg-zinc-800/50") &&
        node.className.includes("rounded-lg"),
    );

    expect(skeletonBlocks.length).toBeGreaterThanOrEqual(2);
  });

  it("does not show literal loading copy", () => {
    render(<AdminModuleLoading />);

    expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
  });

  it("shows a nested skeleton container and admin-skeleton list", () => {
    const { container } = render(<AdminModuleLoading />);

    const skeletonContainers = Array.from(
      container.querySelectorAll("div"),
    ).filter(
      (node) =>
        typeof node.className === "string" &&
        node.className.includes("animate-fade-in-up") &&
        node.className.includes("space-y-6"),
    );

    expect(skeletonContainers.length).toBeGreaterThanOrEqual(1);
  });
});
