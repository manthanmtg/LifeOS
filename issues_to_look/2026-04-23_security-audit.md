# Security audit

Selected prompt: `prompts/security_enhancer.md`

Date: 2026-04-23

## Summary

Audited `src/proxy.ts`, `src/lib/auth.ts`, and the routes under `src/app/api`.

This run closed a trivial gap in `src/app/api/system/route.ts`: request bodies are now schema-validated and module-specific `*Settings` are enforced to be objects.

## What looks good

- `src/proxy.ts` protects `/admin/*` and the sensitive API surfaces that mutate data or expose admin-only data, including all `/api/bills*` routes.
- `src/lib/auth.ts` verifies JWTs with explicit issuer and audience checks.
- Public `content` reads re-check admin state server-side before exposing private records.
- Core content and bills write routes use Zod validation before persistence.
- `POST /api/auth/login` uses schema validation (added in a previous run).

## Resolved findings

### Resolved in this run: missing schema validation on `PUT /api/system`

File:

- `src/app/api/system/route.ts`

Problem:

The route allowlisted known top-level fields, but it also accepted any key whose name ended with `Settings`. Those values were written directly to MongoDB with no Zod validation or shape enforcement.

Fix:

- Introduced `SystemUpdateSchema` in `src/lib/schemas.ts`.
- Validated request body against the schema.
- Explicitly enforced that any `*Settings` key must be a non-null object.

Why this was safe:

- The route already allowlisted these keys; the fix just adds shape validation.
- Genuine settings objects from the admin UI continue to work.

### Already resolved: missing schema validation on `POST /api/auth/login`

File:

- `src/app/api/auth/login/route.ts`

Problem:

The login route read `request.json()` directly and only handled malformed payloads via the broad catch block.

Fix:

- Added a minimal Zod schema for the login request body.

## Open findings

### 1. CSP and HSTS policy still need review

Files:

- `next.config.ts`
- `src/proxy.ts`

Baseline browser hardening headers were added in a later run:
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a
minimal `Permissions-Policy`.

CSP and HSTS remain intentionally unset because both require deployment-aware
policy decisions.

Suggested follow-up:

- Add a reviewed CSP and HSTS policy in `next.config.ts` or middleware.

### 2. `POST /api/import` restores raw documents without schema revalidation

File:

- `src/app/api/import/route.ts`

The import route checks that collections are arrays of plain objects and enforces size limits, but imported `content` documents are inserted directly after stripping `_id`. The route does not revalidate `module_type`, `payload`, or document shape against `SchemaRegistry`.

Risk:

- A backup file can repopulate the database with invalid or stale document shapes.

Why I held back:
Import validation touches backup compatibility, migration behavior, and failure semantics. That needs a scoped implementation and tests.

## Verification

- Created `src/app/api/system/__tests__/route.test.ts` to reproduce the gap and verify the fix.
- Ran `pnpm vitest run src/app/api/system/__tests__/route.test.ts`.
- Ran `pnpm check`.

Result:

- `pnpm check` passed.
