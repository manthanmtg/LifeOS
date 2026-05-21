import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "../page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    push.mockClear();
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({ data: { site_title: "Life OS" } }),
      } as Response)
      .mockResolvedValueOnce({ ok: false } as Response);
  });

  it("labels the password field and links invalid password feedback", async () => {
    render(<LoginPage />);

    const passwordInput = await screen.findByLabelText("Admin password");
    fireEvent.change(passwordInput, { target: { value: "wrong-password" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Enter Command Center" }),
    );

    const error = await screen.findByRole("alert");

    expect(error).toHaveTextContent("Invalid password");
    expect(passwordInput).toHaveAttribute("aria-describedby", error.id);
  });
});
