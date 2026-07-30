# Life OS Future Plans

> A prioritized engineering roadmap derived from a repository audit. Every
> implementation item is intentionally unchecked and should be completed in a
> focused branch with its own design/implementation plan.

## Audit Baseline

- [ ] Re-audit this roadmap after major architecture changes or at least once per quarter.
  - Audited: 2026-07-30
  - Baseline: fetched `origin/main` at `4381a55`
  - Scope: 500 TypeScript/TSX files, 160 test files, 25 API routes, and 26 registered modules
  - Validation: lint and type-check passed; production build passed; tests had 1 failure out of 804; formatting drift was reported in 150 files
  - Git note: the remote update was fetched, but the local checkout could not be fast-forwarded because incoming changes overlap pre-existing local edits

## Roadmap Rules

- [ ] Keep each epic in a separate branch and pull request.
- [ ] Write a scoped implementation plan before starting an epic that touches more than one subsystem.
- [ ] Add a failing regression test before fixing a bug.
- [ ] Run `pnpm check` and `pnpm format:check` before merging.
- [ ] For UI changes, verify desktop and mobile flows with Playwright.
- [ ] Record migrations, rollout risk, monitoring, and rollback steps in the pull request.
- [ ] Do not start the optional product backlog until the Priority 0 quality gate is green.

## Priority 0 — Restore Trust in Main

### P0.1 — Make the Full Check Green and Deterministic

- [ ] Restore a clean `pnpm check` result on `main`.
  - Owner: Platform + Habits
  - Current risk: `src/app/api/widgets/summary/__tests__/route.test.ts` passes in UTC and fails in `Asia/Kolkata`; the habit streak is calculated as `1` instead of `2`.
  - Root cause: `src/modules/habits/components/types.ts` mixes local-midnight parsing with UTC serialization for date-only values.
  - Fallback: keep the current date format and isolate the fix to shared date helpers plus regression tests.
  - [ ] Add explicit UTC and `Asia/Kolkata` reproductions for habit streaks.
  - [ ] Define whether habit dates represent a user-local calendar date or a UTC date.
  - [ ] Update `getDateStr()`, `asDate()`, `getDaysArray()`, and `getStreak()` to use one date-only convention.
  - [ ] Re-run the focused widget summary test in both time zones.
  - [ ] Run the complete `pnpm check`.

- [ ] Remove the 24 lint warnings in `src/modules/rain-tracker/__tests__/AdminView.test.tsx`.
  - Owner: Rain Tracker
  - Current risk: warnings make new lint regressions easier to miss.
  - Fallback: change only the Framer Motion test mock; do not alter production rendering.
  - [ ] Replace unused destructured motion props with a typed filtering helper.
  - [ ] Configure CI to fail when new lint warnings are introduced.

- [ ] Eliminate repository-wide Prettier drift.
  - Owner: Platform
  - Current risk: `pnpm format:check` currently reports 150 files, so formatting cannot act as a reliable merge gate.
  - Fallback: land one formatting-only commit with no behavior changes.
  - [ ] Freeze feature merges while the mechanical formatting commit is prepared.
  - [ ] Run `pnpm format`.
  - [ ] Review the formatting-only diff for accidental content changes.
  - [ ] Enable `pnpm format:check` in pull-request CI.

### P0.2 — Make Backup and Restore Safe

- [ ] Replace destructive, partially validated restore behavior in `src/app/api/import/route.ts`.
  - Owner: Backend + Data
  - Current risk: the route deletes live collections before all replacement inserts succeed and does not validate imported content against `SchemaRegistry`.
  - Fallback: keep backup format `1.0` readable while introducing a safer versioned restore path.
  - [ ] Define a versioned Zod schema for the complete backup envelope.
  - [ ] Validate every `content` document's `module_type`, metadata, and `payload` before opening a database mutation path.
  - [ ] Validate `system` and `metrics` documents before mutation.
  - [ ] Stage replacement data in temporary collections or use a supported transaction strategy.
  - [ ] Swap staged data into place only after every insert and verification check succeeds.
  - [ ] Preserve or automatically restore the previous data if staging or swapping fails.
  - [ ] Add tests proving malformed documents perform zero destructive writes.
  - [ ] Add tests proving an insert failure leaves existing data intact.
  - [ ] Add an export-to-import round-trip test.

- [ ] Define complete backup semantics for `ai_providers`.
  - Owner: Backend + Security
  - Current risk: the application uses four collections, but export/import currently handles only `system`, `content`, and `metrics`.
  - Fallback: retain metadata-only export if secret portability is not approved.
  - [ ] Decide whether provider API keys are excluded, encrypted, or included only through an explicit high-friction option.
  - [ ] Document the security consequences of each option.
  - [ ] Add `ai_providers` metadata to backup version `2.0`.
  - [ ] Add migration tests for backup versions `1.0` and `2.0`.

- [ ] Make large exports memory-safe in `src/app/api/export/route.ts`.
  - Owner: Backend + Data
  - Current risk: every collection is loaded into memory and serialized as indented JSON.
  - Fallback: enforce a documented export-size limit until streaming is available.
  - [ ] Measure export memory usage with representative large collections.
  - [ ] Stream or chunk collection output.
  - [ ] Surface clear errors for backups that exceed configured limits.
  - [ ] Add an integrity checksum and validate it during import.

### P0.3 — Harden Pull-Request CI and Merge Policy

- [ ] Make `.github/workflows/test.yml` deterministic and fail fast.
  - Owner: Platform
  - Current risk: CI uses `pnpm install --no-frozen-lockfile`, omits the explicit type-check and format check, and builds before cheaper validation.
  - Fallback: keep the current workflow available as a temporary manual workflow until the replacement is proven.
  - [ ] Add `packageManager` and supported Node.js metadata to `package.json`.
  - [ ] Pin the Node.js and pnpm versions used locally, in CI, and in Docker.
  - [ ] Use `pnpm install --frozen-lockfile`.
  - [ ] Run format, lint, type-check, and focused tests before the production build.
  - [ ] Run the production build and full test suite before merge.
  - [ ] Add workflow concurrency cancellation and job timeouts.
  - [ ] Cache pnpm dependencies with a lockfile-based key.
  - [ ] Upload useful test, coverage, and build artifacts on failure.

- [ ] Make auto-merge depend on explicit protected checks.
  - Owner: Repository Maintainers
  - Current risk: `.github/workflows/automerge.yml` enables auto-merge, but safety depends on repository branch-protection settings that are not documented in the repository.
  - Fallback: disable auto-merge until required status checks are enforced.
  - [ ] Document the required checks and review policy.
  - [ ] Require the hardened CI workflow before merge.
  - [ ] Keep deploy permissions separate from pull-request validation.
  - [ ] Minimize workflow token permissions.
  - [ ] Pin GitHub Actions to reviewed commit SHAs.

### P0.4 — Bound Public Abuse and Data Growth

- [ ] Replace process-local login throttling with a deployment-safe limiter.
  - Owner: Backend + Security
  - Current risk: the in-memory map in `src/app/api/auth/login/route.ts` resets on restart and is not shared across server instances.
  - Fallback: keep the current limiter as a secondary local guard.
  - [ ] Define trusted proxy behavior and normalize the client IP from forwarding headers.
  - [ ] Add a durable rate-limit store with bounded key retention.
  - [ ] Return a standards-based `Retry-After` response.
  - [ ] Test multi-instance behavior, spoofed forwarding headers, expiry, and successful-login reset.

- [ ] Protect public analytics ingestion in `src/app/api/metrics/route.ts`.
  - Owner: Backend + Security
  - Current risk: anonymous clients can generate unbounded database writes.
  - Fallback: disable analytics ingestion independently while keeping public pages available.
  - [ ] Add per-client and global rate limits.
  - [ ] Add request-size limits and duplicate-event suppression.
  - [ ] Define a metrics retention period and create a TTL or scheduled cleanup policy.
  - [ ] Add monitoring for rejected events, write volume, and collection growth.

## Priority 1 — Reduce Architectural Risk

### P1.1 — Establish a Date and Time Foundation

- [ ] Create shared utilities for instants, date-only values, and user-local calendar dates.
  - Owner: Platform
  - Current risk: date construction and ISO slicing are repeated across modules, and the verified habit failure shows that local and UTC semantics can diverge.
  - Fallback: migrate one module at a time without changing stored formats.
  - [ ] Document the storage and display convention for each date category.
  - [ ] Add `src/lib/date-only.ts` with parsing, formatting, comparison, and day-offset helpers.
  - [ ] Add boundary tests for UTC, positive and negative offsets, daylight-saving transitions, month ends, and leap years.
  - [ ] Migrate Habits first, then Maintenance, Analytics, recurring expenses, and finance modules.
  - [ ] Add a two-time-zone test job or focused time-zone matrix in CI.

### P1.2 — Split and Optimize Widget Summaries

- [ ] Replace the 1,190-line `src/app/api/widgets/summary/route.ts` switch with module-owned summary handlers.
  - Owner: Backend + Module Owners
  - Current risk: one route owns unrelated schemas, queries, calculations, and response contracts for most modules.
  - Fallback: preserve the existing endpoint and response shapes while handlers move behind an internal registry.
  - [ ] Define a typed `WidgetSummaryHandler` contract.
  - [ ] Move one module at a time into `src/modules/<module>/server/widget-summary.ts`.
  - [ ] Keep authentication, parameter parsing, and error serialization in the route.
  - [ ] Add contract tests that compare old and new response shapes during migration.
  - [ ] Remove the switch only after every registered widget uses a handler.

- [ ] Move high-volume summary calculations into bounded MongoDB queries.
  - Owner: Backend + Data
  - Current risk: most summaries fetch all projected documents for a module and aggregate them in application memory.
  - Fallback: retain the current calculation behind a feature flag until parity is verified.
  - [ ] Capture query latency, document counts, and memory baselines first.
  - [ ] Prioritize expenses, AI usage, habits, bills, vehicle, and analytics.
  - [ ] Use aggregation pipelines, targeted limits, and count queries where they reduce transferred data.
  - [ ] Add indexes only after validating query plans with representative data.
  - [ ] Record before/after p50, p95, transferred bytes, and memory.

### P1.3 — Make Schemas Module-Owned

- [ ] Split the 1,168-line `src/lib/schemas.ts` into module-owned schema files.
  - Owner: Backend + Module Owners
  - Current risk: unrelated modules contend on one registry file and schema-derived types are difficult to isolate.
  - Fallback: preserve re-exports from `src/lib/schemas.ts` until every caller migrates.
  - [ ] Define a typed schema-registration contract.
  - [ ] Move schemas to `src/modules/<module>/schema.ts` in small batches.
  - [ ] Build `SchemaRegistry` from explicit module registrations.
  - [ ] Derive payload types from Zod schemas instead of duplicating interfaces.
  - [ ] Keep tests that ensure every registry `contentType` has a schema and every public schema has a module owner.

### P1.4 — Decompose Oversized Client Components

- [ ] Split the largest stateful views by feature boundary.
  - Owner: Frontend + Module Owners
  - Current risk: `vehicle/AdminView.tsx` is 2,583 lines, `ai-usage/AdminView.tsx` is 2,195, `health/AdminView.tsx` is 1,802, `admin/settings/page.tsx` is 1,771, and several other views exceed 1,000 lines.
  - Fallback: extract pure helpers and leaf components first; avoid broad visual redesign during decomposition.
  - [ ] Start with `src/modules/vehicle/AdminView.tsx`.
  - [ ] Continue with AI Usage, Health, Settings, recurring expenses, Maintenance, and Analytics.
  - [ ] Co-locate state with the smallest component that owns it.
  - [ ] Extract reusable domain calculations into tested pure modules.
  - [ ] Add behavior tests before moving handlers or state.
  - [ ] Compare desktop and mobile screenshots before and after each extraction.

### P1.5 — Standardize Server and Client Boundaries

- [ ] Create a shared admin-auth boundary for API routes.
  - Owner: Backend + Security
  - Current risk: 17 API route files repeat cookie extraction and token verification.
  - Fallback: migrate routes incrementally while retaining proxy protection.
  - [ ] Add a server-only `requireAdmin()` helper with one response contract.
  - [ ] Keep defense-in-depth authorization inside sensitive routes.
  - [ ] Add route tests for missing, expired, and malformed tokens.
  - [ ] Centralize duplicated secret-masking logic used by AI provider routes.

- [ ] Create a typed client fetch layer.
  - Owner: Frontend + Platform
  - Current risk: many components call `fetch(...).then(r => r.json())` without a consistent non-2xx, abort, timeout, or error-message policy.
  - Fallback: adopt the helper only for new work until migrated callers have tests.
  - [ ] Define the `ApiSuccess` and `ApiError` client-side decoding contract.
  - [ ] Add timeout and `AbortSignal` support.
  - [ ] Map authentication failures to a single re-login flow.
  - [ ] Migrate widgets first, followed by shell components and module admin views.

### P1.6 — Add Error Boundaries and Useful Observability

- [ ] Add route-level error recovery.
  - Owner: Frontend + Platform
  - Current risk: the App Router currently has no `error.tsx` or `global-error.tsx` files.
  - Fallback: keep existing skeletons and add boundaries without changing route data contracts.
  - [ ] Add `src/app/global-error.tsx`.
  - [ ] Add `error.tsx` for admin, public module, blog, and settings route groups.
  - [ ] Provide retry, safe navigation, and accessible error messaging.
  - [ ] Test thrown render errors and failed client fetches.

- [ ] Replace scattered console logging with structured operational logging.
  - Owner: Platform + Backend
  - Current risk: errors are inconsistently shaped and difficult to correlate across requests.
  - Fallback: keep console as the transport while standardizing structured fields.
  - [ ] Add request or correlation IDs at the API boundary.
  - [ ] Define redaction rules for secrets, tokens, personal data, and imported documents.
  - [ ] Log route, operation, status, duration, and safe error context.
  - [ ] Add health metrics for database connectivity, API failures, and slow queries.

### P1.7 — Make Containers and Deployments Reproducible

- [ ] Harden `Dockerfile` and `docker-compose.yml`.
  - Owner: Platform
  - Current risk: Node and pnpm are not fully pinned; Compose uses `mongo:latest` and `caddy:latest`; services have no health checks.
  - Fallback: retain the last known-good image digests and a documented rollback command.
  - [ ] Pin Node, pnpm, MongoDB, and Caddy to reviewed versions or digests.
  - [ ] Keep the existing non-root runtime user.
  - [ ] Add application and database health checks.
  - [ ] Make service startup depend on health, not container creation alone.
  - [ ] Add a minimal `/api/health` endpoint that leaks no secrets.
  - [ ] Build and smoke-test the production container in CI.
  - [ ] Generate an SBOM and scan the runtime image.

- [ ] Define one owner for security headers.
  - Owner: Platform + Security
  - Current risk: Next.js sets `X-Frame-Options: DENY` while Caddy sets `SAMEORIGIN`; CSP and HSTS behavior differs by deployment path.
  - Fallback: keep current baseline headers while the policy is tested in report-only mode.
  - [ ] Decide which headers belong at the application versus TLS-termination layer.
  - [ ] Test a deployment-aware CSP in report-only mode.
  - [ ] Remove `unsafe-eval` and reduce inline allowances where compatible.
  - [ ] Enable HSTS only on confirmed HTTPS deployments.
  - [ ] Add automated header assertions for direct Node, Caddy, Netlify, and Vercel paths that are officially supported.

## Priority 2 — Improve Delivery Speed and Product Quality

### P2.1 — Add End-to-End Confidence

- [ ] Add a Playwright smoke suite for critical journeys.
  - Owner: QA + Frontend
  - Current risk: the repository has extensive unit/component coverage but no end-to-end suite.
  - Fallback: run the suite as non-blocking until it is stable across three consecutive CI runs.
  - [ ] Cover admin login and logout.
  - [ ] Cover content create, edit, visibility change, and delete.
  - [ ] Verify private content is inaccessible publicly.
  - [ ] Cover dashboard widgets and module navigation.
  - [ ] Cover a safe backup export and validated import against an isolated database.
  - [ ] Run desktop and mobile projects with screenshots and traces on failure.

- [ ] Introduce coverage thresholds based on a measured baseline.
  - Owner: QA + Platform
  - Current risk: coverage is configured but has no thresholds and is not enforced in CI.
  - Fallback: use ratcheting thresholds that cannot decrease instead of imposing an arbitrary target.
  - [ ] Publish the current line, branch, function, and statement baseline.
  - [ ] Set repository-wide non-regression thresholds.
  - [ ] Add higher focused thresholds for auth, import/export, schemas, and shared date logic.

### P2.2 — Finish Loading and Accessibility Contracts

- [ ] Add rich loading fallbacks to remaining dynamic imports.
  - Owner: Frontend
  - Current risk: Bookshelf has two and Crop History has four dynamic imports without explicit loading UI.
  - Fallback: reuse existing shared skeletons without redesigning the target views.
  - [ ] Add object-literal loading fallbacks in `src/modules/bookshelf/AdminView.tsx`.
  - [ ] Add object-literal loading fallbacks in `src/modules/crop-history/AdminView.tsx`.
  - [ ] Add tests that prevent blank dynamic-import states.

- [ ] Audit modal and overlay accessibility.
  - Owner: Frontend + Accessibility
  - Current risk: the codebase has 36 fixed overlays but only 20 explicit dialog semantics, so remaining overlays need verification.
  - Fallback: fix semantics and focus behavior without changing visual layout.
  - [ ] Inventory every overlay and classify dialog, menu, tooltip, or decorative layer.
  - [ ] Add semantic roles, accessible names, focus trapping, Escape handling, and focus restoration where required.
  - [ ] Add automated axe checks for shared primitives and representative modules.
  - [ ] Test keyboard-only navigation for the command palette, sidebar, settings, and CRUD dialogs.

### P2.3 — Add Measured Performance Budgets

- [ ] Establish performance baselines before optimizing.
  - Owner: Platform + Frontend
  - Current risk: heavy features such as Excalidraw, PDF rendering, charts, and large admin views have no recorded bundle or interaction budgets.
  - Fallback: make monitoring non-blocking until representative baselines are stable.
  - [ ] Record route-level client bundle sizes.
  - [ ] Capture Core Web Vitals for public home, blog, dashboard, and the heaviest modules.
  - [ ] Add budgets for JavaScript size, LCP, CLS, and interaction latency.
  - [ ] Verify heavy libraries load only on routes that need them.
  - [ ] Optimize only bottlenecks demonstrated by bundle analysis or profiling.

### P2.4 — Repair Onboarding and Documentation Drift

- [ ] Add a safe, committed environment template.
  - Owner: Developer Experience + Security
  - Current risk: `README.md` tells users to copy `.env.local.example`, but the file is absent and `.gitignore` excludes every `.env*` file.
  - Fallback: document manual variables until the template lands.
  - [ ] Add an allowlist exception for `.env.local.example`.
  - [ ] Create `.env.local.example` with placeholders only.
  - [ ] Include MongoDB, auth, Docker, domain, and optional integration variables.
  - [ ] Add automated secret scanning and verify the template contains no live credentials.

- [ ] Make documentation reflect the current application.
  - Owner: Developer Experience + Module Owners
  - Current risk: docs still claim 18 modules, link to `/login` instead of `/admin/login`, and mix `View.tsx` with the actual `PublicView.tsx` contract.
  - Fallback: update factual errors first; defer prose redesign.
  - [ ] Update `README.md`, `CONTRIBUTING.md`, `MODULE_ONBOARDING.md`, `DEPLOY_GUIDE.md`, and `TESTING.md`.
  - [ ] Align the documented Node and pnpm versions with CI and Docker.
  - [ ] Generate module counts and registry tables from `src/registry.ts`.
  - [ ] Add a documentation check for referenced files, commands, and internal routes.

- [ ] Consolidate legacy planning documents.
  - Owner: Repository Maintainers
  - Current risk: `PLAN.md`, `ADVANCED_PLAN.md`, `MODULE_IDEAS.md`, and `app-review-issues.md` contain stale or overlapping claims.
  - Fallback: archive files with redirects rather than deleting their history.
  - [ ] Mark this file as the active roadmap.
  - [ ] Move historical plans to `docs/archive/`.
  - [ ] Migrate still-valid unchecked work into this roadmap.
  - [ ] Remove items that are already implemented or no longer fit the architecture.

## Priority 3 — Optional Product Expansion

> Each item below needs product discovery and a separate approved design before implementation.

- [ ] Design managed media storage for blog covers, portfolio assets, book covers, and attachments.
  - Owner: Product + Backend + Security
  - Current risk: provider choice, cost, file validation, privacy, and deletion semantics are unresolved.
  - Fallback: continue supporting external URLs and existing attachment behavior.
  - [ ] Compare S3-compatible storage, Netlify Blob, and current Mongo-backed attachments.
  - [ ] Define size, MIME, malware-scanning, EXIF-stripping, retention, and orphan-cleanup policies.
  - [ ] Require signed access for private media.

- [ ] Design offline/PWA support for a small set of daily-use modules.
  - Owner: Product + Frontend + Data
  - Current risk: offline writes introduce conflict resolution and sensitive-data caching concerns.
  - Fallback: ship installable read-only caching before offline mutation.
  - [ ] Select the first offline-capable modules based on actual usage.
  - [ ] Define cache boundaries, encryption expectations, sync conflicts, and recovery.

- [ ] Design multi-user support only as a versioned architecture change.
  - Owner: Product + Security + Data
  - Current risk: the current single-tenant schema and one-password admin model have no tenant boundary.
  - Fallback: preserve single-tenant deployment as the default product mode.
  - [ ] Define user, tenant, role, invitation, ownership, and audit models.
  - [ ] Add tenant identifiers and authorization to every privileged data access path.
  - [ ] Create a backward-compatible migration and rollback strategy.

- [ ] Design a safe module/plugin extension model.
  - Owner: Product + Platform + Security
  - Current risk: third-party code execution, schema registration, permissions, upgrades, and compatibility are undefined.
  - Fallback: keep modules as source-controlled first-party folders.
  - [ ] Define a manifest, capability permissions, schema contract, lifecycle, and version compatibility policy.
  - [ ] Separate data-only extensions from executable third-party code.
  - [ ] Threat-model installation, updates, removal, and supply-chain integrity.

## Suggested Execution Order

- [ ] Milestone 1: Complete P0.1 and make every merge gate green.
- [ ] Milestone 2: Complete P0.2 before adding new persistent data shapes.
- [ ] Milestone 3: Complete P0.3 and P0.4 before enabling broader automated deployment.
- [ ] Milestone 4: Implement P1.1, then use its date contract in later refactors.
- [ ] Milestone 5: Implement P1.2 and P1.3 module by module.
- [ ] Milestone 6: Decompose client views and standardize boundaries under P1.4–P1.6.
- [ ] Milestone 7: Harden containers and supported deployment paths under P1.7.
- [ ] Milestone 8: Add P2 end-to-end, accessibility, performance, and documentation gates.
- [ ] Milestone 9: Re-score the optional product backlog and select at most one discovery item.

## Epic Completion Checklist

- [ ] The current risk is reproduced or measured before implementation.
- [ ] Acceptance criteria and out-of-scope behavior are documented.
- [ ] Tests fail before the change and pass after it where a regression is involved.
- [ ] Data and API changes are backward compatible or have a migration plan.
- [ ] Security and privacy implications are reviewed.
- [ ] Performance claims include a before/after measurement.
- [ ] Logs and failure artifacts make regressions diagnosable.
- [ ] `pnpm check` passes with zero test failures.
- [ ] `pnpm format:check` passes.
- [ ] UI work is verified on desktop and mobile.
- [ ] Deployment health checks pass.
- [ ] Rollback or feature-flag mitigation is documented and tested.
