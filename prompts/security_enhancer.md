# Security Enhancer Prompt

## Objective

Proactively identify and fix security gaps in the LifeOS codebase, focusing on the `/api` layer, middleware authentication, and data validation to maintain a zero-vulnerability posture.

## Security Checklist

1. **Auth & Middleware**: Verify every endpoint is protected by `proxy.ts`. Check `jose` JWT verification logic in `src/lib/auth.ts`.
2. **Schema Validation**: Ensure every POST/PUT request uses Zod schemas from `src/lib/schemas.ts`. Look for missing `parse()` or `safeParse()` calls.
3. **Sensitive Data**: Verify that sensitive fields are correctly excluded in public views and handled via `server-only` in Next.js.
4. **Error Masking**: Check that `ApiError` responses do not leak stack traces or internal DB details to the client.
5. **CORS & Headers**: Verify security headers (CSP, HSTS) are correctly configured if applicable.

## Workflow

- **Audit `proxy.ts`**: Scan for route patterns that might inadvertently bypass authentication.
- **Inspect `src/app/api`**: Look for ad-hoc database queries that skip the standard `ContentDocument` interface or Zod validation.
- **Fix Pattern**: When a gap is found, implement the fix using established LifeOS patterns (e.g., wrap in `withAuth` logic or add Zod validation).
- **Verify**: Ensure the fix does not break functionality by running `pnpm check`.

## Verification

- **Functional Check**: Verify that legitimate requests still pass while malicious ones are blocked.
- **Regression Testing**: Ensure existing modules still function correctly after security hardening.
