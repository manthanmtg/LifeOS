# Security audit

Selected prompt: `prompts/security_enhancer.md`

Date: 2026-04-26

## Summary

Audited `src/proxy.ts`, `src/lib/auth.ts`, `next.config.ts`, and API routes under `src/app/api`.

This run fixed a narrow error-masking gap in the non-production AI usage debug endpoint.

## What looks good

- `src/proxy.ts` protects admin routes, sensitive API routes, content mutations, widgets, bills, import/export, and AI usage endpoints.
- Mutating API requests receive Origin-vs-Host CSRF validation in middleware.
- `src/lib/auth.ts` verifies JWT issuer and audience.
- Core content, system, bills, metrics, and AI provider write routes use schema validation or explicit allowlists before persistence.
- Public content reads filter private data for non-admin callers.

## Resolved in this run

### Mask internal debug route exceptions

File:

- `src/app/api/ai-usage/debug/route.ts`

Problem:

The non-production AI usage debug route returned raw caught exception messages to the client. If a database or provider call threw a sensitive message, that text could be reflected in the API response.

Fix:

- Log caught exceptions server-side.
- Return generic `Debug failed` and `Test failed` messages to clients.
- Added regression coverage in `src/app/api/ai-usage/debug/__tests__/route.test.ts`.

## Existing open findings not duplicated

- CSP and HSTS policy review remains documented in `issues_to_look/2026-04-23_security-audit.md`.
- Import backup content revalidation remains documented in `issues_to_look/2026-04-23_security-audit.md`.

## Follow-up run

Selected prompt: `prompts/security_enhancer.md`

This run addressed the narrow, reviewable portion of the existing header
finding by adding baseline browser hardening headers in `next.config.ts`:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

CSP and HSTS were left documented for human review because they require
deployment-aware policy decisions.

## Verification

- Red: `pnpm vitest run src/app/api/ai-usage/debug/__tests__/route.test.ts` failed because raw internal error messages were returned.
- Green: `pnpm vitest run src/app/api/ai-usage/debug/__tests__/route.test.ts` passed after masking responses.
- Red: `pnpm vitest run src/test/security-headers.test.ts` failed because `nextConfig.headers` had no global headers.
- Green: `pnpm vitest run src/test/security-headers.test.ts` passed after adding the baseline headers.
