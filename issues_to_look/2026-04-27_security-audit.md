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
