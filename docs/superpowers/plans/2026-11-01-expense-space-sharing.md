# Expense Space Sharing Implementation Plan

**Goal:** Provide revocable live read-only links and a manager for individual expense spaces.

**Architecture:** Store one share record per space in a dedicated collection; derive a reproducible secret token from a random nonce and server secret, storing its hash for lookup. Public reads are independently scoped and allowlisted; admin endpoints manage lifecycle. A responsive public page consumes paginated read APIs and safe attachment downloads.

**Tech stack:** Next.js App Router, MongoDB, React, Vitest, Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-01-expense-space-sharing-design.md`, plus the user's request for pause/resume/delete and a manager on the home page.

## Tasks

1. Add tests and share token/lifecycle helpers and admin endpoints, including authentication, pause/resume/delete and deleted-space handling.
2. Add tested public read and attachment routes with no-store responses, allowlisted fields, scoped queries, pagination and safe downloads.
3. Add share controls per space and a home-page manager with copy, pause, resume and delete actions.
4. Build a responsive public ledger, budget and document view including receipts, search, pagination and loading/error states.
5. Run targeted tests, `pnpm check`, formatting, and desktop/mobile visual checks where environment allows; audit security and full requirements.
