# Security audit

Selected prompt: `prompts/security_enhancer.md`

Date: 2026-04-22

## Summary

Audited `src/middleware.ts`, `src/lib/auth.ts`, and the routes under `src/app/api`.

A trivial gap was fixed in `src/middleware.ts`: `GET /api/bills*` now requires admin auth like the rest of the Bills module. The remaining findings below still need deliberate follow-up rather than a <=15-line low-risk patch.

## What looks good

- `src/middleware.ts` protects `/admin/*` and the sensitive API surfaces that mutate data or expose admin-only data.
- `src/lib/auth.ts` verifies JWTs with explicit issuer and audience checks.
- Public `content` reads re-check admin state server-side before exposing private records.
- Core content and bills write routes use Zod validation before persistence.

## Findings

### Resolved in this run: public `GET /api/bills*` exposure

Files:

- `src/middleware.ts`
- `src/app/api/bills/route.ts`
- `src/app/api/bills/[id]/route.ts`
- `src/app/api/bills/folders/route.ts`

Problem:

The Bills module is registered as `defaultPublic: false`, but middleware only protected non-`GET` bill routes. That meant unauthenticated users could read bill listings, bill details, and folder structure.

Fix:

- Changed middleware protection from "non-GET bills routes only" to "all `/api/bills*` routes".

Why this was safe:

- The admin UI already fetches these routes with the auth cookie.
- Bills have no public views in the registry or module structure.

### 1. Missing explicit security headers

Files:

- `next.config.ts`
- `src/middleware.ts`

There is no app-level configuration for headers such as CSP, HSTS, `X-Frame-Options`, `Referrer-Policy`, or `Permissions-Policy`. That leaves browser-side hardening to platform defaults instead of project-owned policy.

Why I held back:
Adding these headers safely needs a full pass over inline scripts, embedding requirements, and deployment behavior. A rushed CSP or HSTS change is easy to break.

Suggested follow-up:

- Add a reviewed header policy in `next.config.ts` or middleware.
- Roll out CSP in report-only mode first if possible.

### 2. `PUT /api/system` accepts arbitrary `*Settings` payloads without schema validation

File:

- `src/app/api/system/route.ts`

The route allowlists known top-level fields, but it also accepts any key whose name ends with `Settings`. Those values are written directly to MongoDB with no Zod validation or shape enforcement.

Risk:

- Authenticated admin clients can persist malformed or unexpected config blobs.
- Future code may trust those settings objects and fail open on bad structure.

Why I held back:
The safe fix is to introduce a real schema for system settings and decide which module settings are intentionally extensible. That is larger than the prompt's trivial-fix threshold.

### 3. `POST /api/import` restores raw documents without schema revalidation

File:

- `src/app/api/import/route.ts`

The import route checks that collections are arrays of plain objects and enforces size limits, but imported `content` documents are inserted directly after stripping `_id`. The route does not revalidate `module_type`, `payload`, or document shape against `SchemaRegistry`.

Risk:

- A backup file can repopulate the database with invalid or stale document shapes.
- Downstream code may assume imported records satisfy current schemas when they do not.

Why I held back:
Import validation touches backup compatibility, migration behavior, and failure semantics. That needs a scoped implementation and tests.

## Notes

- The prompt mentions auditing `proxy.ts`, but this repo uses `src/middleware.ts`.
- I did not find an existing `issues_to_look` entry covering these exact findings.

## Verification

Ran `pnpm check` after the audit report was added.

Result:

- `lint` completed with existing warnings.
- `typecheck` failed on current `main` at `src/app/api/auth/login/__tests__/route.test.ts:30` with `TS2540: Cannot assign to 'NODE_ENV' because it is a read-only property.`

This failure appears unrelated to the audit report added in this run, but it prevented a clean verification pass.
