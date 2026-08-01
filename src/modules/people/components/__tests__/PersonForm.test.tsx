import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_PEOPLE_SETTINGS } from "@/modules/people/config";
import type { Person } from "@/modules/people/types";

import PersonForm from "../PersonForm";

describe("PersonForm", () => {
  it("omits person notifications when saving in inherit mode", async () => {
    const onSave = vi.fn(async () => {});

    const person: Person = {
      _id: "person-1",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      payload: {
        name: "Alex",
        relationship: "friend",
        birthday: "2000-01-01",
        interests: [],
        tags: [],
        social_links: [],
        interactions: [],
        is_favorite: false,
        documents: [],
      },
    };

    render(
      <PersonForm
        peopleSettings={DEFAULT_PEOPLE_SETTINGS}
        person={person}
        onClose={() => {}}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        birthday: "2000-01-01",
        name: "Alex",
      }),
    );
    expect(onSave.mock.calls[0][0]).not.toHaveProperty("notifications");
  });
});
