import type { Relationship } from "./types";
import type { NotificationPreferences } from "@/lib/notifications/contracts";

export interface PeopleBirthdayNotificationSettings {
  default: NotificationPreferences;
  relationships: Partial<Record<Relationship, NotificationPreferences>>;
}

export interface PeopleSettings {
  birthdayNotifications: PeopleBirthdayNotificationSettings;
}

export const DEFAULT_BIRTHDAY_NOTIFICATION_PREFERENCES: NotificationPreferences =
  {
    enabled: false,
    rules: [],
  };

export const DEFAULT_PEOPLE_SETTINGS: PeopleSettings = {
  birthdayNotifications: {
    default: DEFAULT_BIRTHDAY_NOTIFICATION_PREFERENCES,
    relationships: {},
  },
};
