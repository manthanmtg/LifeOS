import { render, screen } from "@testing-library/react";

import LoginLoading from "../loading";

describe("LoginLoading", () => {
  it("announces the login loading state to assistive technology", () => {
    render(<LoginLoading />);

    const status = screen.getByRole("status", {
      name: /loading login/i,
    });

    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveAttribute("aria-live", "polite");
  });
});
