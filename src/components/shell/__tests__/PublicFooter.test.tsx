import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PublicFooter from "../PublicFooter";

describe("PublicFooter", () => {
  it("renders only usable server-provided social links without fetching", () => {
    global.fetch = vi.fn();

    render(
      <PublicFooter
        socialLinks={[
          { platform: "GitHub", url: "https://github.com/example" },
          { platform: "X", url: "" },
          { platform: "", url: "https://example.com" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: /GitHub/i })).toHaveAttribute(
      "href",
      "https://github.com/example",
    );
    expect(screen.queryByRole("link", { name: /X/i })).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("groups social links in a labeled navigation landmark", () => {
    render(
      <PublicFooter
        socialLinks={[
          { platform: "GitHub", url: "https://github.com/example" },
        ]}
      />,
    );

    const socialNav = screen.getByRole("navigation", {
      name: /social links/i,
    });
    expect(socialNav).toContainElement(
      screen.getByRole("link", { name: /GitHub/i }),
    );
  });

  it("keeps static footer content without profile data", () => {
    render(<PublicFooter />);
    expect(screen.getByText(/Built with/)).toBeInTheDocument();
  });
});
