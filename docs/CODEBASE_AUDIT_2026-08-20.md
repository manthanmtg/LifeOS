# LifeOS Comprehensive Codebase Audit

**Audit date:** 2026-08-20

**Audited commit:** `afbd269` (`main`)

**Scope:** application code, API routes, data access, authentication, security, performance, accessibility, UI/UX, tests, CI, deployment configuration, and engineering documentation

**Purpose:** identify concrete improvements and turn them into an ordered, testable engineering roadmap

## Executive Summary

LifeOS has a solid foundation: the module registry is coherent, content writes generally pass through Zod, private content is filtered server-side, the UI consistently uses semantic theme colors, loading skeletons are widespread, notification credentials use authenticated encryption, and the repository has a substantial Vitest suite.

The current branch should not be treated as production-ready, however. Three issues need immediate attention:

1. Uploaded slide HTML can execute in a same-origin iframe with insufficient isolation, creating a stored-XSS path that can act with an administrator's session.
2. Production dependencies include one critical, 26 high, 55 moderate, and 13 low reported vulnerabilities. The installed Next.js version is affected by multiple middleware/proxy-bypass advisories while several sensitive routes rely only on the proxy for authorization.
3. Backup restore deletes live collections before replacement data is safely validated and committed. A mid-import failure can leave the database partially restored or empty, and the backup omits important collections.

The normal quality gate is also red: lint, standalone type-checking, tests, and formatting currently fail. The production build succeeds, but it does not catch the test-file type errors that `pnpm typecheck` finds.

### Recommended release decision

- **Block production deployment or public exposure** until SEC-01, SEC-02, and DATA-01 are fixed.
- **Block automatic merging** until `pnpm check` and `pnpm format:check` are green and required by branch protection.
- Treat the remainder of this document as a staged remediation backlog, not as a single large refactor.

## Audit Scope and Method

This was a repository-wide static pass with line-level review of the highest-risk execution paths. It included:

- `120,334` lines across `245` TypeScript and `376` TSX files.
- `28` module directories, `38` API route handlers, `251` client components, and `210` test files.
- Authentication and CSRF middleware, all API families, polymorphic content validation, MongoDB access, import/export, notifications, AI usage sync, widgets, public rendering, shell navigation, modal patterns, CI, Docker, and deployment headers.
- Repository-wide searches for unsafe HTML/iframes, unbounded queries, client fetches, error swallowing, modal semantics, small typography, `any`, lint suppressions, hardcoded colors, loading/error boundaries, and external network calls.
- Execution of the repository's build, lint, type-check, test, coverage, formatting, and dependency-audit commands.

Commands were run locally with Node.js `25.9.0` and pnpm `10.30.3`. CI currently declares Node 20 and pnpm 9, while `package.json` declares neither an engine nor a package manager. Test-environment failures below therefore need confirmation on the supported toolchain; the mismatch is itself a reproducibility defect.

This was not a production load test, penetration test, database migration rehearsal, or full visual browser regression run. Those require representative production-sized data and a controlled deployed environment. The remediation plan below includes those follow-up checks.

## Current Quality Baseline

| Check                | Result     | Evidence                                                                                                                                                                                                                                                             |
| -------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`         | **Failed** | Stops at ESLint: synchronous state update inside an effect in `ExpenseSpaceWorkspace.tsx:62`.                                                                                                                                                                        |
| `pnpm lint`          | **Failed** | `react-hooks/set-state-in-effect` at `src/modules/expense-spaces/components/ExpenseSpaceWorkspace.tsx:62`.                                                                                                                                                           |
| `pnpm typecheck`     | **Failed** | `AdminSidebar.test.tsx:118` uses `resolveConfig` before assignment; line 135 passes a readonly tuple to mutable `string[]`.                                                                                                                                          |
| `pnpm build`         | **Passed** | Next.js 16.1.6 production build compiled successfully and completed generation for 26 static route artifacts.                                                                                                                                                        |
| `pnpm test`          | **Failed** | The first complete run passed 209/210 files and 1,071/1,078 tests; seven `AdminSidebar` tests failed because `localStorage.clear` was unavailable. A later exact rerun repeated those failures and also hit two Vitest worker-start timeouts. Confirm under Node 20. |
| `pnpm test:coverage` | **Failed** | Same seven sidebar failures plus two tests timed out under instrumentation; no usable coverage baseline was emitted.                                                                                                                                                 |
| `pnpm format:check`  | **Failed** | Prettier reports drift in 131 files.                                                                                                                                                                                                                                 |
| `pnpm audit --prod`  | **Failed** | 95 reported vulnerabilities: 1 critical, 26 high, 55 moderate, 13 low.                                                                                                                                                                                               |

Additional quality signals:

- `286` occurrences of `any`, `40` ESLint-disable comments, and `128` console calls exist in `src`.
- There are nine route `loading.tsx` boundaries but no `error.tsx` boundary.
- No forbidden hardcoded Tailwind status-color occurrence was found; the semantic color contract is being followed well.
- The test suite is broad, but coverage thresholds are not configured in `vitest.config.ts:11-27` and there is no checked-in Playwright smoke suite.

## Priority 0 — Release Blockers

### SEC-01 — Uploaded slide HTML creates a stored-XSS path

**Severity:** Critical

**Area:** Security, sessions, data exposure

#### Evidence

- `src/modules/slides/AdminView.tsx:130-160` accepts `.html` and `.htm` uploads and persists them as data URLs.
- `src/modules/slides/DeckPreview.tsx:43-49` renders decoded HTML through `srcDoc` without a `sandbox` attribute.
- `src/modules/slides/Viewer.tsx:252-259` uses `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`.
- For `srcDoc`, combining `allow-scripts` and `allow-same-origin` removes the meaningful origin boundary. A malicious deck can execute with the LifeOS origin when an authenticated administrator previews or presents it.
- CSS `pointer-events: none` on the preview only blocks pointer input; it does not block JavaScript execution, network access, storage access, or parent-window access.

#### Impact

A malicious imported deck, compromised backup, or poisoned database record can call protected same-origin APIs using the administrator's cookies, read private data, mutate content, export the database, or persist further malicious state.

#### Recommended change

1. Add `sandbox=""` to card previews so no script capability is granted.
2. For the full viewer, remove `allow-same-origin` from any untrusted HTML mode. Grant only the minimum features needed for a specific trusted source.
3. Split deck sources into explicit trust classes: uploaded HTML, remote embed, PDF, and known provider URL. Do not use one permissive sandbox for all formats.
4. Prefer serving uploaded HTML from a separate, cookieless origin with a strict CSP. If that is unavailable, sanitize the document and keep it in an opaque-origin sandbox.
5. Add a frame CSP and prevent top navigation, downloads, popups, forms, and storage unless an individual deck type demonstrably needs them.
6. Add a migration/default that treats every existing HTML deck as untrusted.

#### Acceptance criteria

- A test deck containing script cannot read `parent.document`, cookies, local storage, or protected API responses.
- Preview mode never executes uploaded script.
- Viewer capability tests cover HTML, PDF, Google Slides, and remote URLs independently.
- Public deck cards do not contain nested interactive controls inside an element with `role="button"`.

### SEC-02 — Vulnerable production dependencies combine badly with proxy-only authorization

**Severity:** Critical

**Area:** Supply chain, authentication boundary

#### Evidence

`pnpm audit --prod` reports 95 vulnerabilities. Direct production dependencies include:

- `jspdf@4.2.0`: one critical and one high advisory; patched in `>=4.2.1`.
- `next@16.1.6`: 28 advisories in the audit output, including multiple high-severity middleware/proxy bypass and denial-of-service advisories. The newest reported fixes require at least `16.2.11`.
- `@excalidraw/excalidraw@0.18.0`: a moderate XSS advisory; patched in `>=0.18.1`.

Transitive production findings also include vulnerable Mermaid, DOMPurify, lodash-es, picomatch, PostCSS, and Sharp versions.

The following sensitive routes depend on `src/proxy.ts:36-71` and have no route-local administrator check:

- `src/app/api/export/route.ts`
- `src/app/api/import/route.ts`
- `src/app/api/system/route.ts`
- `src/app/api/db-stats/route.ts`
- `src/app/api/module-info/[slug]/route.ts`

The jsPDF dependency is actively imported by `src/modules/emi-tracker/lib/emi-utils.ts:619-642`. The specific vulnerable new-window and FreeText paths do not appear to be directly invoked, but a critical direct dependency still warrants immediate patching and regression testing.

#### Impact

A framework-level proxy bypass can become an authorization bypass when the route handler assumes the proxy already authenticated the request. In that case, export/import and system configuration are especially damaging targets.

#### Recommended change

1. Upgrade Next.js, `eslint-config-next`, jsPDF, and Excalidraw to patched compatible versions and regenerate the lockfile with a frozen-install workflow.
2. Re-run `pnpm audit --prod`, the complete test suite, and browser smoke tests after upgrades.
3. Add a shared route-local `requireAdmin()` helper and call it from every sensitive handler. Keep proxy authentication as the outer guard, not the only guard.
4. Add negative integration tests that invoke protected handlers without cookies, independent of middleware tests.
5. Review transitive dependency overrides only when the owning direct package cannot be upgraded; avoid blind lockfile overrides that bypass compatibility testing.

#### Acceptance criteria

- The direct critical/high findings are removed.
- Export, import, system, database statistics, and module-info handlers return `401` when called directly without a valid token.
- CI runs `pnpm audit --prod` with a documented severity policy and an explicit, expiring exception mechanism.

### DATA-01 — Backup and restore are destructive, incomplete, and not schema-safe

**Severity:** Critical

**Area:** Data integrity, recovery, privacy

#### Evidence

- `src/app/api/import/route.ts:61-97` calls `deleteMany({})` on each live collection before inserting replacements.
- The three collections are restored sequentially without a transaction or staging area. Any parse, MongoDB size, duplicate-key, connectivity, or insertion failure can leave a partial restore.
- Validation at `src/app/api/import/route.ts:7-55` only verifies arrays of plain objects and a document count. Imported `content` does not pass through `SchemaRegistry`, system data does not pass through `SystemUpdateSchema`, timestamps are not validated, and byte size is not bounded.
- `src/app/api/export/route.ts:7-16` exports only `system`, `content`, and `metrics`. It omits `ai_providers`, `notification_channels`, and `notification_deliveries`, so it cannot restore the complete application state.
- Export materializes every collection and the final indented JSON string in memory.
- The full `system` document can include `notificationEncryptionKey` (`src/lib/types.ts:21`), placing a database encryption key in a plaintext JSON download.

#### Impact

The recovery feature can cause the data loss it is intended to prevent. A successful-looking backup is incomplete, while a failed restore can leave LifeOS unusable. Backup files also need to be treated as secrets.

#### Recommended change

1. Define a versioned backup manifest with collection list, per-collection counts, schema version, application version, export timestamp, and checksums.
2. Validate the entire backup before touching live data, including per-document schema validation and a total byte limit.
3. Import into temporary collections first. Verify counts and indexes, then use a transaction or a carefully documented atomic swap strategy supported by the deployment topology.
4. Preserve a rollback snapshot until post-restore verification succeeds.
5. Define whether provider and notification secrets are included. Prefer an encrypted backup envelope or require the administrator to reconnect secrets after restore. Never silently export a plaintext encryption key.
6. Stream large exports instead of building the entire file in memory.
7. Add dry-run mode that reports migrations, invalid documents, and expected changes.

#### Acceptance criteria

- Fault injection at every restore phase leaves the original database intact.
- A backup round-trip restores every documented durable collection or explicitly reports excluded secret material.
- Old backup versions are migrated or rejected before mutation.
- The UI clearly warns that backups contain sensitive personal data.

## Priority 1 — High-Risk Correctness, Security, and Performance

### SEC-03 — AI provider API keys are stored in plaintext

**Severity:** High

**Evidence:** `src/app/api/ai-usage/providers/route.ts:53-61` stores `admin_api_key` directly in `ai_providers`; sync and limits queries read it directly. In contrast, notification credentials use AES-256-GCM in `src/lib/notifications/crypto.ts:77-128`.

**Risk:** A database read, backup mistake, support dump, or overly broad database account exposes organization-level OpenAI/Anthropic administrator keys.

**Recommendation:** Reuse a purpose-specific envelope-encryption abstraction, store versioned ciphertext only, support key rotation, decrypt only within the provider adapter, and migrate existing plaintext rows. Do not return key prefixes unless they are genuinely needed for identification. Add a least-privilege database role and redact all provider response bodies from logs.

### SEC-04 — Docker sends secrets and large local artifacts into the build context

**Severity:** High

**Evidence:** The repository has no `.dockerignore`; `Dockerfile:23` runs `COPY . .`; the working tree commonly contains `.env.local`, `.git`, `.next`, `node_modules`, coverage, and browser artifacts.

**Risk:** Secrets can enter the builder layer/cache, remote build service, or image history. Build context is unnecessarily large and non-reproducible.

**Recommendation:** Add a deny-by-default `.dockerignore` covering `.env*` except the example, `.git`, `.next`, `node_modules`, coverage, Playwright artifacts, logs, IDE files, and local caches. Pin pnpm instead of `npm install -g pnpm` at `Dockerfile:11` and `:26`; add `packageManager` and `engines` to `package.json`; pin the base image and Compose images to reviewed versions/digests.

### SEC-05 — Public write endpoints have weak abuse controls

**Severity:** High

**Evidence:**

- `src/app/api/metrics/route.ts:29-60` allows anonymous clients to insert one MongoDB document per valid request.
- Metrics indexes in `src/lib/seed.ts:74-76` have no TTL index.
- `src/app/api/auth/login/route.ts:20-23` uses a process-local `Map`; keys are not bounded, state resets on restart, and instances do not share limits.
- The client identifier trusts raw `x-forwarded-for` at line 33 without a documented trusted-proxy normalization strategy.

**Recommendation:** Add distributed per-client and global limits, body-size limits, duplicate suppression, metrics retention/TTL, bounded key expiry, trusted-proxy parsing, `Retry-After`, and monitoring. Keep the in-process limiter only as a secondary guard. This aligns with `docs/FUTURE_PLANS.md` P0.4.

### DATA-02 — Several replacement/delete workflows are non-atomic

**Severity:** High

**Evidence:**

- AI usage sync deletes existing buckets before inserting replacements at `src/app/api/ai-usage/sync/route.ts:435-455`.
- AI provider deletion removes the provider before related usage records at `src/app/api/ai-usage/providers/[id]/route.ts:131-142`.
- Expense-space deletion removes entries before the parent at `src/app/api/expense-spaces/[spaceId]/route.ts:238-248`.
- Bill folder deletion mutates bills and children before confirming the target exists at `src/app/api/bills/folders/[id]/route.ts:72-106`.

**Risk:** Partial failures produce missing data or orphaned state.

**Recommendation:** Use transactions where the deployment supports them. Where it does not, write replacement data under a generation/run ID, validate it, switch the active generation, and clean old data afterward. For destructive actions, confirm the target and all invariants before the first mutation. Make retries idempotent.

### DATA-03 — Bill folder deletion is not actually recursive

**Severity:** High

**Evidence:** `src/app/api/bills/folders/[id]/route.ts:81-99` loads and deletes only direct child folders despite the recursive comment. Grandchildren survive with `parent_id` values that point to deleted folders. Bills in deeper descendants are not moved to root.

**Recommendation:** Traverse all descendants first, detect cycles, produce one complete set of folder IDs, move every affected bill, and delete all descendants plus the target transactionally. Add tests for three or more levels, cycles/corrupt input, a missing target, and a failure after bill movement.

### DATA-04 — Attachment validation permits oversized or unverified embedded files

**Severity:** High

**Evidence:**

- Generic attachment schemas at `src/lib/schemas.ts:869-884` and `:1087-1105` have no maximum encoded length and do not verify that `size`, MIME type, and decoded bytes agree.
- The dedicated bill upload route checks an estimated 5 MB size but `src/app/api/bills/[id]/attachments/route.ts:71-77` pushes without enforcing the schema's maximum of 50 attachments.
- Bill create/update through the generic content path can still submit embedded attachment data through `BillSchema` without the dedicated route's 5 MB check.
- `image/*` accepts SVG and other active or unexpected formats without signature validation.
- `DeckUrlMaxLength` is 14 MiB (`src/lib/schemas.ts:57`), leaving little room below MongoDB's 16 MiB document limit once base64 and other fields are included.

**Recommendation:** Centralize byte validation on the server, decode and verify base64, allowlist safe MIME/signature combinations, reject SVG unless sanitized and served as attachment, enforce aggregate document size and attachment count in atomic queries, and move binary data to managed object storage. Store only metadata and object keys in `content`.

### FUNC-01 — Configured public module visibility does not work for anonymous users

**Severity:** High

**Evidence:**

- `src/proxy.ts:39` protects all `/api/system` requests.
- `src/components/shell/PublicHeader.tsx:49-83` fetches `/api/system` anonymously, receives `401`, then effectively falls back to registry defaults.
- `src/app/[module]/PublicModuleClient.tsx:119-179` also fetches `/api/system`; a default-private module made public is treated as private and redirects to admin login, while a default-public module made private can remain visible according to defaults.

**Recommendation:** Create a server-only `getPublicSiteConfig()` that returns a deliberately small DTO: branding, public/enabled module flags, and public ordering. Render and gate public routes on the server, use `notFound()` for disabled modules, and pass the sanitized configuration to the header. Do not expose the full system document.

**Required regression tests:** default-private enabled publicly, default-public disabled, disabled module, custom ordering, anonymous request, and authenticated public-view request.

### FUNC-02 — Visit-based ordering consumes an obsolete data shape

**Severity:** High

**Evidence:** `/api/system` injects `tieredVisits` at `src/app/api/system/route.ts:15-18`. The shared ordering implementation correctly consumes it in `src/lib/admin-modules.ts:73-100`, but `src/app/admin/page.tsx:143-163` and `src/components/shell/AdminHeader.tsx:67-100` still read `pageVisits`.

**Impact:** Unless a legacy `pageVisits` field happens to remain in MongoDB, visit ordering in the dashboard and top-module header is all zeros and therefore incorrect.

**Recommendation:** Use `getOrderedAdminModules()` everywhere and derive a shared score/display value from `tieredVisits`. Delete the duplicate local sorting logic and obsolete `pageVisits` interfaces/tests.

### PERF-01 — Every request performs repeated dynamic database work

**Severity:** High

**Evidence:**

- `src/app/layout.tsx:10` forces every route dynamic.
- Metadata queries both portfolio and system at `src/app/layout.tsx:16-23`.
- Root layout calls `ensureSystemConfig()` on every request at line 58, queries system again at lines 64-74, and performs an unused portfolio query at lines 76-78.
- `ensureSystemConfig()` checks/backfills config and calls multiple `createIndex` operations every time (`src/lib/seed.ts:8-78`).
- The home page queries portfolio again (`src/app/page.tsx:7-18`), while `PublicHeader`, `PortfolioView`, and `PublicFooter` issue more client requests for the same profile/config data.

**Recommendation:** Move initialization/index management to a migration/bootstrap command, remove the unused query, stop forcing dynamic rendering globally, and create cached server data loaders with tag-based invalidation after admin updates. Fetch public profile/config once in the server tree and pass typed DTOs to header, body, and footer.

**Measure:** server TTFB, Mongo operations per request, initial HTML content, hydration time, and cache invalidation correctness before and after.

### PERF-02 — Dashboard loading fans out into roughly 25 client requests

**Severity:** High

**Evidence:** `src/app/admin/page.tsx:13-118` defines 27 dynamic widgets with `ssr: false`. A repository scan found 25 widget files that independently fetch `/api/widgets/summary` after hydration, in addition to shell/config requests.

**Impact:** The dashboard displays a skeleton-first UI, waits for client JavaScript, repeats JWT/Mongo overhead, and becomes increasingly slow as modules are enabled.

**Recommendation:** Add a batched summary API accepting enabled content types, or fetch all widget DTOs once in an authenticated server component. Cache/dedupe on navigation and allow individual widgets to retry without refetching the entire dashboard. Preserve the current compact widget contract.

**Measure:** request count, transferred bytes, time to first useful widget, p50/p95 endpoint time, and dashboard memory with all modules enabled.

### PERF-03 — The bills widget loads complete base64 attachments

**Severity:** High

**Evidence:** The bill projection at `src/app/api/widgets/summary/route.ts:355` includes `payload.attachments`; all bill documents are materialized at lines 371-373; and lines 760-787 return the complete `recentBill`. The widget only reads the latest bill name plus folder and file counts at `src/modules/bills/Widget.tsx:78-84`.

**Impact:** A small dashboard tile can load megabytes of binary data and amplify memory use on both server and client.

**Recommendation:** Use an aggregation with `$size`/`$sum`, a limited sorted query for the latest bill, and a narrow DTO such as `{ total, folderCount, totalAttachments, recentBill: { id, name, createdAt } }`. Add a response-size regression test containing maximum-sized attachments.

### PERF-04 — Generic content reads are unbounded and under-indexed

**Severity:** High

**Evidence:** `src/app/api/content/route.ts:10-39` accepts no cursor, limit, or projection and returns every matching document sorted by `created_at`. The existing public compound index is `{ module_type, is_public }` (`src/lib/seed.ts:67`) and does not cover the sort. Public blog loads all matching content and filters published status in the browser at `src/modules/blog/View.tsx:34-46`.

**Recommendation:** Add cursor pagination, maximum limits, projections, and explicit query schemas. Create indexes from measured query plans, beginning with `{ module_type: 1, is_public: 1, created_at: -1 }` and a blog-specific status/published date index. Filter published content server-side. Return pagination metadata without breaking current clients during migration.

### PERF-05 — Widget summary is a central in-memory aggregation hotspot

**Severity:** High

**Evidence:** `src/app/api/widgets/summary/route.ts` is 1,082 lines. Its default path loads all projected module documents at lines 371-373 and then reduces/sorts them in JavaScript. Expenses are the main bounded exception.

**Recommendation:** Implement the module-owned handler contract already proposed in `docs/FUTURE_PLANS.md` P1.2. Migrate high-volume modules first, use count/aggregate/limit operations, validate query plans with representative cardinalities, and preserve response-contract tests during migration.

### RES-01 — A transient MongoDB connection failure is cached until restart

**Severity:** High

**Evidence:** `src/lib/mongodb.ts:36-54` stores `client.connect()` in a global or module promise. The rejection handler logs and rethrows but never clears the cached promise.

**Impact:** A temporary database outage during initial connection can make every later request reuse the already-rejected promise, even after MongoDB recovers.

**Recommendation:** Clear the relevant cache on rejection, close the failed client where appropriate, and allow a controlled retry with jitter/backoff. Add a test where the first connection fails and the second succeeds. Rename the outdated app name `LifeOS-EMI-Tracker` at line 17.

### RES-02 — Database failures are presented as empty or not-found states

**Severity:** High

**Evidence:**

- There are no App Router `error.tsx` files.
- `src/app/blog/[slug]/page.tsx:57-106` swallows database exceptions and renders “Post Not Found.”
- `src/modules/blog/View.tsx:34-46` swallows fetch errors and can show an empty content state.
- `src/app/api/metrics/route.ts:23-26` returns HTTP 200 with an empty array on database failure.
- Other shell/widget fetches use empty catches, making incidents hard to distinguish from genuinely empty data.

**Recommendation:** Add route-level error boundaries with retry actions, typed error states for client fetches, and structured server logging with request/correlation IDs. Use `404` only for confirmed absence, `503` for dependency failure, and an explicit `degraded` marker when stale-cache fallback is intentional.

### UX-01 — Modal accessibility is inconsistent and largely hand-built

**Severity:** High

**Evidence:** There are at least 16 declared dialog/alertdialog instances but no shared focus-management primitive. `ConfirmDialog.tsx:29-46` handles Escape and body scroll and autofocuses Cancel, but does not trap or restore focus. `BillModal.tsx:314-410` and `MoveFolderModal.tsx:57-115` lack dialog semantics, focus trapping/restoration, and complete keyboard behavior. Bill form labels at lines 372-410 are not associated with inputs.

**Recommendation:** Introduce one accessible Dialog primitive using the native dialog element or a proven headless primitive. It must provide focus trap/restore, Escape, scroll locking, inert background, labeled title/description, backdrop policy, nested-dialog handling, and mobile safe-area behavior. Migrate the most frequently used and destructive dialogs first.

**Acceptance criteria:** keyboard-only open/use/close, focus restored to opener, screen-reader name/description, no background tab stops, no accidental destructive default, and automated axe coverage.

### UX-02 — Whiteboard cards are not keyboard/touch complete

**Severity:** High

**Evidence:** `src/modules/whiteboard/WhiteboardCard.tsx:61-71` makes a `motion.div` clickable without button/link semantics, tab focus, or keyboard activation. Actions at lines 87-179 appear only on hover and use very small targets. The color picker is exposed only by a nested hover group at lines 126-156.

**Recommendation:** Use a semantic link/button for the primary card action, expose secondary actions through a focusable overflow menu, show actions on `focus-within` and touch layouts, and use at least 44×44 CSS-pixel targets. Give the color selector menu/radio semantics and visible focus states.

## Priority 2 — Product Quality and Maintainability

### UX-03 — Public pages unnecessarily wait for hydration

`PublicHeader.tsx:27-29` delays mounting with a timer, and lines 94-96 render a blank placeholder instead of a header. `PortfolioView.tsx:18-43`, `PublicFooter.tsx:15-24`, and the generic public module client refetch server-accessible data in effects. This weakens initial HTML, adds layout/state transitions, and turns network failures into empty states.

Render public data in server components, pass typed serializable props, and keep client components only around interactive filtering/menu behavior. The header should exist in the first render; scroll styling does not require hiding the semantic header.

### UX-04 — Zen mode is over-broad and difficult to exit accessibly

`src/app/globals.css:756-769` targets every `aside`, `header`, and `nav` below the provider, including module-local headers, tabs, and pagination. It sets `pointer-events: none`, so the hover-to-restore rule is unreliable. `src/components/ZenMode.tsx:49-52` displays an instruction instead of a focusable exit control and always shows a Command-key glyph even on non-Mac platforms.

Scope Zen mode to explicit shell data attributes, keep content navigation usable, add a visible Exit button, announce state changes, persist user preference if desired, and render the platform-neutral shortcut text correctly.

### UX-05 — Typography and label associations need a system-level pass

A scan found 441 `text-[10px]` uses and 628 raw sizes below 12 px. There are 399 `<label>` elements but only 142 explicit `htmlFor` uses; some labels wrap their inputs correctly, but confirmed forms such as `BillModal` do not associate labels at all.

Define a minimum readable type scale for metadata, avoid 10 px text for essential information, and create shared Field/Label/Help/Error primitives that generate IDs automatically. Test every form with accessible-name queries rather than placeholders.

### UX-06 — Nested and hover-only interaction patterns remain

`src/modules/slides/PublicView.tsx:85-96` makes the article a button while lines 179-190 place a real button inside it. This is invalid nested interaction semantics and creates ambiguous keyboard behavior. Similar card patterns should be audited.

Use a non-interactive article with a stretched semantic link/button for the primary action and separate sibling controls for secondary actions. Ensure hover visuals also activate with `focus-visible`/`focus-within`.

### PERF-06 — Public images bypass Next.js image optimization

Five raw `<img>` uses remain, including blog covers in `Blog/View.tsx:224-228`, `BlogPublicCard.tsx`, and `PostReader.tsx`. Dynamic external URLs may make `next/image` configuration inconvenient, but the current approach lacks responsive `sizes` and can waste bandwidth.

Add controlled remote image patterns or an image proxy, use `next/image` where safe, and define width/height or aspect-ratio plus `sizes`. If raw images must remain, use explicit dimensions, `loading="lazy"` below the fold, and `decoding="async"`.

### PERF-07 — AI provider calls have no timeout or pagination safety bound

External calls in `src/app/api/ai-usage/sync/route.ts:94`, `:141`, `:232`, and `:290`, limits calls at `src/app/api/ai-usage/limits/route.ts:158-178`, and debug calls at `src/app/api/ai-usage/debug/route.ts:104-116` have no abort timeout. Pagination loops trust remote next-page values without a maximum page count. Providers are synced sequentially at `sync/route.ts:413-475`.

Create a provider HTTP client with timeout, bounded retries for idempotent calls, maximum pages/records, response schema validation, safe error redaction, and request metrics. Use bounded provider concurrency only after avoiding upstream rate-limit amplification.

### NOTIFY-01 — Scheduled dispatch hides job failure and has low fixed throughput

`netlify/functions/notifications-dispatch.mts:3-11` catches failures, logs them, and resolves successfully, preventing the scheduler from observing/retrying a failed invocation. It processes a fixed batch of ten hourly. The dispatcher also catches individual source collection failures and only logs them at `src/lib/notifications/dispatcher.ts:191-196`.

Return/rethrow a failed scheduled invocation after logging, expose source failure counts in the summary, alert on failure/backlog age, and drain multiple bounded batches within a time budget. Test lease recovery, overlapping invocations, and a backlog larger than one hourly batch.

### ARCH-01 — Oversized components and central registries slow safe change

Largest production files include:

| File                                           | Lines |
| ---------------------------------------------- | ----: |
| `src/modules/vehicle/AdminView.tsx`            | 2,583 |
| `src/modules/calculators/catalog.ts`           | 2,500 |
| `src/modules/ai-usage/AdminView.tsx`           | 2,195 |
| `src/modules/health/AdminView.tsx`             | 2,174 |
| `src/app/admin/settings/page.tsx`              | 1,816 |
| `src/modules/recurring-expenses/AdminView.tsx` | 1,603 |
| `src/lib/schemas.ts`                           | 1,434 |
| `src/modules/maintenance/AdminView.tsx`        | 1,411 |
| `src/modules/analytics/AdminView.tsx`          | 1,104 |
| `src/app/api/widgets/summary/route.ts`         | 1,082 |

Extract feature slices, pure selectors/calculators, forms, and server adapters incrementally. Keep behavior stable, add characterization tests first, and avoid a broad redesign during decomposition. Move module schemas and widget summaries to module-owned server files behind stable registries.

### ARCH-02 — System configuration is fetched and interpreted repeatedly

Admin dashboard, settings, header, sidebar, global search, and command palette each fetch `/api/system` independently. Public consumers attempt it too. Several components define partial, incompatible `SystemConfig` interfaces locally, which caused the `pageVisits`/`tieredVisits` drift.

Define separate `AdminSystemConfigDto` and `PublicSiteConfigDto` types, load admin config once in the layout or a deduplicating client cache, and make ordering/visibility pure shared functions. Check `response.ok` before parsing or closing UI. In particular, `src/app/admin/page.tsx:184-197` closes widget settings even when the PUT returns an HTTP error.

### ARCH-03 — URL validation is syntactic, not policy-based

`src/lib/schemas.ts` contains numerous generic `.url()` validators. Syntactically valid URLs can use schemes that are unsuitable for public `href`, image, receipt, cover, or embed contexts.

Create context-specific validators: `http/https` for external pages and images, `mailto/tel` only where intended, relative same-origin paths for internal URLs, and an explicit provider allowlist for embeddable frames. Normalize before storage and test rejected schemes.

### DATA-05 — Blog slug uniqueness is enforced only in client state

`src/modules/blog/AdminView.tsx:143-156` checks the currently loaded post list, but the database has no unique constraint. Concurrent saves, imports, or direct calls can create duplicate slugs. `src/app/blog/[slug]/page.tsx:64-68` then returns an arbitrary matching post.

Normalize slugs server-side and add a partial unique index covering blog documents. Map duplicate-key errors to HTTP `409`, preserve drafts according to an explicit uniqueness policy, and test concurrent creation.

### DATA-06 — Database statistics are presented with false precision

`src/app/api/db-stats/route.ts:24-48` estimates a collection from its first ten documents and multiplies by 1.5. Lines 75-78 hardcode an Atlas M0 512 MB limit even when deployment uses another tier or local MongoDB.

Label estimates prominently, randomize/aggregate representative samples, configure quota by environment, or query authoritative stats where privileges permit. Never present estimated remaining storage as an exact operational limit.

### CI-01 — CI is not the same as the documented quality gate

`.github/workflows/test.yml` installs with `--no-frozen-lockfile`, builds before lint, omits `pnpm typecheck` and `pnpm format:check`, has no explicit timeouts or cancellation concurrency, and pins actions only to floating major tags. `package.json` has no `packageManager` or Node `engines`; Docker installs an unpinned pnpm while CI hardcodes pnpm 9.

The audit machine resolved Node 25.9 and pnpm 10.30, and Vitest warned about an invalid `--localstorage-file` before the sidebar failures. This is concrete evidence that the undeclared local toolchain can diverge from CI behavior.

Run `pnpm install --frozen-lockfile`, then format check, lint, type-check, tests, and build with fail-fast ordering. Add concurrency cancellation, timeouts, test artifacts, dependency caching, least permissions, SHA-pinned actions, and one declared Node/pnpm toolchain. Require the workflow in branch protection before auto-merge.

### TEST-01 — Strong unit breadth lacks end-to-end and measurable coverage gates

The repository has 210 test files and over 1,000 tests, which is a strong base. Gaps remain:

- No coverage thresholds in `vitest.config.ts`.
- No checked-in Playwright config/spec suite despite browser verification being part of repository guidance.
- No automated focus/axe test layer for the modal system.
- The latest exact test rerun produced two Vitest fork-worker startup timeouts in addition to the repeatable sidebar failures; runner concurrency and the supported Node version need to be made deterministic.
- Import has only one route test and lacks failure-injection/rollback coverage.
- Security tests validate headers but not slide sandbox isolation or direct handler authorization.
- Performance-sensitive endpoints have no response-size/query-count regression tests.

First make the suite deterministic, measure current coverage, then set realistic ratcheting thresholds by layer. Add a small Playwright suite for login, dashboard load, public module visibility, CRUD, backup dry run, and a representative mobile flow.

### DEPLOY-01 — Deployment targets are not operationally equivalent

- `docker-compose.yml:18` and `:29` use `mongo:latest` and `caddy:latest`.
- Compose has no health checks; `depends_on` controls start order, not readiness.
- Caddy defines HSTS and a CSP, while `next.config.ts` defines a different header set and Netlify adds only `nosniff` plus cache headers.
- Caddy's CSP includes `unsafe-inline` and `unsafe-eval` and permits only same-origin frames, which may conflict with intended deck embeds.
- `netlify.toml:7` requests non-frozen dependency installation.

Choose one application-owned security-header policy, add environment-specific extensions only when necessary, and test the effective headers for every supported deployment. Pin images, add app/Mongo health checks and readiness dependencies, define backup/restore for the volume, run the container filesystem read-only where possible, drop capabilities, and document rollback.

### DOC-01 — Audit and roadmap documents contradict current code

`app-review-issues.md` is stale. It claims there are zero tests, no loading states, no rate limiting, no security headers, and database connection leaks. Those statements no longer reflect the repository and can lead to wasteful or harmful work.

`docs/FUTURE_PLANS.md` is much better and already tracks many valid themes, but some baselines are outdated: file line counts have changed, `.env.local.example` now exists, and the current quality failures differ from the roadmap's older examples.

Archive or replace `app-review-issues.md`, make this audit the dated evidence snapshot, and refresh `docs/FUTURE_PLANS.md` only as work is accepted. Keep a single canonical active roadmap and link historical audits from it.

## UI/UX Improvement Program

The UI has consistent visual language and good use of semantic colors, skeletons, rounded surfaces, and focus-visible styles. The largest gains now come from behavior consistency rather than a visual re-theme.

### 1. Establish shared interaction primitives

- Dialog, Drawer, Popover/Menu, Field, EmptyState, ErrorState, and AsyncButton.
- Standard keyboard behavior, focus management, validation announcements, loading states, and 44×44 touch targets.
- Replace repeated local overlay implementations module by module.

### 2. Improve information density without tiny text

- Make 12 px the practical minimum for meaningful metadata; reserve 10 px for nonessential decorative labels only.
- Reduce uppercase/tracking combinations at small sizes because they are harder to scan.
- Use progressive disclosure and section summaries rather than shrinking dense forms.

### 3. Make cards work equally by pointer, touch, and keyboard

- Primary card destination should be a link or button.
- Secondary actions should use an always-discoverable overflow menu on touch and `focus-within` on keyboards.
- Avoid nested interactive elements and hover-only controls.

### 4. Render useful public content immediately

- Server-render public navigation, portfolio, blog list, and generic public modules.
- Keep search/filter state client-side but supply initial data from the server.
- Distinguish loading, empty, offline, unauthorized, and server-error states.

### 5. Validate responsive behavior systematically

- Replace `h-screen` with `dvh`-aware layouts in `src/app/admin/layout.tsx:24` and `AdminSidebar.tsx:285`.
- Add safe-area padding for full-screen mobile dialogs and the fixed header/sidebar.
- Test 320/375/768/1024/1440 px widths, zoom at 200%, landscape phone, and on-screen keyboard behavior.

## Performance Measurement Plan

Do not claim performance improvements without capturing these baselines first:

| Surface         | Measure                                                    | Initial target                                                           |
| --------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| Public home     | Server TTFB, Mongo queries, JS transferred, LCP, CLS       | One shared server data load; useful HTML before hydration.               |
| Admin dashboard | Network requests, summary bytes, time to first/last widget | One config request and one batched summary request or server fetch.      |
| Content API     | p50/p95 query time, documents examined/returned            | Cursor-bounded queries with covered sort where practical.                |
| Widget summary  | Per-module latency, memory, response size                  | No full attachment payloads; aggregation/limits for high-volume modules. |
| Import/export   | Peak RSS, duration, failure recovery                       | Streaming export; zero live mutation before validation.                  |
| AI sync         | Provider latency, pages, timeout/retry count               | Bounded time and page count; atomic visible generation.                  |

Add bundle analysis and Lighthouse/Playwright performance collection only after the correctness blockers are resolved.

## Recommended Implementation Sequence

### Milestone 0 — Restore trustworthy feedback

1. Fix the `ExpenseSpaceWorkspace` lint error.
2. Repair the `AdminSidebar` test environment and the two test-file type errors.
3. Format the repository in one dedicated mechanical commit.
4. Make `pnpm check` and `pnpm format:check` required, deterministic CI gates.

### Milestone 1 — Close exploitable and recovery risks

1. Fix slide sandboxing and add adversarial tests.
2. Upgrade vulnerable direct dependencies and add route-local authorization.
3. Replace import/export with validated staging, rollback, and explicit secret handling.
4. Encrypt AI provider keys and rotate/migrate existing values.
5. Add `.dockerignore` immediately, even before the broader container work.

### Milestone 2 — Fix correctness and integrity defects

1. Add the sanitized public config server loader.
2. Replace `pageVisits` consumers with shared `tieredVisits` ordering.
3. Make bill folder deletion truly recursive and atomic.
4. Make AI sync and expense-space deletes failure-safe.
5. Enforce attachment and slug invariants at the database/server boundary.

### Milestone 3 — Remove request and memory amplification

1. Move bootstrap/index creation out of root requests.
2. Consolidate public profile/config fetches.
3. Batch or server-render dashboard summaries.
4. Remove binary attachment data from widget queries.
5. Add content pagination and measured compound indexes.

### Milestone 4 — Standardize UI resilience and accessibility

1. Add route error boundaries and typed error states.
2. Introduce and migrate to a shared Dialog/Field system.
3. Repair whiteboard and nested card interactions.
4. Scope Zen mode and add an accessible exit control.
5. Raise the small-text floor and validate mobile/safe-area behavior.

### Milestone 5 — Reduce long-term change cost

1. Split widget summary into module-owned handlers.
2. Split schemas into module-owned files with registry tests.
3. Decompose the largest views with characterization tests.
4. Consolidate system DTOs/config loading and client request handling.
5. Refresh active documentation and archive stale plans.

## Definition of Done for Each Remediation

- A failing regression test exists before a bug fix where reproducible.
- Validation is enforced at the server/database boundary, not only in UI state.
- Failure behavior, retry/idempotency, monitoring, rollout, and rollback are documented.
- Security-sensitive routes are tested both through middleware and as direct handlers.
- UI changes pass keyboard, screen-reader semantics, 200% zoom, reduced-motion, desktop, and mobile checks.
- Performance changes include before/after request counts, bytes, memory, and latency.
- `pnpm check`, `pnpm format:check`, and the production dependency policy pass.
- No unrelated behavior or broad visual redesign is mixed into a risk-remediation pull request.

## Existing Strengths to Preserve

- The polymorphic `content` model has a clear discriminator and centralized validation path.
- Generic content writes reject unknown module types and private reads are checked server-side.
- JWT cookies are HTTP-only, secure in production, and same-site; password comparison is timing-safe.
- State-mutating API calls receive same-origin CSRF checks in the proxy.
- Notification credentials use AES-256-GCM, fresh IVs, typed error handling, deduplication, leases, retry/dead-letter state, and TTL cleanup.
- The widget max-height contract and shared widget primitives are clear and testable.
- Nine rich route loading boundaries and shared skeleton components prevent blank navigation states.
- Repository code follows the semantic theme color contract; the audit found zero forbidden hardcoded status-color occurrences.
- The 1,078-test suite is a valuable base once its environment is made deterministic.

These strengths should be extended rather than replaced during remediation.
