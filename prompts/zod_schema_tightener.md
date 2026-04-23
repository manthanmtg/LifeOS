# Zod Schema Tightener Prompt

## Objective

Audit `src/lib/schemas.ts` or a module integration to ensure boundaries are tightly defended by precise Zod schemas, converting loose string typings into highly constrained validators.

## Philosophy

The LifeOS application utilizes a polymorphic MongoDB layer. Everything lives in the `content` collection. Zod is the only gatekeeper preventing malformed data from irreparably corrupting the persistence layer. "Type safe" isn't enough—we need runtime payload integrity.

## Workflow

### 1. Pick a Target

- Scrutinize `src/lib/schemas.ts`. Look for `SchemaRegistry` entries corresponding to different modules.
- Or pick a module's frontend create/edit form (`AdminView.tsx` or `components/`).

### 2. Audit (Pick 1–3 Issues)

Check for loose validations:
- **Missing Constraints**: Usage of `.string()` without `.min()`, `.max()`, or `trim()`.
- **Loose Enums**: String fields that describe a set of known values (e.g. `status`, `category`) that aren't utilizing `.enum()` or `.nativeEnum()`.
- **Bad Formats**: URL fields without `.url()`, email fields without `.email()`, or id-like fields without Regex validation.
- **Form Drift**: Discrepancies between what the `AdminView` frontend form submits and what the backend route expects.

### 3. Fix (Small Scope)

- Add strict `.max()` lengths to text inputs, ensure numbers have `.min(0)` or `.nonnegative()` if applicable.
- Convert arbitrary string fields into strict Zod enums if the possibilities are bounded.
- Update matching TypeScript types or frontend HTML `maxLength` / `min` / `max` elements to match the new strictness.

### 4. No-Op Conditions

- If the target schemas are perfectly strict with adequate bounds and enums, log "Schemas are bulletproof" and stop.
- If tightening a schema would break a significant amount of existing un-migrated production data in MongoDB, back away and log a migration plan to `issues_to_look/`.

### 5. Verify

- Run `pnpm check` (crucial, as Zod inferencing heavily dictates frontend React types).
- If tests exist for the API payload, ensure they still pass or update them.

### 6. Commit

- Commit with a message like: `chore(schemas): tighten expense schema with max limits and currency enums`

## Issue Cleanup

If an issue from `issues_to_look/` is resolved, or if it is found to be already resolved, move the issue file to the `issues_to_look/resolved/` directory to keep things clean.
