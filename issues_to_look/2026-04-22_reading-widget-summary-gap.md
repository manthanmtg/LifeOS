# Reading widget summary gap

## Issue

`src/modules/reading/Widget.tsx` currently fetches the full `reading_item` collection from `/api/content?module_type=reading_item` and computes unread, high-priority, and type counts in the client. That is heavier than necessary for the admin dashboard and does not follow the widget contract in `AGENTS.md`, which says widgets should fetch from `/api/widgets/summary`.

## Proposed fix

Add a `reading_item` case to `src/app/api/widgets/summary/route.ts` that returns only:

- `unreadCount`
- `readCount`
- `highPriorityCount`
- `types`
- `topPriority`

Then update `src/modules/reading/Widget.tsx` to consume that summary payload instead of pulling the full collection into the dashboard.

## Why I held back

I implemented the change locally, then ran `pnpm check` as required by `prompts/random_selector.md` and the repo instructions.

The run failed on the current latest `main`, not because of the reading widget change:

- `src/app/api/auth/login/__tests__/route.test.ts:30` fails typecheck with `TS2540: Cannot assign to 'NODE_ENV' because it is a read-only property.`

Lint also reports existing repo warnings unrelated to this widget.

Because the selected prompt requires reverting changes when verification fails, I reverted the reading widget optimization and logged it here instead of shipping an unverified change.

## Verification notes

Observed on April 22, 2026 after pulling latest `main` and running `pnpm check`.
