# Vaccination Multi-Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let one vaccination administration update selected Health profiles while preserving per-profile history and schedules.

**Architecture:** Each vaccination remains embedded in its profile. Optional `series_id` links replacement doses within one profile and optional `campaign_id` links a shared administration across profiles; save logic mutates selected profiles independently through the existing content API.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zod 4, Vitest 4, Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-08-18-vaccination-workflow-design.md`

## Global Constraints

- Existing vaccination records and APIs remain valid without migration.
- A completed repeat clears only its predecessor's `next_due` and creates one new current record.
- Shared administration details are copied into separate profile records; no profile shares mutable record state with another.
- Use semantic colours, visible form labels, and touch-friendly controls.

---

### Task 1: Linkable vaccination schema and repeat transition helpers

**Files:**

- Modify: `src/modules/health/components/types.ts`
- Modify: `src/lib/schemas.ts`
- Modify: `src/modules/health/components/helpers.ts`
- Test: `src/modules/health/__tests__/helpers.test.ts`
- Test: `src/lib/__tests__/schemas.test.ts`

- [ ] Write failing tests for a repeat transition that clears the predecessor due date and preserves a shared series id.
- [ ] Run `pnpm test src/modules/health/__tests__/helpers.test.ts src/lib/__tests__/schemas.test.ts` and confirm failure.
- [ ] Add optional ids, Zod validation, and pure helper functions that produce a previous history record plus a new current record.
- [ ] Re-run the focused tests until green.

### Task 2: Bulk profile selection and atomic per-profile persistence

**Files:**

- Modify: `src/modules/health/AdminView.tsx`
- Test: `src/modules/health/__tests__/AdminView.test.tsx`

- [ ] Write a failing test that selects another profile and verifies separate PUT payloads containing one shared campaign id.
- [ ] Run the AdminView test and confirm failure.
- [ ] Add selected-profile state, profile selector UI, repeat transition logic, and a shared campaign id for a bulk save.
- [ ] Re-run the AdminView test until green.

### Task 3: Surface history and bulk entry point

**Files:**

- Modify: `src/modules/health/components/VaccinationsTab.tsx`
- Modify: `src/modules/health/AdminView.tsx`
- Test: `src/modules/health/__tests__/selectors.test.ts`

- [ ] Write a failing selector test confirming a replaced dose belongs in history while its current successor remains upcoming.
- [ ] Run selector tests and confirm failure.
- [ ] Add a Bulk vaccination action to the profile list and show history as prior-dose detail beneath the current vaccine series.
- [ ] Re-run focused tests, `pnpm typecheck`, and `pnpm lint`.
