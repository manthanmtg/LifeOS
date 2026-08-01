import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_PEOPLE_SETTINGS,
  type PeopleSettings,
} from "@/modules/people/config";
import type { Person } from "@/modules/people/types";

import PersonForm from "../PersonForm";

const channelId = "74f0f0f0f0f0f0f0f0f0f0f0";

function makePerson(overrides: Partial<Person["payload"]> = {}): Person {
  return {
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
      ...overrides,
    },
  };
}

async function submitAndWait(onSave: ReturnType<typeof vi.fn>) {
  fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
  await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
  const calls = onSave.mock.calls as Array<[Person["payload"]]>;
  return calls[0][0];
}

describe("PersonForm", () => {
  it("omits person notifications when saving in inherit mode", async () => {
    const onSave = vi.fn(async (payload: Person["payload"]) => {
      void payload;
    });

    render(
      <PersonForm
        peopleSettings={DEFAULT_PEOPLE_SETTINGS}
        person={makePerson()}
        onClose={() => {}}
        onSave={onSave}
      />,
    );

    await submitAndWait(onSave);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        birthday: "2000-01-01",
        name: "Alex",
      }),
    );
    expect(onSave.mock.calls[0][0]).not.toHaveProperty("notifications");
  });

  it("stores custom birthday preferences and preserves inherited channel ids", async () => {
    const onSave = vi.fn(async (payload: Person["payload"]) => {
      void payload;
    });
    const peopleSettings: PeopleSettings = {
      birthdayNotifications: {
        default: {
          enabled: true,
          rules: [
            {
              event: "birthday",
              offsets_days: [7, 1],
              channel_ids: [channelId],
            },
          ],
        },
        relationships: {},
      },
      contactNotifications: {
        default: { enabled: false, rules: [] },
        relationships: {},
      },
    };

    render(
      <PersonForm
        peopleSettings={peopleSettings}
        person={makePerson()}
        onClose={() => {}}
        onSave={onSave}
      />,
    );

    const birthdayGroup = screen.getByRole("group", {
      name: /Birthday reminders/i,
    });
    fireEvent.click(
      within(birthdayGroup).getByRole("radio", { name: /Custom/i }),
    );

    const payload = await submitAndWait(onSave);
    expect(payload.notifications).toEqual({
      enabled: true,
      rules: [
        {
          event: "birthday",
          offsets_days: [1, 7],
          channel_ids: [channelId],
        },
      ],
    });
  });

  it("stores explicit birthday opt-out without disabling contact inheritance", async () => {
    const onSave = vi.fn(async (payload: Person["payload"]) => {
      void payload;
    });

    render(
      <PersonForm
        peopleSettings={DEFAULT_PEOPLE_SETTINGS}
        person={makePerson()}
        onClose={() => {}}
        onSave={onSave}
      />,
    );

    const birthdayGroup = screen.getByRole("group", {
      name: /Birthday reminders/i,
    });
    fireEvent.click(within(birthdayGroup).getByRole("radio", { name: /Off/i }));

    const payload = await submitAndWait(onSave);
    expect(payload.notifications).toEqual({
      enabled: true,
      disabled_events: ["birthday"],
      rules: [],
    });
  });

  it("stores custom contact reminder preferences without forcing birthday override", async () => {
    const onSave = vi.fn(async (payload: Person["payload"]) => {
      void payload;
    });

    render(
      <PersonForm
        peopleSettings={DEFAULT_PEOPLE_SETTINGS}
        person={makePerson()}
        onClose={() => {}}
        onSave={onSave}
      />,
    );

    fireEvent.click(
      within(
        screen.getByRole("group", {
          name: /Contact reminders/i,
        }),
      ).getByRole("radio", { name: /Custom/i }),
    );
    await waitFor(() =>
      expect(
        within(
          screen.getByRole("group", {
            name: /Contact reminders/i,
          }),
        ).getByRole("radio", { name: /Custom/i }),
      ).toBeChecked(),
    );
    const contactGroup = screen.getByRole("group", {
      name: /Contact reminders/i,
    });
    fireEvent.change(within(contactGroup).getByLabelText(/Contact cadence/i), {
      target: { value: "45" },
    });

    const payload = await submitAndWait(onSave);
    expect(payload.notifications).toEqual({
      enabled: true,
      rules: [
        {
          event: "contact_reminder",
          offsets_days: [0],
          cadence_days: 45,
        },
      ],
    });
  });

  it("omits notifications when the birthday is removed", async () => {
    const onSave = vi.fn(async (payload: Person["payload"]) => {
      void payload;
    });

    render(
      <PersonForm
        peopleSettings={DEFAULT_PEOPLE_SETTINGS}
        person={makePerson({
          notifications: {
            enabled: true,
            rules: [{ event: "birthday", offsets_days: [1] }],
          },
        })}
        onClose={() => {}}
        onSave={onSave}
      />,
    );

    const birthday = document.querySelector(
      'input[type="date"]',
    ) as HTMLInputElement;
    fireEvent.change(birthday, { target: { value: "" } });

    const payload = await submitAndWait(onSave);
    expect(payload.birthday).toBeUndefined();
    expect(payload).not.toHaveProperty("notifications");
  });
});
