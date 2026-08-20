import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BillModal from "../components/BillModal";

describe("BillModal accessibility", () => {
  it("names the dialog and explicitly associates every form label", () => {
    render(
      <BillModal
        folders={[]}
        bill={null}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "New Bill" })).toBeVisible();
    for (const name of [
      /^Name/,
      /^Date/,
      /^Currency$/,
      /^Amount$/,
      /^Folder$/,
      /^Description$/,
      /^Notes$/,
      /^Attachments/,
    ]) {
      expect(screen.getByLabelText(name)).toBeVisible();
    }
  });
});
