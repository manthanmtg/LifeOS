import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RelativeDateNotificationFields } from "../RelativeDateNotificationFields";

describe("RelativeDateNotificationFields", () => {
  it("toggles preset offsets while preserving sorted unique values", () => {
    const onOffsetsChange = vi.fn();

    render(
      <RelativeDateNotificationFields
        enabled={true}
        eventLabel="Renewal"
        offsetsDays={[1]}
        onEnabledChange={vi.fn()}
        onOffsetsChange={onOffsetsChange}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "7 days before" }));

    expect(onOffsetsChange).toHaveBeenCalledWith([1, 7]);
  });

  it("adds custom offsets between zero and 365 days", () => {
    const onOffsetsChange = vi.fn();

    render(
      <RelativeDateNotificationFields
        enabled={true}
        eventLabel="Renewal"
        offsetsDays={[1]}
        onEnabledChange={vi.fn()}
        onOffsetsChange={onOffsetsChange}
      />,
    );

    fireEvent.change(screen.getByLabelText(/custom day offset/i), {
      target: { value: "14" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /add custom notification offset/i }),
    );

    expect(onOffsetsChange).toHaveBeenCalledWith([1, 14]);
  });

  it("labels the zero day offset with the configured event", () => {
    render(
      <RelativeDateNotificationFields
        enabled={true}
        eventLabel="Birthday"
        offsetsDays={[0, 1]}
        onEnabledChange={vi.fn()}
        onOffsetsChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("checkbox", { name: /birthday day/i }),
    ).toBeInTheDocument();
  });

  it("disables offset controls when notifications are disabled", () => {
    render(
      <RelativeDateNotificationFields
        enabled={false}
        eventLabel="Renewal"
        offsetsDays={[1]}
        onEnabledChange={vi.fn()}
        onOffsetsChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("checkbox", { name: "1 day before" }),
    ).toBeDisabled();
  });
});
