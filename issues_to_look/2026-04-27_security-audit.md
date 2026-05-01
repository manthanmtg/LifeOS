# Security audit

Selected prompt: `prompts/security_enhancer.md`

Date: 2026-04-27

## Summary

Audited `src/proxy.ts`, `src/lib/auth.ts`, `next.config.ts`, existing security
audit notes, and API routes under `src/app/api`.

This run closed one narrow validation gap in the non-production AI usage debug
endpoint.

## What looks good

- `src/proxy.ts` continues to protect admin routes, sensitive API prefixes,
  content mutations, widget summaries, import/export, bills, database stats,
  module info, AI usage routes, and GET metrics.
- Mutating API requests still receive Origin-vs-Host CSRF validation in
  middleware.
- `src/lib/auth.ts` verifies JWT issuer and audience.
- Baseline hardening headers are present in `next.config.ts`.
- Existing open findings for CSP/HSTS and backup import revalidation are already
  documented in `issues_to_look/2026-04-23_security-audit.md`.

## Resolved in this run

### Add Zod validation to `POST /api/ai-usage/debug`

File:

- `src/app/api/ai-usage/debug/route.ts`

Problem:

- The development-only debug POST route read `provider_id` directly from
  `request.json()` and relied on manual checks plus the broad catch block.
  Malformed payloads could be handled as generic server errors instead of
  explicit validation failures.

Fix:

- Added a small Zod schema for the request body.
- Return `ApiValidationError` for malformed payloads before any database access.
- Added a regression test covering the malformed payload path.

Why this was safe:

- The endpoint remains disabled in production and admin-only in development.
- The fix changes only validation behavior for malformed request bodies.

## Verification

- `pnpm vitest run src/app/api/ai-usage/debug/__tests__/route.test.ts` - PASS

## Follow-up run (2026-05-01 04:45 UTC)

Selected prompt: `prompts/security_enhancer.md`

Files:

- `src/app/api/content/route.ts`
- `src/app/api/content/[id]/route.ts`

Problem:

- Content create and update handlers validated module payloads but accepted any
  supplied `is_public` value. A non-boolean value could be persisted into the
  visibility field on authenticated writes.

Fix:

- Reject non-boolean `is_public` values before database writes.
- Added regression tests for both create and update handlers.

Verification:

- `pnpm vitest run src/app/api/content/__tests__/route.test.ts src/app/api/content/[id]/__tests__/route.test.ts` - PASS

## Follow-up run (2026-05-01 16:35 UTC)

Selected prompt: `prompts/security_enhancer.md`

Files:
- `src/app/api/ai-usage/sync/route.ts`

Problem:
- The `POST` route extracted `provider_id` and `days` from `request.json()` directly without Zod schema validation, allowing potentially malformed types (e.g. strings where numbers were expected) to be processed before hitting database logic.

Fix:
- Added inline Zod schema validation (`z.object({...}).safeParse`) for the request body.
- Return standard `ApiValidationError` if the payload structure is invalid.

Verification:
- `pnpm check` - PASS