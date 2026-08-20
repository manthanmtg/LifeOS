import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AdminModuleSkeleton,
  BlogListSkeleton,
  ContentListSkeleton,
  DashboardSkeleton,
  PublicModuleSkeleton,
  SkeletonBlock,
  WidgetSkeleton,
} from "../Skeletons";

describe("Skeletons", () => {
  it("renders a base skeleton block with default and custom classes", () => {
    const { container } = render(<SkeletonBlock className="h-6 w-12" />);

    const block = container.firstElementChild as HTMLElement;

    expect(block).toHaveClass(
      "relative",
      "overflow-hidden",
      "rounded-lg",
      "bg-zinc-800/50",
      "h-6",
      "w-12",
    );
  });

  it("applies inline styles to SkeletonBlock", () => {
    const { container } = render(
      <SkeletonBlock
        className="h-4 w-4"
        style={{ width: "37px", marginTop: "5px" }}
      />,
    );

    const block = container.firstElementChild as HTMLElement;

    expect(block.style.width).toBe("37px");
    expect(block.style.marginTop).toBe("5px");
  });

  it("renders five items for ContentListSkeleton by default", () => {
    const { container } = render(<ContentListSkeleton />);

    const list = container.firstElementChild as HTMLElement;

    expect(list.children).toHaveLength(5);
  });

  it("supports custom length in ContentListSkeleton, including zero", () => {
    const { container } = render(<ContentListSkeleton length={0} />);
    const list = container.firstElementChild as HTMLElement;

    expect(list.children).toHaveLength(0);

    const custom = render(<ContentListSkeleton length={2} />);
    const customList = custom.container.firstElementChild as HTMLElement;

    expect(customList.children).toHaveLength(2);
  });

  it("applies widget max-height styling", () => {
    const { container } = render(<WidgetSkeleton />);
    const widget = container.firstElementChild as HTMLElement;

    expect(widget).toHaveStyle({ maxHeight: "280px" });
    expect(widget).toHaveClass("overflow-hidden", "h-full", "animate-pulse");
  });

  it("renders 9 items in DashboardSkeleton", () => {
    const { container } = render(<DashboardSkeleton />);
    const grid = container.firstElementChild as HTMLElement;

    expect(grid.children).toHaveLength(9);
  });

  it("renders and omits header in AdminModuleSkeleton based on withHeader", () => {
    const withHeader = render(<AdminModuleSkeleton withHeader />);
    const withHeaderContainer = withHeader.container
      .firstElementChild as HTMLElement;

    expect(withHeaderContainer.querySelector(".h-8.w-48")).not.toBeNull();

    const withoutHeader = render(<AdminModuleSkeleton withHeader={false} />);
    const withoutHeaderContainer = withoutHeader.container
      .firstElementChild as HTMLElement;
    const header = withoutHeaderContainer.querySelector(".h-8.w-48");
    const statGrid = withoutHeaderContainer.querySelector(".grid.grid-cols-2");

    expect(header).toBeNull();
    expect(statGrid?.children).toHaveLength(4);
  });

  it("renders 6 placeholder items in PublicModuleSkeleton", () => {
    const { container } = render(<PublicModuleSkeleton />);
    const list = container.querySelector(".space-y-3") as HTMLElement;

    expect(list.children).toHaveLength(6);
  });

  it("renders blog list placeholder cards and tags in BlogListSkeleton", () => {
    const { container } = render(<BlogListSkeleton />);
    const tagPills = container.querySelectorAll(".w-16.rounded-full");
    const cards = container.querySelectorAll(".rounded-2xl");

    expect(tagPills).toHaveLength(4);
    expect(cards).toHaveLength(4);
  });
});
