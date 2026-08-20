import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PublicHeader from "../PublicHeader";

const modules = [
  { slug: "slides", name: "Slides" },
  { slug: "portfolio", name: "Portfolio" },
  { slug: "blog", name: "Blog" },
];

describe("PublicHeader", () => {
  it("renders server-provided branding and ordered public navigation without fetching", () => {
    global.fetch = vi.fn();

    render(
      <PublicHeader initialUserName="Ada Lovelace" publicModules={modules} />,
    );

    expect(
      screen.getByRole("link", { name: "Ada Lovelace" }),
    ).toBeInTheDocument();
    const labels = screen.getAllByRole("link").map((link) => link.textContent);

    expect(labels).toContain("Slides");
    expect(labels).toContain("Blog");
    expect(labels).not.toContain("Portfolio");
    expect(labels.indexOf("Slides")).toBeLessThan(labels.indexOf("Blog"));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("closes the mobile menu after tapping a navigation item", () => {
    render(<PublicHeader publicModules={modules} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Open navigation menu" }),
    );
    const mobileBlogLinks = screen.getAllByRole("link", { name: "Blog" });
    const mobileBlogLink = mobileBlogLinks[mobileBlogLinks.length - 1];
    mobileBlogLink.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(mobileBlogLink);

    expect(screen.getAllByRole("link", { name: "Blog" })).toHaveLength(1);
  });

  it("labels the mobile menu button and exposes its expanded state", () => {
    render(<PublicHeader publicModules={[]} />);

    const menuButton = screen.getByRole("button", {
      name: "Open navigation menu",
    });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(menuButton);

    expect(
      screen.getByRole("button", { name: "Close navigation menu" }),
    ).toHaveAttribute("aria-expanded", "true");
  });
});
