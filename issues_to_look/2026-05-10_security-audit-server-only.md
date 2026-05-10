# Security audit

Selected prompt: `prompts/security_enhancer.md`

Date: 2026-05-10

## Summary

Audited `src/proxy.ts`, API routes in `src/app/api`, and security configuration. No trivial validation gaps were found; all JSON parsing and inputs are correctly guarded with schemas and error boundaries. 

However, a structural security gap was identified regarding client-side bundling protection.

## Open Finding: Missing `server-only` directive

Files affected:
- `src/lib/mongodb.ts`
- `src/lib/auth.ts`
- `src/lib/metrics-cache.ts`

Problem:
The security enhancer prompt recommends verifying that sensitive fields and data access files are handled via the `server-only` directive in Next.js to strictly prevent them from accidentally leaking into client-side bundles. Currently, the `server-only` package is not installed in `package.json`, and the directive is absent across the codebase.

Why I held back:
Fixing this requires installing a new npm package (`server-only`), updating `pnpm-lock.yaml`, and adding the import statement to multiple critical backend files. This qualifies as a structural build-level change rather than a trivial, ≤15 lines fix, which exceeds the safe threshold for an autonomous run.

Suggested follow-up:
- Run `pnpm add server-only`.
- Add `import "server-only";` to the top of sensitive library files like `auth.ts` and `mongodb.ts`.
