# Partial Content Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Health sub-record updates small enough to pass through nginx by sending only changed payload fields.

**Architecture:** Add a backward-compatible `PATCH` handler to the shared content item route. It merges and validates partial payloads server-side, then persists only validated top-level fields through MongoDB dotted paths. Migrate Health collection mutations to that contract while retaining full `PUT` replacement behavior.

**Tech Stack:** Next.js 16 App Router, TypeScript, Zod 4, MongoDB driver 7, React 19, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-08-19-partial-content-updates-design.md`

---

### Task 1: Specify the partial content API with failing tests

**Files:**

- Modify: `src/app/api/content/[id]/__tests__/route.test.ts`

- [ ] **Step 1: Add a test for a successful payload fragment**

Import `PATCH`, configure a `health_profile` fixture with a large `profile_pic`, and send `{ payload: { vaccinations: [] } }`. Assert that MongoDB receives `$set` containing `payload.vaccinations` and `updated_at`, but no `payload.profile_pic` or whole `payload` field.

- [ ] **Step 2: Add validation tests**

Assert `400` responses for a primitive payload fragment, an unknown payload key, an empty patch, and a fragment that makes the merged payload invalid.

- [ ] **Step 3: Run the route test and verify RED**

Run `pnpm test -- 'src/app/api/content/[id]/__tests__/route.test.ts'` and confirm failure because `PATCH` is not exported.

### Task 2: Implement validated merge-style PATCH

**Files:**

- Modify: `src/app/api/content/[id]/route.ts`

- [ ] **Step 1: Parse and validate the patch envelope**

Reject invalid IDs, non-boolean `is_public`, non-plain-object `payload`, and requests containing neither supported field.

- [ ] **Step 2: Merge and validate payload fragments**

Load the existing document, merge `{ ...existing.payload, ...payload }`, run the registered module schema, and reject keys absent from the parsed result so unknown fields cannot be silently dropped.

- [ ] **Step 3: Persist only supplied fields**

Construct `$set` with `updated_at`, optional `is_public`, and one `payload.<key>` entry per supplied validated key. Call `updateOne` without replacing the complete payload.

- [ ] **Step 4: Run the route test and verify GREEN**

Run `pnpm test -- 'src/app/api/content/[id]/__tests__/route.test.ts'` and confirm all cases pass.

### Task 3: Specify the Health regression with a failing test

**Files:**

- Modify: `src/modules/health/__tests__/AdminView.test.tsx`

- [ ] **Step 1: Add a vaccination persistence regression**

Render a profile containing `profile_pic.data`, enter the vaccination form, and save a vaccination. Assert that the write uses `PATCH`, contains only `payload.vaccinations`, and does not contain `profile_pic`.

- [ ] **Step 2: Run the component test and verify RED**

Run `pnpm test -- src/modules/health/__tests__/AdminView.test.tsx` and confirm it fails because the current write uses `PUT` with the complete profile payload.

### Task 4: Migrate Health sub-record mutations

**Files:**

- Modify: `src/modules/health/AdminView.tsx`

- [ ] **Step 1: Narrow the update helper contract**

Change `updatePayload` to accept `Partial<HealthPayload>`, use `PATCH`, send only that fragment, and throw when `response.ok` is false.

- [ ] **Step 2: Send only changed collections**

Update generic sub-record save/delete calls to pass `{ [field]: arr }`. Change the vaccination workflow to `PATCH` with `{ payload: { vaccinations } }` and preserve its existing error handling and refresh behavior.

- [ ] **Step 3: Run Health tests and verify GREEN**

Run `pnpm test -- src/modules/health/__tests__/AdminView.test.tsx` and confirm the regression and existing save-state test pass.

### Task 5: Verify the complete change

**Files:**

- Review all files changed above.

- [ ] **Step 1: Run focused tests together**

Run `pnpm test -- 'src/app/api/content/[id]/__tests__/route.test.ts' src/modules/health/__tests__/AdminView.test.tsx` and confirm zero failures.

- [ ] **Step 2: Run repository verification**

Run `pnpm check` and confirm lint, typecheck, build, and tests all exit successfully.

- [ ] **Step 3: Inspect the final diff**

Confirm `PUT` compatibility is unchanged, Health writes omit unrelated fields, no nginx configuration was changed, and no unrelated worktree changes were modified.
