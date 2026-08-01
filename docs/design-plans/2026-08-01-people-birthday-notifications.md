# People Birthday Notifications

**Date:** 2026-08-01

**Status:** Ready for implementation

**Primary route:** `/admin/people`

**Shared delivery route:** `/admin/settings?tab=notifications`

**Scope:** Add inherited, configurable birthday reminders to the People module
through the existing shared notification platform

## Goal

Add external birthday reminders to the People module without creating a second
reminder engine. An administrator must be able to configure a People-wide
default, override it for each relationship category, and then inherit, replace,
or disable that behavior for an individual person.

The change is a feature spanning the People payload schema, People module
settings and forms, the shared notification source registry, annual calendar
date handling, activation visibility, tests, and module documentation. It does
not add a delivery provider, scheduled function, queue, or notification API.

## Current State

### Shared notification platform

- `src/lib/notifications/contracts.ts` already defines provider-neutral
  `NotificationPreferences`, `NotificationRule`, `NotificationCandidate`, and
  `NotificationSource` contracts.
- `src/lib/notifications/schemas.ts` validates item rules with one to ten unique
  offsets from `0` through `365`; `0` means the event day. Optional
  `channel_ids` already support future targeted delivery.
- `src/lib/notifications/sources/registry.ts` registers one source today:
  Recurring Expenses.
- `src/lib/notifications/dispatcher.ts` scans every registered source, resolves
  candidate channels, materializes idempotent delivery records, sends through
  adapters, and isolates a failing source from the others.
- `netlify/functions/notifications-dispatch.mts` invokes the dispatcher through
  the existing hourly schedule in `netlify.toml`. The manual dispatch route
  uses the same dispatcher.
- `src/lib/notifications/time.ts` already performs calendar-day arithmetic,
  resolves a local delivery hour in an IANA timezone, and applies the fixed
  36-hour catch-up window.
- Delivery deduplication includes module type, document id, event, annual event
  date, offset, and channel. A birthday occurrence can therefore be delivered
  once per configured offset and channel every year without a new ledger
  contract.
- `src/components/notifications/RelativeDateNotificationFields.tsx` provides
  shared offset controls, but its zero-offset label is hard-coded as
  `Renewal day` even when another `eventLabel` is supplied.
- The Settings activation summary calls all source items without explicit
  preferences “legacy” and hard-codes “using the 1-day default.” That copy is
  Recurring Expenses-specific and cannot accurately describe relationship
  inheritance in People.

### People module

- `src/lib/schemas.ts` validates `person` payloads through `PersonSchema`.
  Birthday is an optional strict `YYYY-MM-DD` calendar date. There is no
  `notifications` field today.
- `src/modules/people/types.ts` mirrors the payload contract for the client.
  Its `relationship` field is the existing category dimension: `family`,
  `friend`, `colleague`, `acquaintance`, `mentor`, `client`, or `other`.
- `src/modules/people/AdminView.tsx` owns list/profile state and whole-payload
  create/update requests through `/api/content`. It does not currently load
  module settings.
- `src/modules/people/components/PersonForm.tsx` edits a birthday but has no
  notification controls. Whole-payload updates mean a new optional preference
  can be persisted without a new People-specific API.
- `src/modules/people/insights.ts` calculates the next annual birthday for list
  filters and summaries. Its current JavaScript date normalization treats a
  February 29 birthday as March 1 in non-leap years.
- `useModuleSettings` stores module settings in the global `system` document
  through `/api/system`. Keys ending in `Settings` are accepted, so
  `peopleSettings` requires no API route change.
- People records may contain large profile pictures and document attachments.
  An hourly notification source must use a narrow MongoDB projection rather
  than loading those fields.

### Existing invariants to preserve

- Notification delivery remains globally gated by
  `notificationSettings.enabled`, at least one enabled channel, the configured
  IANA timezone, and the configured delivery hour.
- People remains a private `person` content module using the polymorphic
  `content` collection and generic content routes.
- Existing person documents without notification fields must continue to
  validate and render unchanged.
- Existing Recurring Expenses rules, candidates, deduplication, and deliveries
  must remain behaviorally unchanged.
- Notification credentials, adapters, delivery history, retry limits, hourly
  scheduling, and the 90-day delivery TTL remain shared infrastructure.

## Requirements

### Functional requirements

- Register a `person` notification source for the `birthday` event.
- Treat the People `relationship` field as the requested notification
  category. Do not introduce a second `category` field.
- Store one People-wide birthday default and zero or more relationship-specific
  overrides in `system.peopleSettings`.
- Support three effective states on each person:
  - **Inherit**: omit `payload.notifications` and use relationship/default
    settings dynamically.
  - **Custom**: store an enabled explicit `birthday` rule with one or more lead
    day offsets.
  - **Off**: store `{ enabled: false, rules: [] }` so the person remains disabled
    even if inherited settings later become enabled.
- Allow `0`, `1`, `2`, `3`, `7`, `14`, and `30` day presets and an integer
  custom offset from `0` through `365`, reusing the shared control.
- Allow multiple offsets for the same birthday. For example, `[7, 2, 0]`
  creates preparation, near-term, and birthday-day notifications.
- New people and existing people use inheritance by default. Saving an
  inherited person must not materialize a copy of the current category rule.
- Changing a person's relationship while they inherit must immediately change
  the effective preview and future reminder behavior.
- Removing a birthday must also omit a person-level birthday override on the
  saved payload. A person without a birthday is never eligible.
- Relationship rules can explicitly enable or disable birthdays independently
  of the People-wide default.
- All enabled channels receive People notifications by default. Preserve
  `NotificationRule.channel_ids` when present, but do not add a channel picker
  to People in this release.
- Editing only enablement or offsets must retain existing `channel_ids` on the
  same birthday rule. Switching a rule to Off intentionally removes its rules.
- Show People as a separate activation source in System Settings with eligible,
  explicit, and inherited counts.

### Override resolution requirements

Resolve the effective birthday preference in this exact order:

1. A valid person-level `payload.notifications` value.
2. A valid override for `payload.relationship` in
   `peopleSettings.birthdayNotifications.relationships`.
3. `peopleSettings.birthdayNotifications.default`.
4. The built-in safe default `{ enabled: false, rules: [] }` when settings are
   absent or malformed.

At the resolution boundary, an enabled preference that contains no `birthday`
rule does not enable birthday delivery. Person payload validation rejects that
shape in this release; the defensive behavior protects loosely typed system
settings from accidentally activating birthdays.

The resolved origin must be available to the UI as `person`, `relationship`, or
`default` so inherited copy is accurate. The source uses the same resolver as
the form; server and browser must not independently reimplement precedence.

### Birthday date and delivery requirements

- Birthday scheduling is annual. The stored birth year is identity/age data;
  each candidate uses the occurrence year as `source.event_date`.
- For each valid record, consider occurrence years `localYear - 1`,
  `localYear`, and `localYear + 1`, where `localYear` is derived from the global
  notification timezone. This covers the catch-up window, year boundaries,
  and the maximum 365-day lead offset.
- Compute each scheduled date with calendar arithmetic:

  ```text
  scheduled date = birthday occurrence date - offset days
  ```

- Use `isCandidateDue` for the delivery hour, timezone, DST behavior, and
  catch-up window. Do not compare server-local midnights or assume every local
  day is 24 hours.
- Preserve the current People convention for February 29: in a non-leap year,
  the occurrence is March 1. Put this policy in one pure helper and use it in
  both People insights and notification discovery.
- A birthday edited to another date has a new annual event identity. Already
  sent history remains; only candidates for the new date can be discovered.
- The source must propagate a resolved rule's `channel_ids` to the candidate.
- Candidate messages must not include phone numbers, email addresses, freeform
  notes, interaction history, document names, or image data.

Message wording:

| Offset  | Title                            |
| ------- | -------------------------------- |
| `0`     | `<Name>'s birthday is today`     |
| `1`     | `<Name>'s birthday is tomorrow`  |
| `N > 1` | `<Name>'s birthday is in N days` |

The body contains the formatted occurrence date and human-readable
relationship only, for example `25 Apr 2027 · Friend`. It does not expose the
stored birth year separately or require an application base URL.

### Settings and form UX requirements

- Add a labelled Birthday reminders action beside Add Someone in the People
  header. Disable it only while `peopleSettings` is still loading.
- Open a focused, responsive dialog rather than adding all category controls to
  the People list.
- The dialog contains:
  - A People-wide default birthday rule.
  - One row for every existing relationship value.
  - An `Inherit People default` / `Override` choice for each relationship.
  - Shared relative-date controls for an active override.
  - A reset action that removes the relationship key instead of copying the
    current default.
  - Explicit Save and Cancel actions; Cancel discards the draft.
- The Person form contains a Birthday reminders fieldset near the birthday
  input with `Inherit`, `Custom`, and `Off` radio options.
- Inherit copy states whether the effective source is the relationship or the
  People default and summarizes its state/timing.
- Switching from Inherit to Custom seeds the custom offsets from the currently
  effective birthday rule; if that rule is off, use `[1]`.
- If birthday is blank, disable the override controls and explain that a date
  is required. Saving without a birthday omits `notifications`.
- Continue allowing People data to be saved before Telegram is connected.
  Include a non-blocking link to `/admin/settings?tab=notifications`.
- Controls require visible labels, keyboard focus styles, a 44px minimum target
  where practical, correct radio/fieldset semantics, and an `aria-live` status
  for settings save failures/success.
- Use the existing zinc and semantic color tokens only. No new hardcoded hue
  families are permitted.

### Compatibility, performance, and operational requirements

- People birthday defaults are disabled when `peopleSettings` is absent. Merely
  deploying the source must not send notifications for existing contacts.
- No data migration or eager rewrite of person documents is allowed.
- The source query filters `module_type: "person"` and the presence of
  `payload.birthday`, and projects only `_id`, `payload.name`,
  `payload.relationship`, `payload.birthday`, and `payload.notifications`.
- Malformed person records increment `items_skipped` and do not fail the source
  or block Recurring Expenses.
- A missing birthday, a disabled preference, or an enabled preference without
  a birthday rule is an ordinary ineligible record, not a skipped/error item.
- Source logs and error summaries must not include person names or birth dates.
- The existing `{ module_type: 1 }` content index is sufficient for the current
  personal-scale collection; no new index is required.
- Do not change the Netlify schedule, dispatcher batch size, delivery retry
  policy, encryption, adapters, notification routes, or MongoDB collections.

## Assumptions

- “Category” means the People module's existing `relationship` category. Tags
  remain freeform metadata and do not participate in notification precedence.
- The requested override behavior is `person → relationship → People default`,
  with global notification settings and channel availability remaining final
  delivery gates.
- The safest rollout is opt-in. The built-in People birthday default is off,
  with `[1]` used only as the initial timing when an administrator enables a
  rule.
- A relationship override may be on while the People default is off. This
  supports configurations such as notifying only for family birthdays.
- A person-level Off state must be explicit and durable; deleting the nested
  preference would mean Inherit, not Off.
- All enabled channels are appropriate for birthday notifications until a
  future channel-selection UI is deliberately designed.
- The existing March 1 handling for February 29 birthdays is preserved to avoid
  an unrelated behavioral change. A configurable leap-day policy is outside
  this release.
- Birthday messages are private operational notifications. They still minimize
  personally identifying data by including only the name, relationship, and
  occurrence date.
- Global delivery time remains one hour per LifeOS installation. Per-person or
  per-category delivery hours are not part of the requested override.
- The current 36-hour catch-up behavior is accepted. A reminder missed by more
  than that window is not sent late.

## Proposed Design

### 1. Persist shared preferences at two override layers

Extend the person payload with the same optional contract already used by
Recurring Expenses:

```ts
export interface PersonPayload {
  // existing fields
  notifications?: NotificationPreferences;
}
```

Define a People-specific refinement of the shared schema so the first release
accepts only the module-owned `birthday` event, then add it to `PersonSchema`:

```ts
const PersonNotificationPreferencesSchema =
  NotificationPreferencesSchema.superRefine((preferences, ctx) => {
    preferences.rules.forEach((rule, index) => {
      if (rule.event !== "birthday") {
        ctx.addIssue({
          code: "custom",
          path: ["rules", index, "event"],
          message: "People notifications only support the birthday event",
        });
      }
    });
  });

notifications: PersonNotificationPreferencesSchema.optional(),
```

This retains the shared shape, bounds, and optional channel routing while
preventing unsupported People events from being silently overwritten by the
birthday-only editor. A later important-dates feature deliberately expands the
module refinement and merge behavior.

An explicit two-day, one-day, and birthday-day person override is:

```json
{
  "notifications": {
    "enabled": true,
    "rules": [
      {
        "event": "birthday",
        "offsets_days": [0, 1, 2]
      }
    ]
  }
}
```

An explicit person opt-out is:

```json
{
  "notifications": {
    "enabled": false,
    "rules": []
  }
}
```

Inheritance is represented by the absence of `notifications`; do not add a
fourth sentinel value or an `inherit` boolean.

Add `PeopleSettings` in `src/modules/people/config.ts`:

```ts
export interface PeopleBirthdayNotificationSettings {
  default: NotificationPreferences;
  relationships: Partial<Record<Relationship, NotificationPreferences>>;
}

export interface PeopleSettings {
  birthdayNotifications: PeopleBirthdayNotificationSettings;
}
```

The built-in value is:

```ts
export const DEFAULT_PEOPLE_SETTINGS: PeopleSettings = {
  birthdayNotifications: {
    default: { enabled: false, rules: [] },
    relationships: {},
  },
};
```

Store this under `system.peopleSettings`. Relationship entries reuse the full
shared preference contract so event and optional channel semantics stay
consistent. The first UI exposes enablement and offsets only.

### 2. Generalize browser-safe notification preference helpers

Create `src/lib/notifications/preferences.ts` and move
`normalizeNotificationOffsetsDays` out of the Recurring Expenses-specific
helper. Keep a re-export from `recurring-preferences.ts` during this change so
existing imports remain compatible, while new shared UI and People code import
from the generic module.

Create `src/lib/notifications/people-preferences.ts` with these focused
exports:

```ts
export type PeopleBirthdayPreferenceOrigin =
  | { kind: "person" }
  | { kind: "relationship"; relationship: Relationship }
  | { kind: "default" };

export interface ResolvedPeopleBirthdayPreferences {
  preferences: NotificationPreferences;
  origin: PeopleBirthdayPreferenceOrigin;
}

export function normalizePeopleSettings(value: unknown): PeopleSettings;

export function resolvePeopleBirthdayNotificationPreferences(
  payload: Pick<PersonPayload, "relationship" | "notifications">,
  settings: PeopleSettings,
): ResolvedPeopleBirthdayPreferences;

export function buildBirthdayNotificationPreferences(
  enabled: boolean,
  offsetsDays: number[],
  channelIds?: string[],
): NotificationPreferences;

export function getBirthdayNotificationRule(
  preferences: NotificationPreferences,
): NotificationRule | null;
```

`normalizePeopleSettings` is the trust boundary for the loosely typed
`/api/system` module settings object. It keeps valid default/relationship rules,
normalizes offsets, ignores unknown relationship keys and non-`birthday`
events, and falls back to the disabled built-in default for malformed data. It
must never throw in the scheduled source.

`resolvePeopleBirthdayNotificationPreferences` applies the required precedence
and reports the origin. A person-level disabled preference remains authoritative
and does not fall through. A missing person preference falls through even when
the inherited preference is disabled.

### 3. Make annual birthday calendar behavior explicit

Create `src/modules/people/birthday.ts` as a pure, browser-safe People domain
utility. It owns:

```ts
export function getBirthdayOccurrenceDate(
  birthday: string,
  occurrenceYear: number,
): string | null;

export function getBirthdayAgeTurning(
  birthday: string,
  occurrenceYear: number,
): number | null;

export function getCalendarDayDifference(
  fromDate: string,
  toDate: string,
): number;
```

`getBirthdayOccurrenceDate` validates the source date, replaces its year, and
returns a strict calendar key. February 29 becomes March 1 in a non-leap year.
Calendar difference uses UTC calendar keys for arithmetic only, never a local
delivery instant.

Refactor `getBirthdayDetails` in `src/modules/people/insights.ts` to use these
helpers, preserving its public return contract and 30-day upcoming window.
This prevents the UI and external notifications from developing different
annual-occurrence policies.

Add `getCalendarDateInTimezone(date, timezone)` to
`src/lib/notifications/time.ts`, implemented through its existing cached
`Intl.DateTimeFormat` and zoned parts. The source uses its year; no server-local
`getFullYear()` call participates in discovery.

### 4. Add the People notification source

Create `src/lib/notifications/sources/people.ts` and register
`peopleNotificationSource` after the existing Recurring Expenses source.

The source flow is:

```text
hourly/manual dispatch
  → load normalized peopleSettings
  → query projected people with birthdays
  → validate each projected payload with PersonSchema
  → resolve person/relationship/default preference
  → select the birthday rule
  → build previous/current/next local-year occurrences
  → subtract each offset as calendar days
  → retain candidates accepted by isCandidateDue
  → shared dispatcher materializes, deduplicates, and sends
```

The projection deliberately omits profile images, documents, notes, contact
details, social links, and interactions. `PersonSchema` defaults the omitted
arrays/flags during validation.

Candidate shape:

```ts
{
  source: {
    module_type: "person",
    document_id: String(document._id),
    event: "birthday",
    event_date: occurrenceDate,
  },
  scheduled_date: addDaysToCalendarDate(occurrenceDate, -offsetDays),
  offset_days: offsetDays,
  channel_ids: birthdayRule.channel_ids,
  message: {
    title: titleForBirthdayOffset(person.name, offsetDays),
    body: `${formattedOccurrence} · ${formattedRelationship}`,
  },
}
```

Do not include `channel_ids` when the rule omits it. The source returns a typed
candidate, and source tests must also parse every emitted fixture with
`NotificationCandidateSchema` so runtime fields cannot drift from the shared
contract. Do not add People-only runtime validation to the dispatcher.

The activation summary counts only valid people with a birthday and an enabled
`birthday` rule:

- `eligible_count`: all enabled birthday people.
- `explicit_count`: eligible people resolved from `payload.notifications`.
- `inherited_count`: eligible people resolved from a relationship override or
  People default.

Rename `legacy_count` to `inherited_count` in the internal
`NotificationSourceActivationSummary` contract. Update the Recurring Expenses
source to report its existing non-explicit records as inherited; this is a
terminology/UI contract change only and does not affect delivery behavior.

### 5. Make the shared relative-date component event-neutral

Update `RelativeDateNotificationFields` so `labelForOffset` receives
`eventLabel`:

```text
Birthday day
1 day before
2 days before
...
```

`Renewal` callers continue to render `Renewal day`. Preserve controlled state,
normalization, preset values, custom range, disabled behavior, and the existing
automatic `[1]` seed when a rule becomes enabled.

The component remains presentation-only. It does not resolve inheritance, read
channels, save settings, or call notification APIs.

### 6. Add People relationship defaults UI

Add `PeopleNotificationSettingsDialog.tsx` as a focused component. It receives
normalized settings, edits a local draft, and submits one complete
`PeopleSettings` value through `useModuleSettings("peopleSettings", ...)`.

Extend `useModuleSettings` additively with `error: string | null` and make
`updateSettings` resolve to `true` after a successful response or `false` after
a failed request. Existing callers may continue ignoring the return value.
Clear stale error state before a new load/save attempt and use stable messages
for malformed/failed loads and non-OK saves. The People dialog stays open on a
`false` result and announces the error; it closes only after `true`.

The People default uses `RelativeDateNotificationFields` directly. Each
relationship row has an inheritance/override selector:

- Inherit removes that relationship from `relationships`.
- Override initially clones the effective People default. If the default is
  off, seed an enabled `[1]` birthday rule so choosing Override produces a
  useful editable state.
- Turning an override off stores a disabled preference instead of deleting it.
- Reset deletes the key and immediately previews inherited behavior.
- Offset edits pass through any existing birthday `channel_ids`; the hidden
  routing metadata is not discarded merely because v1 has no picker.

Use explicit Save to call `updateSettings({ birthdayNotifications: draft })`.
Do not autosave every checkbox because a user may change several categories as
one configuration action. Cancel closes without mutating the hook state.

`PeopleHeader` gains a Bell-labelled action and `AdminView` owns dialog open
state. `AdminView` loads/normalizes `peopleSettings`, passes it to both the
dialog and `PersonForm`, and exposes save progress/status without delaying the
existing rich People loading skeleton.

### 7. Add per-person override UI and persistence

Extend `PersonFormProps` with normalized `peopleSettings`. Initialize form
state as follows:

- No `person.payload.notifications`: `inherit`.
- Valid disabled preferences: `off`.
- Valid enabled preference containing a birthday rule: `custom`, using its
  offsets.
- The schema rejects unsupported People event names in this release, so every
  enabled person preference presented by the form contains `birthday`.

When the relationship changes in Inherit mode, recompute the read-only
effective summary. Custom/Off remain person-specific and do not change.

Payload construction is exact:

```ts
const notifications = !birthday
  ? undefined
  : notificationMode === "inherit"
    ? undefined
    : notificationMode === "off"
      ? { enabled: false, rules: [] }
      : buildBirthdayNotificationPreferences(
          true,
          notificationOffsetsDays,
          notificationChannelIds,
        );
```

Initialize `notificationChannelIds` from the effective birthday rule when
Custom is entered. It is not rendered as a picker, but carrying it through
prevents a birthday timing edit from broadening an existing targeted rule to
all channels.

Add `notifications` to the whole `PersonPayload` sent by create/update. Existing
interactions, documents, favorite state, avatar, and other fields continue to
be preserved exactly as today.

### 8. Generalize notification activation visibility

Update the Settings source preview to use event-neutral copy:

```text
People birthdays · 8 enabled items · 2 explicit · 6 inherited
Recurring Expenses · 12 enabled items · 3 explicit · 9 inherited
```

The source label owns the module/event wording; the UI owns the generic counts.
Do not hard-code a one-day default in System Settings because each source can
now have different module and category defaults.

Recent activity needs no schema change. People deliveries already render their
message title, `person` module type, channel, and status through the shared
DTO.

### Alternatives considered

#### Person-only preferences

Adding only `payload.notifications` would be the smallest schema change, but it
would require repetitive edits and would not satisfy category configuration.
It also makes changes to family/friend policy expensive.

#### Dedicated birthday reminder documents

Creating separate reminder records would make inheritance explicit in stored
data but would duplicate scheduling state, introduce synchronization when a
person changes, and compete with the existing shared source discovery model.

#### Chosen: inherited shared preferences

Absence means inherit, an explicit disabled preference means opt out, and the
existing source/dispatcher/ledger contracts handle delivery. This is additive,
small, and consistent with the platform's module-owned event semantics.

## Files To Change

| File                                                                                | Action | Detailed Change                                                                                                                                      |
| ----------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/notifications/preferences.ts`                                              | Create | Own generic offset normalization currently housed in the Recurring Expenses helper.                                                                  |
| `src/lib/notifications/people-preferences.ts`                                       | Create | Normalize `peopleSettings`, build birthday rules, resolve person/relationship/default precedence, and expose origin metadata.                        |
| `src/lib/notifications/sources/people.ts`                                           | Create | Query projected People data, create annual birthday candidates, and report activation counts.                                                        |
| `src/lib/notifications/contracts.ts`                                                | Modify | Rename activation `legacy_count` to `inherited_count`; keep all delivery contracts unchanged.                                                        |
| `src/lib/notifications/recurring-preferences.ts`                                    | Modify | Consume/re-export generic offset normalization without changing recurring behavior.                                                                  |
| `src/lib/notifications/sources/recurring-expenses.ts`                               | Modify | Return `inherited_count` terminology; do not change candidate discovery.                                                                             |
| `src/lib/notifications/sources/registry.ts`                                         | Modify | Register `peopleNotificationSource`.                                                                                                                 |
| `src/lib/notifications/time.ts`                                                     | Modify | Export the current calendar date in a supplied IANA timezone using existing zoned parts.                                                             |
| `src/components/notifications/RelativeDateNotificationFields.tsx`                   | Modify | Render an event-specific zero-offset label such as Birthday day.                                                                                     |
| `src/components/settings/NotificationSettingsTab.tsx`                               | Modify | Render generic explicit/inherited source summaries.                                                                                                  |
| `src/lib/schemas.ts`                                                                | Modify | Add optional shared notification preferences refined to the People-owned `birthday` event.                                                           |
| `src/hooks/useModuleSettings.ts`                                                    | Modify | Expose additive load/save error state and a success result so the People dialog can report persistence accurately without changing existing callers. |
| `src/modules/people/config.ts`                                                      | Create | Define People settings types, birthday constants, and safe disabled defaults.                                                                        |
| `src/modules/people/birthday.ts`                                                    | Create | Own annual occurrence, leap-day, age, and calendar difference behavior.                                                                              |
| `src/modules/people/types.ts`                                                       | Modify | Add optional `NotificationPreferences` to `PersonPayload`.                                                                                           |
| `src/modules/people/insights.ts`                                                    | Modify | Use the shared People birthday occurrence helper while preserving summaries and filters.                                                             |
| `src/modules/people/components/PeopleNotificationSettingsDialog.tsx`                | Create | Edit People default and relationship overrides as one accessible draft.                                                                              |
| `src/modules/people/components/PeopleHeader.tsx`                                    | Modify | Add the Birthday reminders settings action.                                                                                                          |
| `src/modules/people/components/PersonForm.tsx`                                      | Modify | Add Inherit/Custom/Off controls, inherited preview, and payload persistence.                                                                         |
| `src/modules/people/AdminView.tsx`                                                  | Modify | Load `peopleSettings`, own the dialog, pass normalized settings to PersonForm, and save settings.                                                    |
| `src/lib/notifications/__tests__/preferences.test.ts`                               | Create | Test generic offset normalization and non-recurring reuse.                                                                                           |
| `src/lib/notifications/__tests__/people-preferences.test.ts`                        | Create | Test precedence, explicit Off, relationship/default fallback, malformed settings, and birthday rule selection.                                       |
| `src/lib/notifications/__tests__/time.test.ts`                                      | Modify | Test timezone-local calendar date/year around UTC year boundaries.                                                                                   |
| `src/lib/notifications/sources/__tests__/people.test.ts`                            | Create | Test annual candidate discovery, offsets, timezone, catch-up, leap day, projection, privacy, channel propagation, skips, and activation counts.      |
| `src/lib/notifications/sources/__tests__/registry.test.ts`                          | Create | Assert Recurring Expenses and People are both registered exactly once.                                                                               |
| `src/lib/notifications/sources/__tests__/recurring-expenses.test.ts`                | Modify | Update activation terminology only.                                                                                                                  |
| `src/components/notifications/__tests__/RelativeDateNotificationFields.test.tsx`    | Modify | Assert Birthday day and unchanged Renewal day copy.                                                                                                  |
| `src/components/settings/__tests__/NotificationSettingsTab.test.tsx`                | Modify | Cover both source rows and generic inherited copy.                                                                                                   |
| `src/lib/__tests__/schemas.test.ts`                                                 | Modify | Accept valid person birthday preferences and reject invalid rules.                                                                                   |
| `src/hooks/__tests__/useModuleSettings.test.tsx`                                    | Modify | Cover additive load/save error reporting and successful update results.                                                                              |
| `src/modules/people/__tests__/birthday.test.ts`                                     | Create | Test normal annual dates, year boundaries, March 1 leap-day policy, age, and calendar differences.                                                   |
| `src/modules/people/__tests__/insights.test.ts`                                     | Modify | Add February 29 parity and preserve existing birthday summaries.                                                                                     |
| `src/modules/people/components/__tests__/PeopleNotificationSettingsDialog.test.tsx` | Create | Test draft Save/Cancel, relationship override/reset, disabled override, and offset changes.                                                          |
| `src/modules/people/components/__tests__/PersonForm.test.tsx`                       | Create | Test Inherit/Custom/Off payloads, relationship preview changes, and birthday removal.                                                                |
| `src/modules/people/__tests__/AdminView.test.tsx`                                   | Modify | Mock module settings, open the reminder dialog, and verify settings persistence wiring.                                                              |
| `src/modules/people/README.md`                                                      | Modify | Document data contracts, precedence, date semantics, defaults, and setup requirements.                                                               |
| `src/modules/people/info.md`                                                        | Modify | Add concise user guidance for relationship and person birthday reminders.                                                                            |
| `src/lib/README.md`                                                                 | Modify | List People as a registered source and explain shared preference/inheritance helpers.                                                                |

No file is deleted. No change is expected in `dispatcher.ts`, notification
repositories, adapters, API route files, `netlify.toml`, or the Netlify
function.

## Implementation Phases

### Phase 1: Generalize shared preference and source-summary contracts

1. Add failing tests for generic offset normalization and event-neutral
   RelativeDateNotificationFields labels.
2. Create `preferences.ts`, move the pure normalizer, and retain a compatibility
   re-export from `recurring-preferences.ts`.
3. Change the activation summary field to `inherited_count` in contracts,
   Recurring Expenses, Settings copy, fixtures, and tests.
4. Run shared notification/component tests before touching People behavior.

This phase must leave all recurring candidate tests green.

### Phase 2: Define People settings, payload, and precedence

1. Add schema tests for valid, disabled, and invalid person preferences.
2. Add `notifications` to `PersonSchema` and `PersonPayload`.
3. Create `config.ts` with the disabled default and `[1]` initial enablement
   offset.
4. Write resolver tests covering every precedence branch and malformed system
   settings.
5. Implement `people-preferences.ts` until those tests pass.

The deliverable is a browser-safe, pure effective-preference API; no scheduled
source exists yet.

### Phase 3: Implement annual calendar semantics and source discovery

1. Add failing birthday utility tests, including February 29 in leap and
   non-leap years.
2. Implement `birthday.ts` and refactor People insights to consume it.
3. Add timezone calendar-date tests to `time.test.ts` and export the helper.
4. Add source tests for exact candidate identity, message privacy, lead-day
   schedules, year rollover, catch-up, per-person and relationship precedence,
   optional channel ids, malformed records, and activation summaries.
5. Implement `sources/people.ts` with the narrow query/projection.
6. Register the source and add a registry assertion so accidental removal is
   detected.

The deliverable is externally discoverable People birthday candidates through
the existing dispatcher, still inactive by default.

### Phase 4: Add People defaults and relationship override UI

1. Write dialog tests for local draft behavior before creating the component.
2. Implement the People-wide default and seven relationship rows with shared
   relative-date controls.
3. Wire `useModuleSettings("peopleSettings", DEFAULT_PEOPLE_SETTINGS)` into
   `AdminView`; normalize values after reading and before rendering/saving.
4. Add the header action and dialog open/close/save states.
5. Add non-breaking error/result state to `useModuleSettings` so the dialog can
   distinguish a persisted save from a failed request.
6. Verify Cancel never calls `/api/system`, Save writes one complete
   `peopleSettings` object, and save errors remain visible without closing.

### Phase 5: Add individual override UI

1. Write PersonForm tests for Inherit, Custom, and Off serialization.
2. Add effective origin/timing copy and birthday-required behavior.
3. Seed Custom from the effective inherited offsets and preserve explicit Off.
4. Include `notifications` in create/edit payloads and clear it when birthday is
   removed.
5. Extend the AdminView integration test to pass loaded settings through both
   new and edit flows.

### Phase 6: Documentation and end-to-end verification

1. Update People and shared library documentation with exact examples and
   rollout behavior.
2. Run focused tests, formatting, and the repository-wide check.
3. Start the app and use Playwright to verify People settings, a person
   override, and the global Notifications source preview on desktop and mobile.
4. If a configured Telegram test environment is available, create a controlled
   birthday due at the current delivery window, run manual dispatch once, and
   confirm one ledger/activity entry. Do not make a real Telegram send a
   requirement for automated CI.

## Testing Plan

| Test                     | File or Command                                                                                                                                                                        | Purpose                                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Shared offsets           | `src/lib/notifications/__tests__/preferences.test.ts`                                                                                                                                  | Unique sorted offsets, bounds, fallback, and generic ownership.                                                           |
| People precedence        | `src/lib/notifications/__tests__/people-preferences.test.ts`                                                                                                                           | Person, relationship, default, explicit Off, missing birthday rule, channel preservation, and malformed setting behavior. |
| Annual dates             | `src/modules/people/__tests__/birthday.test.ts`                                                                                                                                        | Annual occurrence keys, year boundaries, age, calendar math, and March 1 leap-day policy.                                 |
| Existing People insights | `src/modules/people/__tests__/insights.test.ts`                                                                                                                                        | No regression in summaries, upcoming filters, and February 29 parity.                                                     |
| Timezone calendar key    | `src/lib/notifications/__tests__/time.test.ts`                                                                                                                                         | Correct local date/year on opposite sides of a UTC year boundary.                                                         |
| People source            | `src/lib/notifications/sources/__tests__/people.test.ts`                                                                                                                               | Due/not-due candidates, multiple offsets, annual dedupe identity, projection, privacy, channel ids, skips, and counts.    |
| Recurring source         | `src/lib/notifications/sources/__tests__/recurring-expenses.test.ts`                                                                                                                   | Prove terminology refactor does not change recurring discovery.                                                           |
| Person schema            | `src/lib/__tests__/schemas.test.ts`                                                                                                                                                    | Backward compatibility and shared preference validation.                                                                  |
| Module settings hook     | `src/hooks/__tests__/useModuleSettings.test.tsx`                                                                                                                                       | Load/save error state and successful persistence result without breaking current consumers.                               |
| Shared fields UI         | `src/components/notifications/__tests__/RelativeDateNotificationFields.test.tsx`                                                                                                       | Event-specific day label and preset/custom behavior.                                                                      |
| People settings UI       | `src/modules/people/components/__tests__/PeopleNotificationSettingsDialog.test.tsx`                                                                                                    | Draft isolation, default/category rules, reset, save, and accessibility.                                                  |
| Person override UI       | `src/modules/people/components/__tests__/PersonForm.test.tsx`                                                                                                                          | Exact payloads for Inherit/Custom/Off and blank birthday.                                                                 |
| People integration       | `src/modules/people/__tests__/AdminView.test.tsx`                                                                                                                                      | Settings loading/persistence and form prop wiring.                                                                        |
| Global overview UI       | `src/components/settings/__tests__/NotificationSettingsTab.test.tsx`                                                                                                                   | Multiple source rows and generic inherited terminology.                                                                   |
| Focused run              | `pnpm test src/lib/notifications src/modules/people src/components/notifications src/components/settings/__tests__/NotificationSettingsTab.test.tsx src/lib/__tests__/schemas.test.ts` | Fast feedback across all changed contracts.                                                                               |
| Formatting               | `pnpm format`                                                                                                                                                                          | Apply repository formatting before final verification.                                                                    |
| Full verification        | `pnpm check`                                                                                                                                                                           | Required lint, typecheck, build, and full Vitest suite.                                                                   |
| Visual verification      | Playwright on `/admin/people` and `/admin/settings?tab=notifications` at approximately `1440px` and `375px` widths                                                                     | Dialog layout, radio/keyboard behavior, responsive controls, settings persistence, and source preview.                    |

## Edge Cases

- **No birthday:** no candidate and no activation count; the form omits the
  person override.
- **Default off, family on:** family inherits the relationship rule; every
  other relationship remains off.
- **Relationship on, person off:** explicit Off wins and remains durable across
  settings changes.
- **Person custom, relationship changes:** custom settings remain unchanged.
- **Person inherits, relationship changes:** effective behavior changes without
  rewriting the person.
- **Enabled module setting without `birthday`:** normalization treats it as
  disabled. Person payload validation rejects unsupported event names.
- **Invalid projected person:** increment one skip and continue scanning.
- **Invalid module settings:** normalize to safe disabled defaults; do not throw
  or silently enable reminders.
- **February 29 in a non-leap year:** schedule March 1 and subtract lead days
  from that occurrence.
- **New Year boundary:** generate adjacent occurrence years before applying due
  filtering so December/January lead offsets and catch-up are retained.
- **Offset `365`:** adjacent-year generation supplies the relevant occurrence;
  calendar arithmetic handles leap years.
- **DST transition:** the event remains a calendar date; existing time
  resolution chooses the defined local delivery instant.
- **Scheduler runs repeatedly or concurrently:** the existing dedupe key
  prevents duplicate delivery per annual occurrence, offset, and channel.
- **Two offsets scheduled on the same date:** each offset has a distinct dedupe
  identity and message. Normal configurations should avoid semantically
  redundant offsets, but the contract remains deterministic.
- **Birthday edited after a send:** the old delivery stays in history; the new
  occurrence date can create a new identity if it is in the due window.
- **Preference disabled after a failed delivery was materialized:** the ledger's
  existing retry semantics may still retry that already-created delivery. New
  candidates stop. This matches current platform behavior.
- **No enabled channel or global platform off:** source discovery is not run by
  the dispatcher and nothing is sent.
- **Settings load failure:** People continues functioning with safe disabled
  defaults; the settings dialog reports that configuration could not be loaded
  rather than presenting defaults as successfully persisted state.
- **Profile/document-heavy records:** projection prevents hourly loading of
  base64 fields.

## Risks And Mitigations

- **Risk: deployment unexpectedly notifies every existing contact.** Mitigation:
  People defaults are disabled unless explicitly configured; existing payloads
  inherit Off.
- **Risk: ambiguous category semantics.** Mitigation: use and label the existing
  relationship enum; tags are explicitly excluded.
- **Risk: client and scheduled source resolve different overrides.** Mitigation:
  both import the same browser-safe resolver and normalized settings contract.
- **Risk: UTC/server timezone creates off-by-one birthdays.** Mitigation: derive
  the local calendar year from the configured IANA timezone and keep event
  arithmetic as calendar keys until delivery-time resolution.
- **Risk: leap-day behavior surprises users.** Mitigation: preserve current
  March 1 behavior, document it, and cover it in UI/source tests.
- **Risk: source scanning becomes expensive.** Mitigation: query only People
  records with birthdays and project five small fields; reuse the existing
  module-type index.
- **Risk: generic contract rename regresses Recurring Expenses.** Mitigation:
  limit it to activation DTO/copy, update fixtures together, and run recurring
  source tests before People work.
- **Risk: an invalid system settings object enables reminders.** Mitigation:
  normalize unknown data to disabled defaults and never infer enabled from
  malformed values.
- **Risk: notification messages expose sensitive CRM data.** Mitigation: use
  only name, occurrence date, and relationship; do not log record identifiers
  alongside personal fields.
- **Risk: category configuration is lost through shallow module-setting
  merging.** Mitigation: the dialog submits the complete nested
  `birthdayNotifications` object in one `updateSettings` call.

## Rollout And Rollback

### Rollout

1. Deploy the additive schema, helper, source, and UI changes with the built-in
   People default disabled.
2. Confirm `/admin/settings?tab=notifications` lists People with zero enabled
   items unless a rule was deliberately configured.
3. Configure a single controlled person override and use manual dispatch near
   the delivery window.
4. Enable one relationship override, observe its eligible count, then expand
   to a People-wide default only if desired.
5. Monitor scheduled-function summaries and recent delivery activity for
   skipped items, failures, and duplicate counts.

No MongoDB migration is required. Existing person documents remain valid, and
old application code ignores both `peopleSettings` and optional nested
preferences.

### Rollback

- Removing the People source from the registry stops new birthday candidate
  discovery while leaving People CRUD and stored settings intact.
- Reverting the UI/schema code does not require deleting additive fields; old
  code ignores them.
- For an immediate operational stop, disable the People default and relationship
  rules before rollback. Disabling global notifications or channels also stops
  all modules but has broader impact.
- Already sent delivery history remains until its normal 90-day TTL. A failed
  delivery already materialized before rollback follows existing retry
  semantics unless global delivery is disabled.

## Recommended Follow-On Features

These are useful suggestions but intentionally not part of this implementation:

1. **Important dates and anniversaries.** Add stable per-person date IDs and
   annual/one-time recurrence before mapping them to events; do not overload the
   single birthday field.
2. **Relationship follow-up nudges.** Derive a next-contact date from
   `last_contacted` plus relationship cadence, and advance it when an
   interaction is logged. This should be a separate `follow_up` source/event.
3. **Inner-circle defaults.** Add an `is_favorite` override layer only if the
   relationship hierarchy proves insufficient; its precedence must be explicit
   before implementation.
4. **Per-rule channel selection.** Expose the existing `channel_ids` contract in
   shared UI so birthdays can go to a private channel while finance reminders
   use another destination.
5. **Snooze or acknowledge.** Add ledger-level actions only after defining how
   retries, already-materialized work, and a new scheduled date interact.
6. **Birthday preparation context.** A future message template may include
   non-sensitive gift/interests prompts, but notes must remain opt-in because
   they can contain private CRM information.

The best next extension after birthday reminders is relationship follow-up
nudges: it uses information People already tracks and directly supports the
module's network-health purpose. It should follow this source as a separate
design so annual dates and rolling relationship cadence remain independent.

## Non-Goals

- Adding Telegram, email, Slack, SMS, WhatsApp, push, or another adapter.
- Creating a new cron job, queue, delivery collection, or People API route.
- Changing global timezone, delivery hour, catch-up, retry, lease, batch, or
  retention policies.
- Sending birthday greetings directly to the person; notifications are reminders
  to the LifeOS owner.
- Per-person delivery time or timezone.
- Tag-based rules, favorite-based rules, age-based rules, or arbitrary boolean
  rule expressions.
- Editing message templates or adding sensitive People fields to messages.
- Important dates, anniversaries, contact cadence, snooze, or acknowledgment in
  the first release.
- Cancelling or deleting already-materialized delivery ledger entries when a
  preference changes.
- Changing the People widget contract or adding notification controls inside
  dashboard widgets.
- Migrating existing person records to explicit preferences.

## Implementer Handoff Checklist

- [ ] The `person → relationship → default` precedence is implemented once and
      shared by the UI and source.
- [ ] Existing People records remain valid and silent by default.
- [ ] `PersonSchema` and `PersonPayload` expose optional shared preferences.
- [ ] People settings use the existing `peopleSettings` system-config pattern.
- [ ] Annual occurrence, timezone, catch-up, and leap-day behavior are covered
      by deterministic tests.
- [ ] Source queries project no images, documents, notes, or contact details.
- [ ] Candidate identity uses annual occurrence date and propagates optional
      channel IDs.
- [ ] Recurring Expenses behavior remains unchanged after shared refactors.
- [ ] Relationship settings Save/Cancel and person Inherit/Custom/Off behavior
      have component tests.
- [ ] System Settings shows event-neutral inherited counts for both sources.
- [ ] Documentation explains opt-in rollout and the March 1 leap-day policy.
- [ ] `pnpm format` and `pnpm check` pass.
- [ ] Desktop and mobile Playwright verification covers People and global
      Notifications settings.
