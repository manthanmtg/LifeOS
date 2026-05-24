---
id: security-enhancer
title: Security Enhancer Prompt
category: security
enabled: true
autonomousSafe: true
---

# Security Enhancer Prompt

## Objective

Proactively **audit** security in the LifeOS codebase. Because security changes carry high risk, this prompt **strongly prefers documenting findings** over making code changes.

## Philosophy

Security is the one area where a bad autonomous fix is worse than no fix at all. Audit thoroughly, fix only trivial gaps, and document everything else for human review.

## Security Checklist

1. **Auth & Middleware**: Verify admin-only and mutating endpoints are protected by `proxy.ts`, while intentionally public read endpoints remain limited to their documented public data. Check `jose` JWT verification logic in `src/lib/auth.ts`.
2. **Schema Validation**: Ensure every POST/PUT request uses Zod schemas from `src/lib/schemas.ts`. Look for missing `parse()` or `safeParse()` calls.
3. **Sensitive Data**: Verify that sensitive fields are correctly excluded in public views and handled via `server-only` in Next.js.
4. **Error Masking**: Check that `ApiError` responses do not leak stack traces or internal DB details to the client.
5. **CORS & Headers**: Verify security headers (CSP, HSTS) are correctly configured if applicable.

## Workflow

- **Audit `proxy.ts`**: Scan for route patterns that might inadvertently bypass authentication for protected admin/API families documented in `AGENTS.md`; do not treat intentionally public GET routes as findings unless they expose private data.
- **Inspect `src/app/api`**: Look for ad-hoc database queries that skip the standard `ContentDocument` interface or Zod validation.
- **Check existing audit notes**: Read open `issues_to_look/*security-audit*.md` files before documenting anything. Do not create a duplicate note for an already-recorded security finding.
- **Document new findings only**: If you find a new issue that cannot be safely fixed, write it to `issues_to_look/YYYY-MM-DD_security-audit.md`; otherwise append a concise follow-up to the existing relevant note.
- **Fix ONLY trivial gaps**: Missing Zod `safeParse()` on a single route, a leaked stack trace in an error response, etc. The fix must be ≤15 lines.
- **Verify**: Run `pnpm check` to ensure nothing breaks.

## No-Op Protocol (Default Stance)

- If everything looks secure, **stop** — log "security audit clean" and do nothing.
- If a gap requires structural changes (e.g., reworking auth middleware), **always** log to `issues_to_look/` and do NOT attempt the fix.
- If the only gaps are already recorded in open audit notes, **stop** — do not create another dated audit file.
- When in doubt, document. A logged issue is infinitely better than a broken auth system.

## Verification

- **Functional Check**: Verify that legitimate requests still pass while malicious ones are blocked.
- **Regression Testing**: Ensure existing modules still function correctly after security hardening.

## Issue Cleanup

If an issue from `issues_to_look/` is resolved, or if it is found to be already resolved, move the issue file to the `issues_to_look/resolved/` directory to keep things clean.
