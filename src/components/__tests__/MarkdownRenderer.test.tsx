import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MarkdownRenderer from "../MarkdownRenderer";

describe("MarkdownRenderer", () => {
  it("renders headings and paragraphs from markdown content", () => {
    render(
      <MarkdownRenderer content={"# Release Notes\n\nShip the polish."} />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Release Notes" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ship the polish.")).toBeInTheDocument();
  });

  it("renders links with their destination intact", () => {
    render(
      <MarkdownRenderer
        content={"Read the [docs](https://example.com/docs)."}
      />,
    );

    expect(screen.getByRole("link", { name: "docs" })).toHaveAttribute(
      "href",
      "https://example.com/docs",
    );
  });

  it("renders inline code and fenced code blocks", () => {
    render(
      <MarkdownRenderer
        content={"Use `pnpm check`.\n\n```ts\nconst ready = true;\n```"}
      />,
    );

    expect(screen.getByText("pnpm check")).toBeInTheDocument();
    expect(screen.getByText("const ready = true;")).toBeInTheDocument();
  });

  it("supports GitHub-flavored markdown tables", () => {
    render(
      <MarkdownRenderer
        content={[
          "| Module | Status |",
          "| --- | --- |",
          "| Blog | Public |",
        ].join("\n")}
      />,
    );

    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Module" }));
    expect(within(table).getByRole("cell", { name: "Blog" }));
  });

  it("supports GitHub-flavored markdown task lists", () => {
    render(<MarkdownRenderer content={"- [x] Tested\n- [ ] Documented"} />);

    const [tested, documented] = screen.getAllByRole("checkbox");
    expect(tested).toBeChecked();
    expect(documented).not.toBeChecked();
    expect(screen.getByText("Tested")).toBeInTheDocument();
    expect(screen.getByText("Documented")).toBeInTheDocument();
  });

  it("merges custom classes with the default prose classes", () => {
    const { container } = render(
      <MarkdownRenderer content={"Body"} className="custom-markdown" />,
    );

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass("prose", "prose-invert", "custom-markdown");
  });
});
