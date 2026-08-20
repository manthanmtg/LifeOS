import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "../Field";

describe("Field", () => {
  it("provides reusable label and error semantics", () => {
    render(
      <Field>
        <FieldLabel htmlFor="email" required>
          Email
        </FieldLabel>
        <input id="email" aria-describedby="email-error" />
        <FieldError id="email-error">Enter a valid email.</FieldError>
      </Field>,
    );

    expect(screen.getByLabelText(/Email/)).toBeVisible();
    expect(screen.getByText("Enter a valid email.")).toHaveAttribute(
      "role",
      "alert",
    );
    expect(screen.getByText("Required")).toHaveClass("sr-only");
  });

  it("generates and wires control, help, and error ids automatically", () => {
    render(
      <Field invalid>
        <FieldLabel>Username</FieldLabel>
        <FieldControl>
          <input />
        </FieldControl>
        <FieldDescription>Shown on your profile.</FieldDescription>
        <FieldError>Username is required.</FieldError>
      </Field>,
    );

    const input = screen.getByLabelText("Username");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain(
      screen.getByText("Shown on your profile.").id,
    );
    expect(input.getAttribute("aria-describedby")).toContain(
      screen.getByText("Username is required.").id,
    );
  });
});
