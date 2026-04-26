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

## Follow-up run (2026-04-26 18:45 UTC)

Selected prompt: `prompts/security_enhancer.md`

Scope audited:

- `src/proxy.ts`
- `src/lib/auth.ts`
- `src/lib/api-response.ts`
- `next.config.ts`
- API routes under `src/app/api`

Result:

- No new autonomous-safe security fix was identified.
- Existing middleware still protects admin routes, sensitive API prefixes,
  content mutations, widget summaries, import/export, bills, database stats,
  AI usage routes, and GET metrics.
- Core write routes continue to use schema validation or explicit allowlists
  before persistence.
- Public content reads continue to restrict non-admin callers to
  `is_public: true`, with item reads re-checking private-document access.
- Baseline hardening headers are present in `next.config.ts`.

No-op rationale:

- CSP and HSTS remain deployment-policy decisions already documented in
  `issues_to_look/2026-04-23_security-audit.md`.
- Import backup content revalidation remains a structural compatibility change
  already documented in `issues_to_look/2026-04-23_security-audit.md`.
- Duplicating either finding would add noise without making the project safer.

## Follow-up run (Content Update Schema Validation)

Selected prompt: `prompts/security_enhancer.md`

Files:
- `src/app/api/content/[id]/route.ts`

Problem:
- The PUT route for updating content allowed bypassing Zod schema validation if the `module_type` in the database was missing from the `SchemaRegistry`. While POST explicitly prevented inserting unknown module types, PUT did not enforce this same check, potentially allowing unvalidated arbitrary payloads into the database for existing content.

Fix:
- Enforced schema existence checks in the PUT handler (`if (payload !== undefined && !schema)`).
- Required `schema.parse(payload)` execution when updating content payloads.

Verification:
- `pnpm check` - PASS

## Follow-up run (2026-04-26 20:45 UTC)

Selected prompt: `prompts/security_enhancer.md`

Scope audited:

- `src/proxy.ts`
- `src/lib/auth.ts`
- `src/lib/api-response.ts`
- `next.config.ts`
- API routes under `src/app/api`
- Existing security audit notes in `issues_to_look/`

Result:

- No new autonomous-safe security fix was identified.
- Middleware still protects admin routes, sensitive API prefixes, content
  mutations, widget summaries, import/export, bills, database stats, AI usage
  routes, module info, and GET metrics.
- JWT verification still enforces issuer and audience.
- Error responses reviewed in this pass continue to use generic client-facing
  messages while logging internal details server-side.
- AI usage provider update validation still covers the merged persisted shape,
  including optional plan, budget, organization name, and sync timestamp fields.

No-op rationale:

- CSP and HSTS remain deployment-policy decisions already documented in
  `issues_to_look/2026-04-23_security-audit.md`.
- Backup import revalidation remains a structural compatibility change already
  documented in `issues_to_look/2026-04-23_security-audit.md`.
- Both remaining findings need an explicit product/deployment decision or a
  separately scoped test plan, so this run did not change security-critical
  code.

## Follow-up run (Zod schema validation for Bill endpoints)

Selected prompt: `prompts/security_enhancer.md`

Scope audited:
- `src/app/api/bills` endpoints

Problem:
- `src/app/api/bills/[id]/attachments/route.ts`, `src/app/api/bills/[id]/move/route.ts`, and `src/app/api/bills/folders/[id]/move/route.ts` were missing Zod `safeParse()` calls for incoming `POST` and `PUT` request bodies, instead relying on direct type assertions (`as { ... }`) or manual checking. This bypassed strict schema validation.

Fix:
- Replaced manual assertions with inline `z.object(...).safeParse()` validation.
- Returned standard `ApiValidationError` responses on failure.

Verification:
- `pnpm check` - PASS
