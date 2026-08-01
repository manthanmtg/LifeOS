import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { Mock } from "vitest";
import { describe, expect, it, vi } from "vitest";

import type { PeopleSettings } from "@/modules/people/config";
import { DEFAULT_PEOPLE_SETTINGS } from "@/modules/people/config";

import PeopleNotificationSettingsDialog from "../PeopleNotificationSettingsDialog";

type SaveHandler = (settings: PeopleSettings) => Promise<boolean>;
type SaveMock = Mock<SaveHandler>;

function renderDialog(
  settings: PeopleSettings = DEFAULT_PEOPLE_SETTINGS,
  onSave: SaveMock = vi.fn<SaveHandler>(async (nextSettings) => {
    void nextSettings;
    return true;
  }),
) {
  const onClose = vi.fn();
  render(
    <PeopleNotificationSettingsDialog
      settings={settings}
      onClose={onClose}
      onSave={onSave}
    />,
  );

  return { onSave, onClose };
}

function savedSettings(onSave: SaveMock) {
  const calls = onSave.mock.calls as Array<[PeopleSettings]>;
  return calls[0][0];
}

describe("PeopleNotificationSettingsDialog", () => {
  it("saves one complete settings object and closes after success", async () => {
    const { onSave, onClose } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave).toHaveBeenCalledWith(DEFAULT_PEOPLE_SETTINGS);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not save when canceled", () => {
    const { onSave, onClose } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("seeds a relationship override from a disabled default as enabled one-day reminder", async () => {
    const { onSave } = renderDialog();
    const friendRow = screen.getByRole("group", { name: /Birthday Friend/i });

    fireEvent.click(
      within(friendRow).getByRole("radio", { name: /Override/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(
      savedSettings(onSave).birthdayNotifications.relationships.friend,
    ).toEqual({
      enabled: true,
      rules: [{ event: "birthday", offsets_days: [1] }],
    });
  });

  it("resets relationship overrides back to inherited settings", async () => {
    const settings: PeopleSettings = {
      birthdayNotifications: {
        default: { enabled: false, rules: [] },
        relationships: {
          friend: {
            enabled: true,
            rules: [{ event: "birthday", offsets_days: [7] }],
          },
        },
      },
      contactNotifications: {
        default: { enabled: false, rules: [] },
        relationships: {},
      },
    };
    const { onSave } = renderDialog(settings);
    const friendRow = screen.getByRole("group", { name: /Birthday Friend/i });

    fireEvent.click(within(friendRow).getByRole("button", { name: /Reset/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(
      savedSettings(onSave).birthdayNotifications.relationships.friend,
    ).toBeUndefined();
  });

  it("saves contact reminder defaults and relationship overrides", async () => {
    const { onSave } = renderDialog();
    const contactDefault = screen.getByRole("group", {
      name: /Contact default/i,
    });
    fireEvent.click(
      within(contactDefault).getByLabelText(/Notify of contact due date/i),
    );
    const enabledContactDefault = screen.getByRole("group", {
      name: /Contact default/i,
    });
    fireEvent.change(
      within(enabledContactDefault).getByLabelText(/Contact cadence/i),
      {
        target: { value: "60" },
      },
    );
    fireEvent.click(
      within(
        screen.getByRole("group", {
          name: /Contact Friend/i,
        }),
      ).getByRole("radio", { name: /Override/i }),
    );
    await waitFor(() =>
      expect(
        within(
          screen.getByRole("group", {
            name: /Contact Friend/i,
          }),
        ).getByRole("radio", { name: /Override/i }),
      ).toBeChecked(),
    );
    const overriddenContactFriend = screen.getByRole("group", {
      name: /Contact Friend/i,
    });
    fireEvent.change(
      within(overriddenContactFriend).getByLabelText(/Contact cadence/i),
      {
        target: { value: "30" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(savedSettings(onSave).contactNotifications).toEqual({
      default: {
        enabled: true,
        rules: [
          {
            event: "contact_reminder",
            offsets_days: [0],
            cadence_days: 60,
          },
        ],
      },
      relationships: {
        friend: {
          enabled: true,
          rules: [
            {
              event: "contact_reminder",
              offsets_days: [0],
              cadence_days: 30,
            },
          ],
        },
      },
    });
  });

  it("keeps the dialog open and announces save failure", async () => {
    const { onSave, onClose } = renderDialog(
      DEFAULT_PEOPLE_SETTINGS,
      vi.fn<SaveHandler>(async (nextSettings) => {
        void nextSettings;
        return false;
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      /Failed to save people notification settings/i,
    );
  });
});
