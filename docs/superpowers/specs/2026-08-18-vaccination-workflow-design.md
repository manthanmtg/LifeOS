# Vaccination Workflow Design

## Goal

Turn Health vaccinations from a flat editable list into a useful immunization log: people can record completed doses quickly, schedule repeats by interval, understand what needs attention, and receive configured reminders without changing or losing existing records.

## Scope

- Preserve every existing `Vaccination` record and the existing content API contract.
- Add optional fields only: a repeat interval in months, reminder preferences, a dose label, and certificate attachments.
- Replace the ambiguous duplicate action with **Mark repeat done**. It creates a new historical record, prefilled from the due record, with a blank batch number and no inherited attachments.
- Add interval choices: no repeat, custom date, 1, 3, 6, and 12 months. The chosen interval calculates and displays the resulting due date, while the date remains editable.
- Present current items in three groups: Needs attention (overdue/due soon), Upcoming, and History (no future due date), with an expandable per-vaccine history.
- Add safe presets as convenience labels only. The app must not present clinical recommendations or auto-select a medical schedule.
- Surface a per-record reminder toggle and editable reminder offsets. Notifications use the existing notification dispatcher and only send if global notifications and a channel are configured.
- Allow optional certificate/record attachments using the existing health-document attachment shape; attachments remain scoped to a vaccination record.

## Data model and compatibility

`Vaccination` remains an append-only historical record. The following optional fields are added so older data remains valid:

```ts
repeat_interval_months?: 1 | 3 | 6 | 12;
dose_label?: string;
reminder_enabled?: boolean;
reminder_offsets_days?: number[];
attachments?: BillAttachment[];
```

`next_due` is still the authoritative calendar date. `repeat_interval_months` is only a convenience for calculating the next due date after a completed repeat. When an existing record has a date but no interval, its Repeat Done form defaults to Custom date; this avoids guessing the intended schedule. `reminder_enabled` defaults to true for dated vaccines; offsets default to `[30, 7, 1]` only when reminders are enabled.

## User experience

The list has one primary action: **Add vaccine**. Each due or upcoming row has a visible, keyboard-accessible **Mark repeat done** action. Secondary actions are in a labelled overflow menu and remain available on touch screens.

The repeat form pre-fills vaccine name, dose label, provider, notes, and repeat schedule; it sets administered date to today, clears batch number and attachments, and calculates the next due date from the selected interval. Editing an existing record never creates a second record. Completion creates a fresh record, leaving the previous dose intact.

Rows use semantic status colour together with status text and an icon. Touch targets are at least 44px, all icon actions have labels, and the form uses visible labels and helper text. The compact layout works at 375px without horizontal overflow.

## Notifications

Add a `health_profile` notification source. It validates profiles through `HealthProfileSchema`, emits one candidate per enabled vaccination offset, and uses `vac.id` in the event name so two doses of the same vaccine never deduplicate each other. Message copy identifies the profile and vaccine, states whether it is overdue/today/in N days, and links to `/admin/health`.

This feature does not add background scheduling infrastructure. It participates in the existing dispatcher, trigger endpoint, delivery ledger, configured timezone, delivery hour, retry behaviour, and channel selection.

## Testing and verification

- Unit-test interval calculation, defaults, repeat-draft creation, grouping, and attachment clearing.
- Test schema acceptance of older and new vaccine records, including invalid offsets/attachments rejection.
- Test notification candidates and registry inclusion, including disabled reminders and profile-specific deduplication.
- Add component tests for visible Repeat Done and group states.
- Run focused tests during development, then `pnpm check`; visually inspect Health vaccinations at desktop and 375px via Playwright.
