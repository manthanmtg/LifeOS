# People Module

## Overview

The People module acts as a personal CRM within LifeOS. It is designed to help you manage your contacts, remember birthdays, track interactions, and ensure you stay in touch with your network. It provides visibility into who you haven't connected with recently and tracks your overall network health.

## Data Schema

The module uses the `person` content type. The core `PersonPayload` is validated by `PersonSchema` (found in `src/lib/schemas.ts`) and consists of the following key fields:

| Field            | Type                | Description                                                                                      |
| :--------------- | :------------------ | :----------------------------------------------------------------------------------------------- |
| `name`           | `string`            | The person's full name.                                                                          |
| `relationship`   | `Relationship`      | E.g., `family`, `friend`, `colleague`, `acquaintance`, `mentor`, `client`, `other`.              |
| `phone`          | `string` (optional) | The person's phone number.                                                                       |
| `email`          | `string` (optional) | The person's email address.                                                                      |
| `company`        | `string` (optional) | The company the person works for.                                                                |
| `role`           | `string` (optional) | The person's job role or title.                                                                  |
| `birthday`       | `string` (optional) | The person's birthday (YYYY-MM-DD).                                                              |
| `avatar_url`     | `string` (optional) | External URL to the person's avatar.                                                             |
| `profile_pic`    | `object` (optional) | Base64 encoded image data and content type.                                                      |
| `interests`      | `string[]`          | An array of interests.                                                                           |
| `tags`           | `string[]`          | Custom tags for organization.                                                                    |
| `notes`          | `string` (optional) | Freeform text for personal notes and context.                                                    |
| `social_links`   | `SocialLink[]`      | Array of social platform links (platform, url).                                                  |
| `interactions`   | `Interaction[]`     | Array of logged interactions (date, type, note).                                                 |
| `last_contacted` | `string` (optional) | Date of the most recent interaction.                                                             |
| `is_favorite`    | `boolean`           | Whether the contact is marked as a favorite.                                                     |
| `documents`      | `PersonDocument[]`  | Array of attached documents/files.                                                               |
| `notifications`  | `object` (optional) | Person-level birthday/contact reminder overrides using the shared notification preference shape. |

_Note: Interaction types include `call`, `meeting`, `in_person`, `message`, `email`, `gift`, and `other`._

## Features

- **Contact Management:** Store and organize contacts with comprehensive details including relationship types and customizable tags.
- **Interaction Tracking:** Log communication and notes to maintain context for future conversations.
- **Network Health Dashboard:** The dashboard widget provides an overview of your network, highlighting:
  - Total number of contacts.
  - Contacts you haven't spoken to recently ("stale").
  - Recently contacted metrics.
  - An overall "Network health" score based on recent interactions.
- **Birthday Tracking:** Keep track of upcoming birthdays.
- **People Reminders:** Configure People-wide, relationship-level, and person-level birthday and contact-cadence reminders through the shared notification platform.

## Reminder Precedence

People reminders are opt-in and use the same shared delivery channels as other LifeOS notifications. Birthday reminders use the `birthday` event. Contact-cadence reminders use the `contact_reminder` event with a `cadence_days` value and are based on `last_contacted` or the latest logged interaction date. The effective rule for each event is resolved in this order:

1. Person-level `payload.notifications`.
2. Relationship override in `system.peopleSettings.birthdayNotifications.relationships` or `system.peopleSettings.contactNotifications.relationships`.
3. People-wide default in `system.peopleSettings.birthdayNotifications.default` or `system.peopleSettings.contactNotifications.default`.
4. Built-in disabled default.

For a person, omitting an event rule means inherit that event. Event-specific opt-outs use `disabled_events`, for example `{ enabled: true, disabled_events: ["birthday"], rules: [] }`. Legacy `{ enabled: false, rules: [] }` still disables person-level reminders. February 29 birthdays use March 1 in non-leap years. Contact reminders remain due until a notification delivery is created, then the delivery ledger deduplicates further sends until the next contact changes the due date.

## Example Usage

### Adding a new interaction programmatically

If you needed to interact with the API directly (e.g., logging a new meeting):

```typescript
const interaction = {
  date: new Date().toISOString(),
  type: "meeting",
  note: "Discussed Q3 goals over coffee",
};

// Append to the person's interactions array via the LifeOS API
await fetch(`/api/modules/person/${personId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    payload: {
      interactions: [...existingInteractions, interaction],
      last_contacted: interaction.date,
    },
  }),
});
```

### Dashboard Widget

The People widget integrates with the `WidgetCard` system and relies on a summary endpoint (`/api/widgets/summary?module_type=person`) to fetch metrics like `staleCount` and `healthScore` to display interactive notifications.
