import { render, screen } from "@testing-library/react";

import SettingsLoading from "../loading";

describe("SettingsLoading", () => {
  it("announces the loading state to assistive technology", () => {
    render(<SettingsLoading />);

    const status = screen.getByRole("status", {
      name: /loading settings/i,
    });

    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveAttribute("aria-live", "polite");
  });
});
