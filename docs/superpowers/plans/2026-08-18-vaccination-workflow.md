# Vaccination Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an interval-driven, repeat-safe vaccination log with useful status grouping, attachments, and notification reminders.

**Architecture:** Keep `vaccinations` as backward-compatible embedded Health records. Isolate date/schedule and grouping operations in health helpers/selectors; keep the tab presentational, while `AdminView` owns record persistence. Extend the existing notification source registry instead of creating a second delivery system.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zod 4, Vitest 4, MongoDB driver, Tailwind CSS 4, Lucide.

**Spec:** `docs/superpowers/specs/2026-08-18-vaccination-workflow-design.md`

## Global Constraints

- Existing vaccination payloads must validate and render unchanged.
- `next_due` remains the authoritative due date.
- Use only semantic Tailwind colours and zinc tokens; no hardcoded colour names.
- Preserve the existing content API and notification dispatcher contracts.
- All interactive controls require visible labels or aria-labels and touch-friendly hit targets.

---

### Task 1: Backward-compatible scheduling helpers and schema

**Files:**

- Modify: `src/modules/health/components/types.ts`
- Modify: `src/lib/schemas.ts`
- Modify: `src/modules/health/components/helpers.ts`
- Test: `src/modules/health/__tests__/helpers.test.ts`
- Test: `src/lib/__tests__/schemas.test.ts`

**Interfaces:**

- Produces `VACCINE_REPEAT_INTERVAL_MONTHS`, `calculateNextDueDate`, `createVaccinationRepeatDraft`, and optional vaccination scheduling fields.

- [ ] Write failing tests for month interval calculation, custom/no-repeat handling, repeat-draft batch/attachment clearing, and new schema fields.
- [ ] Run the focused tests and confirm the expected missing-helper/schema failure.
- [ ] Add the optional fields, helper functions, and schema validation with limits: dose labels <= 100 chars; offsets 0–3650, maximum 10; attachments follow existing attachment schema.
- [ ] Re-run focused tests until green.

### Task 2: Vaccination grouping and accessible responsive list

**Files:**

- Modify: `src/modules/health/components/selectors.ts`
- Modify: `src/modules/health/components/VaccinationsTab.tsx`
- Test: `src/modules/health/__tests__/selectors.test.ts`

**Interfaces:**

- Consumes `Vaccination` schedule fields and `getDueStatus`.
- Produces `getVaccinationGroups(vaccinations)` and visible group headings/actions.

- [ ] Write failing selector tests proving overdue/due-soon, future-due, and history records are independently grouped and sorted.
- [ ] Run selector tests and confirm the missing grouping export failure.
- [ ] Implement grouping and replace hover-only duplicate controls with an explicit `Mark repeat done` primary action, a details toggle, and compact status-aware cards.
- [ ] Ensure details expose dose label, provider, batch, notes, attachments, schedule, and edit/delete controls without hiding essential actions behind hover.
- [ ] Re-run selector and component tests until green.

### Task 3: Interval-first add/edit/repeat workflow and attachments

**Files:**

- Modify: `src/modules/health/AdminView.tsx`
- Modify: `src/modules/health/components/VaccinationsTab.tsx`
- Test: `src/modules/health/__tests__/AdminView.test.tsx`

**Interfaces:**

- Consumes `createVaccinationRepeatDraft` and `calculateNextDueDate`.
- Produces `openVaccinationRepeatForm(vac)` and persisted attachment/schedule fields.

- [ ] Write failing component tests for an accessible Mark repeat done button and the prefilled repeat form behaviour.
- [ ] Run the AdminView test file and confirm the new assertion fails.
- [ ] Implement interval chips (No repeat, Custom date, 1m, 3m, 6m, 12m), resulting-date copy, optional dose/reminder/attachment details, presets, and repeat form behaviour.
- [ ] Retain edit behaviour for historical records; ensure repeat saves a new id and never copies batch number or attachments.
- [ ] Re-run AdminView tests until green.

### Task 4: Vaccination reminder notification source

**Files:**

- Create: `src/lib/notifications/sources/health.ts`
- Modify: `src/lib/notifications/sources/registry.ts`
- Test: `src/lib/notifications/sources/__tests__/health.test.ts`
- Test: `src/lib/notifications/sources/__tests__/registry.test.ts`

**Interfaces:**

- Produces `healthNotificationSource`, with `moduleType: "health_profile"`.
- Uses source event `vaccination:<vaccination-id>` and the existing notification candidate format.

- [ ] Write failing tests for due candidate generation, disabled reminders, record-specific event names, and registry inclusion.
- [ ] Run the source tests and confirm the missing module/export failure.
- [ ] Implement the source using the existing profile schema, local timezone date helpers, notification offsets, profile name/vaccine contextual copy, and `/admin/health` URL.
- [ ] Re-run notification source and registry tests until green.

### Task 5: Full verification, visual regression check, and delivery

**Files:**

- Modify: plan checkbox state only if required by execution workflow.

- [ ] Run formatting, focused module tests, and `pnpm check`.
- [ ] Start the app and inspect the health tab at desktop and 375px via Playwright, checking repeat modal, interval selection, expanded details, and no console errors.
- [ ] Inspect the final diff and only commit files within this feature.
- [ ] Rebase on `origin/main`, re-run verification if rebase changes files, and push the resulting commit to `origin/main`.
