# LifeOS Notification Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared LifeOS notification platform end to end with Telegram as the first adapter and Recurring Expenses as the first source.

**Architecture:** Add browser-safe contracts plus server-only registries, repositories, encryption, Telegram delivery, source discovery, and a shared dispatcher. Expose protected admin APIs, invoke the dispatcher from an hourly Netlify scheduled function, and surface configuration through a new Settings tab plus recurring-expense item preferences.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, MongoDB Node driver 7, Zod 4, Vitest 4, Tailwind CSS 4, Lucide React, Netlify Scheduled Functions.

## Global Constraints

- Global notifications default to disabled.
- Initial adapter type is exactly `telegram`.
- Telegram bot tokens must be encrypted with AES-256-GCM using `NOTIFICATION_ENCRYPTION_KEY`, a base64 32-byte key.
- Browser DTOs must never include credentials or full chat IDs.
- Delivery dedupe key is SHA-256 of `module_type`, `document_id`, `event`, `event_date`, `offset_days`, and `channel_id`.
- Delivery history expires after 90 days via a TTL index.
- Scheduled dispatch batch size is clamped to 1 through 10, with send concurrency capped at 5.
- Retryable failures retry at least 5 minutes after attempt 1 and at least 30 minutes after attempt 2; maximum attempts is 3.
- Recurring expense `enable_reminders` remains for compatibility; nested `notifications` is authoritative for new writes.
- `renewalWarningDays` remains visual-only and does not affect external notifications.
- Use only LifeOS semantic color tokens and zinc neutrals in UI edits.
- Use TDD for production behavior.

---

## File Structure

Create:

- `src/lib/notifications/contracts.ts`: Shared notification types, defaults, DTOs, constants.
- `src/lib/notifications/schemas.ts`: Zod validation for preferences, settings, channels, and route input.
- `src/lib/notifications/errors.ts`: Typed errors and sanitization helpers.
- `src/lib/notifications/crypto.ts`: AES-256-GCM credential envelope helpers.
- `src/lib/notifications/time.ts`: IANA timezone validation, calendar math, and due-window logic.
- `src/lib/notifications/delivery-key.ts`: Canonical delivery key hashing.
- `src/lib/notifications/repositories.ts`: MongoDB channel and delivery persistence plus indexes.
- `src/lib/notifications/adapters/telegram.ts`: Telegram test/send implementation.
- `src/lib/notifications/adapters/registry.ts`: Adapter registry.
- `src/lib/notifications/sources/recurring-expenses.ts`: Recurring-expense source and compatibility resolver.
- `src/lib/notifications/sources/registry.ts`: Source registry.
- `src/lib/notifications/dispatcher.ts`: Shared dispatch entry point.
- `src/components/notifications/RelativeDateNotificationFields.tsx`: Reusable controlled offset editor.
- `src/components/settings/NotificationSettingsTab.tsx`: Notifications settings UI.
- `src/app/api/notifications/.../route.ts`: Protected notification API family.
- `netlify/functions/notifications-dispatch.mts`: Hourly scheduled function entry point.
- Matching `__tests__` files for contracts, pure utilities, adapter, source, dispatcher, routes, and UI.

Modify:

- `src/lib/schemas.ts`: Import and apply `NotificationPreferencesSchema` to `RecurringExpenseSchema`.
- `src/lib/types.ts`: Add optional `notificationSettings` to `SystemConfig`.
- `src/lib/seed.ts`: Ensure notification indexes during normal initialization.
- `src/proxy.ts`: Protect `/api/notifications`.
- `src/app/admin/settings/page.tsx`: Add Notifications tab and direct `?tab=notifications` support.
- `src/modules/recurring-expenses/AdminView.tsx`: Add notification defaults and per-item preference UI.
- `src/modules/recurring-expenses/README.md`, `src/lib/README.md`, `README.md`, `.env.local.example`, `AGENTS.md`, `netlify.toml`.

## Task 1: Contracts, Schemas, and Recurring Schema Compatibility

**Files:**

- Create: `src/lib/notifications/contracts.ts`
- Create: `src/lib/notifications/schemas.ts`
- Modify: `src/lib/schemas.ts`
- Test: `src/lib/notifications/__tests__/schemas.test.ts`
- Test: `src/lib/__tests__/schemas.test.ts`

**Interfaces:**

- Produces: `NotificationPreferences`, `NotificationRule`, `NotificationSettings`, `DEFAULT_NOTIFICATION_SETTINGS`, `NotificationMessage`, `NotificationCandidate`, `NotificationChannelDto`, `NotificationDeliveryDto`.
- Produces: `NotificationPreferencesSchema`, `NotificationSettingsSchema`, `NotificationSettingsUpdateSchema`, `TelegramChannelCreateSchema`, `TelegramChannelUpdateSchema`.

- [ ] Write failing tests for valid preferences, invalid offsets, duplicate events, explicit channel IDs, settings defaults, Telegram create input, and legacy recurring-expense payloads.
- [ ] Run: `pnpm test src/lib/notifications/__tests__/schemas.test.ts src/lib/__tests__/schemas.test.ts`
- [ ] Implement contracts and schemas.
- [ ] Wire `RecurringExpenseSchema.notifications` to `NotificationPreferencesSchema.optional()`.
- [ ] Run the same tests until green.
- [ ] Commit: `feat: add notification contracts`

## Task 2: Pure Utilities

**Files:**

- Create: `src/lib/notifications/errors.ts`
- Create: `src/lib/notifications/crypto.ts`
- Create: `src/lib/notifications/time.ts`
- Create: `src/lib/notifications/delivery-key.ts`
- Test: `src/lib/notifications/__tests__/crypto.test.ts`
- Test: `src/lib/notifications/__tests__/time.test.ts`
- Test: `src/lib/notifications/__tests__/delivery-key.test.ts`

**Interfaces:**

- Consumes: contracts from Task 1.
- Produces: `encryptCredential(plaintext: string): EncryptedCredential`
- Produces: `decryptCredential(envelope: EncryptedCredential): string`
- Produces: `isNotificationEncryptionReady(): boolean`
- Produces: `validateIanaTimezone(timezone: string): boolean`
- Produces: `addDaysToCalendarDate(date: string, days: number): string`
- Produces: `isCandidateDue(candidate, settings, now): boolean`
- Produces: `buildDeliveryDedupeKey(parts): string`
- Produces: `NotificationError`

- [ ] Write failing crypto tests for round-trip, unique IVs, tamper rejection, missing key, malformed key, and wrong key length.
- [ ] Write failing time tests for timezone validation, day subtraction, leap day, offset 0, delivery hour, and catch-up boundaries.
- [ ] Write failing delivery-key tests for deterministic keys and channel-specific uniqueness.
- [ ] Run the three new test files and verify failures.
- [ ] Implement utilities with no network or database dependencies.
- [ ] Run the three test files until green.
- [ ] Commit: `feat: add notification utilities`

## Task 3: Repositories and Indexes

**Files:**

- Create: `src/lib/notifications/repositories.ts`
- Modify: `src/lib/seed.ts`
- Test: `src/lib/notifications/__tests__/repositories.test.ts`

**Interfaces:**

- Consumes: contracts and utilities from Tasks 1-2.
- Produces: `ensureNotificationIndexes(db: Db): Promise<void>`
- Produces: channel repository helpers for list/create/update/delete/test metadata.
- Produces: delivery helpers for materialization, claiming, completion, failure, summary counts, and safe DTO mapping.

- [ ] Write failing repository tests with mocked Mongo collection methods for index creation, safe DTO mapping, dedupe bulk upserts, claim filter, success update, retry update, and dead-letter update.
- [ ] Run: `pnpm test src/lib/notifications/__tests__/repositories.test.ts`
- [ ] Implement repository helpers.
- [ ] Call `ensureNotificationIndexes(db)` from `ensureSystemConfig()`.
- [ ] Run repository and seed tests.
- [ ] Commit: `feat: add notification repositories`

## Task 4: Telegram Adapter and Registry

**Files:**

- Create: `src/lib/notifications/adapters/telegram.ts`
- Create: `src/lib/notifications/adapters/registry.ts`
- Test: `src/lib/notifications/adapters/__tests__/telegram.test.ts`

**Interfaces:**

- Consumes: `NotificationAdapter`, `TelegramRuntimeConfig`, `NotificationMessage`.
- Produces: `telegramAdapter`, `getNotificationAdapter(type)`.

- [ ] Write failing fetch-mocked tests for `getMe`, test message, send message ID, invalid token, invalid chat, 429 retry metadata, 5xx, network failure, timeout, malformed response, and token redaction.
- [ ] Run: `pnpm test src/lib/notifications/adapters/__tests__/telegram.test.ts`
- [ ] Implement adapter and registry.
- [ ] Run adapter tests until green.
- [ ] Commit: `feat: add telegram notification adapter`

## Task 5: Recurring Expenses Source

**Files:**

- Create: `src/lib/notifications/sources/recurring-expenses.ts`
- Create: `src/lib/notifications/sources/registry.ts`
- Test: `src/lib/notifications/sources/__tests__/recurring-expenses.test.ts`

**Interfaces:**

- Consumes: source contracts and time utilities.
- Produces: `resolveRecurringExpenseNotificationPreferences(payload, defaultOffsetsDays): NotificationPreferences`
- Produces: `recurringExpensesNotificationSource`
- Produces: `notificationSources`

- [ ] Write failing tests for explicit enabled, explicit disabled, legacy true, legacy false, missing legacy field, invalid module defaults, multiple offsets, inactive expense, malformed renewal dates, and activation summary counts.
- [ ] Run: `pnpm test src/lib/notifications/sources/__tests__/recurring-expenses.test.ts`
- [ ] Implement resolver, source candidate collection, source activation summary, and source registry.
- [ ] Run source tests until green.
- [ ] Commit: `feat: add recurring expense notification source`

## Task 6: Dispatcher and Scheduled Function

**Files:**

- Create: `src/lib/notifications/dispatcher.ts`
- Create: `netlify/functions/notifications-dispatch.mts`
- Modify: `netlify.toml`
- Test: `src/lib/notifications/__tests__/dispatcher.test.ts`

**Interfaces:**

- Consumes: repositories, adapter registry, source registry.
- Produces: `runNotificationDispatch(options?: { now?: Date; batchSize?: number }): Promise<NotificationDispatchSummary>`

- [ ] Write failing dispatcher tests for disabled globals, no channels, candidate expansion, explicit routing, dedupe, retry, permanent failure, broken channel isolation, source failure isolation, and batch limits.
- [ ] Run: `pnpm test src/lib/notifications/__tests__/dispatcher.test.ts`
- [ ] Implement dispatcher.
- [ ] Add the hourly Netlify scheduled function and `netlify.toml` schedule.
- [ ] Run dispatcher tests until green.
- [ ] Commit: `feat: add notification dispatcher`

## Task 7: Protected API Routes

**Files:**

- Create: `src/app/api/notifications/overview/route.ts`
- Create: `src/app/api/notifications/settings/route.ts`
- Create: `src/app/api/notifications/channels/route.ts`
- Create: `src/app/api/notifications/channels/[id]/route.ts`
- Create: `src/app/api/notifications/channels/[id]/test/route.ts`
- Create: `src/app/api/notifications/deliveries/route.ts`
- Create: `src/app/api/notifications/dispatch/route.ts`
- Modify: `src/proxy.ts`
- Test: matching route tests under `src/app/api/notifications/**/__tests__/route.test.ts`
- Test: `src/app/__tests__/proxy.test.ts`

**Interfaces:**

- Consumes: schemas, repositories, crypto, adapter registry, dispatcher.
- Produces: protected notification API family.

- [ ] Write failing route tests for validation, safe DTOs, failed connection not persisted, omitted-token updates, delivery limit clamping, manual dispatch delegation, and proxy protection.
- [ ] Run route tests and proxy tests.
- [ ] Implement handlers with defense-in-depth cookie verification.
- [ ] Run route tests until green.
- [ ] Commit: `feat: add notification api routes`

## Task 8: Shared Offset UI and Settings Tab

**Files:**

- Create: `src/components/notifications/RelativeDateNotificationFields.tsx`
- Create: `src/components/notifications/__tests__/RelativeDateNotificationFields.test.tsx`
- Create: `src/components/settings/NotificationSettingsTab.tsx`
- Create: `src/components/settings/__tests__/NotificationSettingsTab.test.tsx`
- Modify: `src/app/admin/settings/page.tsx`

**Interfaces:**

- Consumes: API DTOs and schemas from prior tasks.
- Produces: controlled offset editor and Notifications settings tab.

- [ ] Write failing component tests for presets, custom offset normalization, empty offset validation, loading state, missing encryption guidance, Telegram connect/test/enable/delete actions, direct tab navigation, activation confirmation, recent activity, and manual dispatch.
- [ ] Run component tests.
- [ ] Implement components and settings page integration.
- [ ] Run component tests until green.
- [ ] Commit: `feat: add notification settings ui`

## Task 9: Recurring Expenses UI Integration

**Files:**

- Modify: `src/modules/recurring-expenses/AdminView.tsx`
- Modify: `src/modules/recurring-expenses/README.md`
- Test: `src/modules/recurring-expenses/__tests__/AdminView.test.tsx`

**Interfaces:**

- Consumes: `RelativeDateNotificationFields` and recurring resolver.
- Produces: item payloads with synchronized `enable_reminders` and nested `notifications`.

- [ ] Write failing tests for default offset settings, rendering preset fields when notify is checked, custom offset selection, nested payload save, legacy edit inherited offsets, and settings deep link note.
- [ ] Run recurring module tests.
- [ ] Implement module defaults and item form integration.
- [ ] Run recurring module tests until green.
- [ ] Commit: `feat: connect recurring expenses notifications`

## Task 10: Documentation and Full Verification

**Files:**

- Modify: `.env.local.example`
- Modify: `README.md`
- Modify: `src/lib/README.md`
- Modify: `AGENTS.md`

**Interfaces:**

- Consumes: completed implementation.
- Produces: setup, architecture, and agent guidance documentation.

- [ ] Update docs with `NOTIFICATION_ENCRYPTION_KEY`, Telegram setup, protected routes, collections, and rollout notes.
- [ ] Run: `pnpm format`
- [ ] Run: `pnpm check`
- [ ] Start the app with `pnpm dev` if environment is available.
- [ ] Use Playwright to inspect `/admin/settings?tab=notifications` and `/admin/recurring-expenses` on desktop and mobile if admin credentials are available.
- [ ] Commit: `docs: document notification platform`
