import type { Relationship } from "./types";
import type { NotificationPreferences } from "@/lib/notifications/contracts";

export interface PeopleBirthdayNotificationSettings {
  default: NotificationPreferences;
  relationships: Partial<Record<Relationship, NotificationPreferences>>;
}

export interface PeopleContactNotificationSettings {
  default: NotificationPreferences;
  relationships: Partial<Record<Relationship, NotificationPreferences>>;
}

export interface PeopleSettings {
  birthdayNotifications: PeopleBirthdayNotificationSettings;
  contactNotifications: PeopleContactNotificationSettings;
}

export const DEFAULT_BIRTHDAY_NOTIFICATION_PREFERENCES: NotificationPreferences =
  {
    enabled: false,
    rules: [],
  };

export const DEFAULT_CONTACT_REMINDER_CADENCE_DAYS = 90;

export const DEFAULT_CONTACT_REMINDER_NOTIFICATION_PREFERENCES: NotificationPreferences =
  {
    enabled: false,
    rules: [],
  };

export const DEFAULT_PEOPLE_SETTINGS: PeopleSettings = {
  birthdayNotifications: {
    default: DEFAULT_BIRTHDAY_NOTIFICATION_PREFERENCES,
    relationships: {},
  },
  contactNotifications: {
    default: DEFAULT_CONTACT_REMINDER_NOTIFICATION_PREFERENCES,
    relationships: {},
  },
};
