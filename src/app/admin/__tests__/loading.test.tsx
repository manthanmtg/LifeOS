import { render, screen } from "@testing-library/react";

import AdminDashboardLoading from "../loading";

describe("AdminDashboardLoading", () => {
  it("announces the dashboard loading state to assistive technology", () => {
    render(<AdminDashboardLoading />);

    const status = screen.getByRole("status", {
      name: /loading admin dashboard/i,
    });

    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveAttribute("aria-live", "polite");
  });
});
