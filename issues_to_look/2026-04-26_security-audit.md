# Security audit

Selected prompt: `prompts/security_enhancer.md`

Date: 2026-04-26

## Summary

Audited `src/proxy.ts`, `src/lib/auth.ts`, `next.config.ts`, and API routes under `src/app/api`.

This run focused on masking internal and external error messages across multiple AI usage API routes.

## What looks good

- `src/proxy.ts` protects admin routes, sensitive API routes, content mutations, widgets, bills, import/export, and AI usage endpoints.
- Mutating API requests receive Origin-vs-Host CSRF validation in middleware.
- `src/lib/auth.ts` verifies JWT issuer and audience.
- Core content, system, bills, metrics, and AI provider write routes use schema validation or explicit allowlists before persistence.
- Public content reads filter private data for non-admin callers.

## Resolved in this run

### Mask internal and external error messages in AI usage routes

Files:

- `src/app/api/ai-usage/limits/route.ts`
- `src/app/api/ai-usage/sync/route.ts`
- `src/app/api/ai-usage/debug/route.ts` (inner catch blocks)

Problem:

Several API routes in the AI usage module were leaking internal exception messages (e.g., from database failures) or external API error messages (e.g., from OpenAI/Anthropic) directly to the client. This could expose sensitive system details.

Fix:

- Replaced dynamic error messages (`error.message`) with generic, safe messages ("Failed to fetch limits", "Sync failed", "Failed to fetch debug info").
- Logged all original error details to the server console for debugging.
- Created regression tests for `limits` and `sync` routes.
- Updated existing tests for the `debug` route to cover inner error masking.

## Existing open findings not duplicated

- CSP and HSTS policy review remains documented in `issues_to_look/2026-04-23_security-audit.md`.
- Import backup content revalidation remains documented in `issues_to_look/2026-04-23_security-audit.md`.

## Follow-up run (Baseline Headers)

This run addressed the narrow, reviewable portion of the existing header
finding by adding baseline browser hardening headers in `next.config.ts`:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## Verification

- `pnpm vitest run src/app/api/ai-usage/debug/__tests__/route.test.ts` - PASS
- `pnpm vitest run src/app/api/ai-usage/limits/__tests__/route.test.ts` - PASS
- `pnpm vitest run src/app/api/ai-usage/sync/__tests__/route.test.ts` - PASS
- `pnpm check` - PASS
