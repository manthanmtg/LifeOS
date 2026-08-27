import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProfileFormModal from "../ProfileFormModal";
import type { HealthPayload } from "../types";

const formData: HealthPayload = {
  name: "",
  type: "self",
  blood_group: "unknown",
  allergies: [],
  conditions: [],
  medications: [],
  vaccinations: [],
  visits: [],
  lab_results: [],
  measurements: [],
  documents: [],
  tags: [],
};

describe("ProfileFormModal", () => {
  it("traps keyboard focus in the profile form and closes with Escape", () => {
    const onClose = vi.fn();

    render(
      <ProfileFormModal
        open
        onClose={onClose}
        editingProfile={null}
        formData={formData}
        setFormData={vi.fn()}
        allergyInput=""
        setAllergyInput={vi.fn()}
        saving={false}
        onSave={vi.fn()}
        onProfilePicUpload={vi.fn()}
      />,
    );

    const closeButton = screen.getByRole("button", {
      name: "Close health profile form",
    });
    const addProfileButton = screen.getByRole("button", {
      name: "Add Profile",
    });

    expect(document.body.style.overflow).toBe("hidden");
    expect(closeButton).toHaveFocus();

    addProfileButton.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
