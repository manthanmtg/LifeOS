# Settings About and Build Information

**Date:** 2026-08-01

**Status:** Ready for implementation

**Primary route:** `/admin/settings?tab=about`

**Scope:** Add an About tab to admin Settings and expose safe, portable build
and deployment metadata

## Goal

Add a sixth Settings section named **About**. It must identify the running
LifeOS build using the application version and Git revision, show when the
deployed artifact was produced in the current browser's local date/time and
timezone, and include a small set of non-secret deployment diagnostics.

This is a feature spanning the Settings UI and build configuration. It does
not change MongoDB data, application APIs, authentication, or deployment
behavior.

## Current State

- `src/app/admin/settings/page.tsx` is a client component that owns the full
  Settings screen. It defines a `SettingsTab` union and a `TABS` array for the
  current Themes, Modules, Branding, Notifications, and Data tabs.
- `?tab=<id>` is already read with `useSearchParams()`. A value is accepted only
  if it exists in `TABS`, so adding `about` to that array automatically enables
  direct navigation through `?tab=about`.
- The tab bar already uses horizontal overflow on narrow screens, which can
  accommodate a sixth item without changing the overall Settings layout.
- Settings has a route-level rich skeleton in
  `src/app/admin/settings/loading.tsx`. The proposed About content requires no
  network request and therefore does not need a new loading route or spinner.
- `package.json` contains the current application version (`0.1.0`), but its
  package name is the placeholder `tmp-app`. The version is usable; the package
  name is not a suitable product label.
- `next.config.ts` does not currently publish build metadata or customize the
  Next.js build/deployment ID.
- There is no current helper for resolving a commit SHA, build timestamp,
  deployment provider, deployment context, branch, or deploy identifier.
- Netlify is the repository's configured primary deployment target and exposes
  build-time metadata such as `COMMIT_REF`, `BUILD_ID`, `DEPLOY_ID`, `BRANCH`,
  and `CONTEXT`. The README also supports Vercel and generic Node/Docker
  deployments, so the feature must not depend only on Netlify variables.
- Next.js 16 can inline explicitly allowlisted values from the `env` section of
  `next.config.ts`. This is suitable here because every displayed field is
  intentionally public and must describe the artifact created by `next build`.
- The existing Settings page has no component-level test. Nearby admin tests
  use Vitest, Testing Library, shared Next navigation mocks, and global Framer
  Motion/Lucide mocks.

Relevant platform references:

- Next.js build-time environment inlining:
  <https://nextjs.org/docs/app/api-reference/config/next-config-js/env>
- Next.js build identifiers and self-hosting:
  <https://nextjs.org/docs/app/guides/self-hosting>
- Netlify read-only build metadata:
  <https://docs.netlify.com/build/configure-builds/environment-variables/>

## Requirements

### Functional requirements

- Add an **About** item to the Settings tab bar using a Lucide `Info` icon.
- Support direct navigation to `/admin/settings?tab=about` through the existing
  query-parameter validation behavior.
- Render the product name as `Life OS`; do not use the placeholder package
  name.
- Show these primary values:
  - Application version from `package.json`, prefixed with `v` in presentation.
  - Git revision as a seven-character short SHA, while retaining the full SHA
    in accessible/title text.
  - Deployment/build timestamp formatted in the browser's locale and local
    timezone, with an explicit UTC offset.
  - Environment/deploy context such as Production, Deploy preview, Branch
    deploy, Preview, or Development.
- Show these secondary diagnostics when available:
  - Deployment provider: Netlify, Vercel, GitHub Actions, or Local/self-hosted.
  - Git branch.
  - Provider deployment/build ID.
  - Browser IANA timezone, for example `Asia/Kolkata`.
  - Original UTC ISO timestamp so a report can be compared across timezones.
- Render a stable `Unavailable` value for optional metadata that cannot be
  resolved. Do not display `undefined`, an empty string, or `Invalid Date`.
- Update the Settings page description so About is represented without turning
  the sentence into a long enumeration.

### Metadata requirements

- Resolve all build metadata once when Next configuration is evaluated. The
  timestamp must remain stable for every page and process created from the same
  artifact.
- Treat `package.json` as the only application-version source of truth.
- Resolve the commit SHA in this priority order:
  1. Explicit `LIFEOS_COMMIT_SHA` build override.
  2. Netlify `COMMIT_REF`.
  3. Vercel `VERCEL_GIT_COMMIT_SHA`.
  4. GitHub Actions `GITHUB_SHA`.
  5. `git rev-parse HEAD` when Git metadata is present locally.
  6. Unavailable.
- Accept only a hexadecimal Git SHA of 7-64 characters. Trim all candidate
  values and ignore invalid overrides instead of publishing arbitrary content.
- Resolve the timestamp from an explicit, valid ISO `LIFEOS_DEPLOYED_AT`
  override when a deployment pipeline knows the exact publish time; otherwise
  use `new Date().toISOString()` at build/config evaluation time.
- Resolve provider, branch, context, and deploy ID from explicit `LIFEOS_*`
  overrides first, then from the detected platform's standard variables, then
  from safe local fallbacks.
- Use `execFileSync("git", [...])`, not a shell command string, for local Git
  fallback. Git lookup failure must be caught and must never fail `next dev`,
  `next typegen`, or `next build`.
- Inline only named, non-secret fields. Never spread `process.env` into Next.js
  configuration or the client bundle.
- Do not repurpose `generateBuildId` or `deploymentId`; this feature reports
  metadata and must not change Next.js cache/version-skew behavior.

### Presentation and responsive requirements

- Use one About header followed by a responsive primary information grid and a
  compact definition-list-style diagnostics section.
- At mobile widths, cards/rows stack without horizontal document scrolling.
- Long full SHAs and deploy IDs may wrap at safe character boundaries; labels
  and localized timestamps must remain readable at 200% zoom.
- Use existing semantic theme tokens and the zinc scale only. Do not introduce
  hardcoded Tailwind hue families, raw colors, gradients, or decorative glow.
- Use tabular/monospaced figures for version, SHA, IDs, and the source ISO
  timestamp.
- The timestamp must be formatted after browser mount so server locale/timezone
  cannot cause a hydration mismatch.
- If `Intl.DateTimeFormat` cannot produce `shortOffset`, fall back to a normal
  short timezone name while still displaying the resolved IANA timezone.
- No API fetch is required when About is opened; the tab must render immediately.

### Accessibility requirements

- Upgrade the existing tab bar to expose `tablist`, `tab`, `aria-selected`, and
  a labelled `tabpanel` while adding About. Preserve keyboard-focus styles and
  horizontal scrolling.
- Represent build details with semantic `dl`, `dt`, and `dd` elements rather
  than an unlabeled visual grid.
- Mark decorative icons as hidden from assistive technology.
- The short revision's accessible name or title must contain the full SHA.
- Missing metadata must be announced as `Unavailable`, not communicated only by
  muted color.

### Security, performance, and compatibility requirements

- Do not expose repository URLs, site/account IDs, credentials, database
  information, server paths, environment-variable names/values beyond the
  explicit metadata contract, or the full environment object.
- Do not create a public or admin API endpoint. Build metadata is immutable,
  non-secret, and can be compiled into the existing Settings client bundle.
- Do not write build metadata to MongoDB or add it to backup/export payloads.
- Existing deployments without provider metadata must continue to build and
  show version, generated timestamp, local context, and any locally resolvable
  Git revision.
- No new runtime or development dependency is required.

## Assumptions

- “About” means a sixth top-level Settings tab, matching the visual structure
  shown in the supplied screenshot, rather than a new sidebar route or footer.
- “App version” means the semantic version in `package.json`; the commit SHA is
  shown separately as the exact code revision.
- “Deployed time” is displayed as **Deployed (build time)**. Without an
  authenticated provider callback there is no portable exact publish
  timestamp, so the automatic value is the time the artifact was generated.
  `LIFEOS_DEPLOYED_AT` allows a deployment pipeline to supply a more exact ISO
  time later without redesigning the UI.
- The build timestamp may precede provider publication by the build/upload
  duration. The label and supporting text must not claim second-level publish
  precision when the fallback is used.
- The browser's default locale is the correct date/time locale. The browser's
  resolved IANA timezone and formatted UTC offset are both shown so the value
  is unambiguous.
- `package.json` remains at version `0.1.0` until the project deliberately bumps
  it. Implementing About does not itself warrant a version change.
- Provider build/deploy IDs are operational identifiers, not secrets. Account
  IDs, repository URLs, and deployment admin URLs remain excluded.
- Tab clicks retain the current in-memory behavior. This plan enables direct
  `?tab=about` links through the existing reader but does not redesign all tab
  clicks to mutate browser history.
- No generated image or illustration is needed; this is an operational
  information screen and should use the existing product UI language.

## Proposed Design

### 1. Build-time metadata resolver

Create `src/lib/build-info-config.ts` as a Node-only build/configuration helper.
It will export a typed `resolveBuildInfo()` function that receives injectable
inputs for deterministic tests:

- an environment record;
- the application version;
- the current `Date`/ISO source;
- an optional Git command reader.

The resolved contract is:

```ts
interface ResolvedBuildInfo {
  version: string;
  commitSha: string | null;
  deployedAt: string;
  provider: "netlify" | "vercel" | "github-actions" | "local" | "unknown";
  context: string;
  branch: string | null;
  deployId: string | null;
}
```

Keep candidate selection and normalization pure. Put actual `execFileSync`
calls behind the default Git reader so tests never invoke the user's Git
binary. Validate the explicit timestamp before accepting it, and always return
a valid ISO string by falling back to the injected current time.

Provider-specific mapping:

| Field   | Explicit override       | Netlify                      | Vercel                  | GitHub Actions               | Local fallback              |
| ------- | ----------------------- | ---------------------------- | ----------------------- | ---------------------------- | --------------------------- |
| Commit  | `LIFEOS_COMMIT_SHA`     | `COMMIT_REF`                 | `VERCEL_GIT_COMMIT_SHA` | `GITHUB_SHA`                 | `git rev-parse HEAD`        |
| Time    | `LIFEOS_DEPLOYED_AT`    | Build/config time            | Build/config time       | Build/config time            | Config/dev-server time      |
| Context | `LIFEOS_DEPLOY_CONTEXT` | `CONTEXT`                    | `VERCEL_ENV`            | `GITHUB_REF_TYPE`/`NODE_ENV` | `NODE_ENV`                  |
| Branch  | `LIFEOS_BRANCH`         | `BRANCH` or `HEAD`           | `VERCEL_GIT_COMMIT_REF` | `GITHUB_REF_NAME`            | `git branch --show-current` |
| ID      | `LIFEOS_DEPLOY_ID`      | `DEPLOY_ID`, then `BUILD_ID` | `VERCEL_DEPLOYMENT_ID`  | `GITHUB_RUN_ID`              | Unavailable                 |

Normalize context only for presentation in the browser helper; retain a simple
trimmed source value in the resolved contract. A detached local HEAD is valid:
the commit is still shown and branch is unavailable.

### 2. Compile the safe contract into the application

Modify `next.config.ts` to import the `package.json` version and call
`resolveBuildInfo()` once at module evaluation. Add only the following
allowlisted strings to `nextConfig.env`:

- `NEXT_PUBLIC_LIFEOS_VERSION`
- `NEXT_PUBLIC_LIFEOS_COMMIT_SHA`
- `NEXT_PUBLIC_LIFEOS_DEPLOYED_AT`
- `NEXT_PUBLIC_LIFEOS_DEPLOY_PROVIDER`
- `NEXT_PUBLIC_LIFEOS_DEPLOY_CONTEXT`
- `NEXT_PUBLIC_LIFEOS_BRANCH`
- `NEXT_PUBLIC_LIFEOS_DEPLOY_ID`

Convert nullable values to empty strings at this boundary because Next config
environment values must be strings. Client parsing converts empty values back
to `null`. Do not log the metadata or the source environment during builds.

### 3. Browser-safe contract and formatting

Create `src/lib/build-info.ts` with no Node-only imports. It will:

- Define and export the browser-facing `AppBuildInfo` type.
- Read each injected value through a direct static `process.env.KEY` reference
  so Next.js can replace it at build time.
- Normalize empty or whitespace-only optional fields to `null`.
- Export `shortCommitSha()` that returns the first seven characters or
  `Unavailable`.
- Export `formatDeployContext()` that maps known platform values to readable
  labels without losing unknown custom context names.
- Export `formatBrowserDeploymentTime()` that validates the ISO value and uses
  the browser's default locale/timezone with year, abbreviated month, day,
  hour, minute, second, and `timeZoneName: "shortOffset"`; retry with
  `timeZoneName: "short"` if needed.
- Export `getBrowserTimeZone()` using
  `Intl.DateTimeFormat().resolvedOptions().timeZone`, falling back to
  `Unavailable`.

The formatter must never throw from an unsupported timezone formatting option
or invalid date. Its terminal fallback is `Unavailable`.

### 4. About Settings component

Create `src/components/settings/AboutSettingsTab.tsx` as a focused client
component. Keeping it out of the already large Settings page makes the feature
testable and avoids adding metadata formatting to unrelated settings state.

Recommended content hierarchy:

```text
About Life OS
Build and deployment details for this running instance.

+----------------------+  +----------------------+
| APP VERSION          |  | REVISION             |
| v0.1.0               |  | 1de8072              |
+----------------------+  +----------------------+
| DEPLOYED (BUILD TIME)|  | ENVIRONMENT          |
| Aug 1, 2026 ...      |  | Production           |
+----------------------+  +----------------------+

Build details
Provider             Netlify
Branch               main
Deployment ID        ...
Browser timezone     Asia/Kolkata
Source time (UTC)    2026-08-01T08:00:00.000Z
```

Use a responsive `grid-cols-1 sm:grid-cols-2` primary grid and a single bordered
`dl` for secondary rows. Values use zinc/semantic tokens and established
Settings radii/borders. The timestamp state is populated in `useEffect`; until
mount, render a small `SkeletonBlock` in that value slot rather than formatting
on the server.

Do not add copy buttons, outbound Git/provider links, release notes, update
checks, or network status in the first version. Those can be added later only
if there is a concrete workflow requiring them.

### 5. Settings integration

Modify `src/app/admin/settings/page.tsx` to:

- Import `AboutSettingsTab` and the Lucide icon chosen for the About tab.
- Extend `SettingsTab` with `"about"`.
- Append `{ id: "about", label: "About", icon: Info }` to `TABS` after Data.
- Update the page subtitle to `Manage your workspace and system settings.`
- Render `<AboutSettingsTab />` when `activeTab === "about"`.
- Add tab semantics to the existing tab bar and a stable ID relationship
  between each tab and the single animated panel.
- Keep all current state, fetch behavior, tab order, animations, and tab click
  behavior unchanged.

Opening About must not trigger `/api/db-stats`; the existing effect already
limits that fetch to `activeTab === "data"`.

### 6. Operational documentation

Update `.env.local.example` with a clearly optional Build/About block for the
five `LIFEOS_*` overrides. Explain that normal Netlify/Vercel/Git builds do not
need them and that `LIFEOS_DEPLOYED_AT` must be an ISO 8601 timestamp.

Update `src/lib/README.md` to document:

- the two build-info files and their client/build boundary;
- metadata resolution priority;
- the public allowlist security rule;
- the distinction between automatic build time and provider publish time;
- fallback behavior on generic self-hosted deployments.

No top-level README feature-list update is required for this small admin-only
diagnostic surface.

## Files To Change

| File                                                          | Action | Detailed Change                                                                                                                                                                            |
| ------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `next.config.ts`                                              | Modify | Resolve metadata once from package/platform/Git inputs and inline only seven allowlisted public strings; preserve all existing headers, standalone output, and experimental configuration. |
| `src/lib/build-info-config.ts`                                | Create | Add the testable Node/build-only metadata resolver, validation, provider detection, candidate priorities, and non-throwing Git fallbacks.                                                  |
| `src/lib/build-info.ts`                                       | Create | Add the browser-safe typed constant plus commit, context, timestamp, and timezone formatting helpers.                                                                                      |
| `src/components/settings/AboutSettingsTab.tsx`                | Create | Render the responsive, accessible About UI with local-time formatting after mount and explicit unavailable states.                                                                         |
| `src/app/admin/settings/page.tsx`                             | Modify | Register and render the About tab, update Settings copy, and add complete tab semantics without changing existing tab state behavior.                                                      |
| `src/lib/__tests__/build-info-config.test.ts`                 | Create | Verify provider precedence, validation, Git fallback, timestamp stability, and missing-data behavior.                                                                                      |
| `src/lib/__tests__/build-info.test.ts`                        | Create | Verify browser normalization and formatters, including invalid date and timezone-option fallback behavior.                                                                                 |
| `src/components/settings/__tests__/AboutSettingsTab.test.tsx` | Create | Verify visible primary/secondary fields, full-SHA accessibility, local timezone display, skeleton-to-value transition, and unavailable fallbacks.                                          |
| `src/app/admin/settings/__tests__/page.test.tsx`              | Create | Verify the sixth tab is registered, `?tab=about` selects its panel, tab ARIA relationships are valid, and About does not fetch database stats.                                             |
| `.env.local.example`                                          | Modify | Document optional, non-secret metadata overrides and ISO timestamp format; keep all current required/notification variables unchanged.                                                     |
| `src/lib/README.md`                                           | Modify | Document metadata ownership, resolution order, public exposure boundary, and build-time semantics.                                                                                         |

No files are deleted. No API route, schema, database migration, or package
dependency is added.

## Implementation Phases

### Phase 1: Define and test build metadata resolution

1. Add failing cases in `src/lib/__tests__/build-info-config.test.ts` for:
   - version passthrough from `package.json` input;
   - explicit override precedence;
   - Netlify, Vercel, and GitHub field mapping;
   - Git fallback when platform variables are absent;
   - a detached HEAD/missing branch;
   - invalid SHA rejection;
   - valid explicit ISO time acceptance;
   - invalid explicit time falling back to the injected current time;
   - Git command failure returning nullable fields without throwing.
2. Implement `src/lib/build-info-config.ts` until those focused tests pass.
3. Keep the resolver deterministic by injecting the clock and Git reader.

### Phase 2: Inject the allowlisted build contract

1. Modify `next.config.ts` to read the package version and resolve metadata at
   module evaluation.
2. Add the seven explicit `NEXT_PUBLIC_LIFEOS_*` values to `nextConfig.env`.
3. Run `pnpm typecheck` and a production `pnpm build` with normal local
   environment values to prove missing provider variables are non-fatal.
4. Inspect the build output/logs only for success; do not print the source
   environment or metadata.

### Phase 3: Add browser formatting helpers

1. Add failing tests in `src/lib/__tests__/build-info.test.ts` for empty-value
   normalization, short SHA, readable context labels, valid local formatting,
   invalid date fallback, timezone-option fallback, and missing IANA timezone.
2. Implement the browser-safe contract and helpers in
   `src/lib/build-info.ts`.
3. Ensure imports from this file do not transitively include
   `node:child_process` or the configuration resolver.

### Phase 4: Build the About presentation

1. Add component tests for the desired semantic labels and values.
2. Implement `AboutSettingsTab.tsx` with a primary grid, details `dl`, mounted
   local-time formatting, and a `SkeletonBlock` before formatting is ready.
3. Verify long IDs wrap within the component at narrow widths and the full
   commit remains available to assistive technology.
4. Use only Lucide icons, `cn()` where conditional styling is needed, semantic
   colors, and zinc tokens.

### Phase 5: Wire the sixth Settings tab

1. Add `src/app/admin/settings/__tests__/page.test.tsx` with minimal system API,
   registry, theme, and dynamic-import mocks.
2. Extend the union/registry, render the new component, and update subtitle
   copy in `src/app/admin/settings/page.tsx`.
3. Add tab roles, selected state, and panel relationships for all six Settings
   tabs as one coherent accessibility change.
4. Verify Data remains the only tab that invokes `/api/db-stats`.

### Phase 6: Document and verify

1. Document optional metadata overrides in `.env.local.example` and ownership
   in `src/lib/README.md`.
2. Run focused tests while iterating.
3. Run `pnpm format`.
4. Run `pnpm check` as the required final regression suite.
5. Start `pnpm dev` and visually verify
   `/admin/settings?tab=about` with Playwright on desktop and mobile.

## Testing Plan

| Test                 | File or Command                                                                                                                                                                                            | Purpose                                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Resolver unit        | `src/lib/__tests__/build-info-config.test.ts`                                                                                                                                                              | Prove field priority, platform mapping, validation, stable time, and non-throwing local Git fallbacks.                  |
| Client helper unit   | `src/lib/__tests__/build-info.test.ts`                                                                                                                                                                     | Prove empty normalization and resilient browser locale/timezone formatting.                                             |
| About component      | `src/components/settings/__tests__/AboutSettingsTab.test.tsx`                                                                                                                                              | Prove the requested values and semantic/accessibility behavior render without network access.                           |
| Settings integration | `src/app/admin/settings/__tests__/page.test.tsx`                                                                                                                                                           | Prove sixth-tab registration, direct-query selection, tab ARIA, and no DB-stats request from About.                     |
| Focused suite        | `pnpm test -- src/lib/__tests__/build-info-config.test.ts src/lib/__tests__/build-info.test.ts src/components/settings/__tests__/AboutSettingsTab.test.tsx src/app/admin/settings/__tests__/page.test.tsx` | Fast iteration over all new behavior.                                                                                   |
| Type/build           | `pnpm typecheck && pnpm build`                                                                                                                                                                             | Prove Node-only and client-only boundaries compile in Next.js 16 and missing provider variables do not break the build. |
| Formatting           | `pnpm format`                                                                                                                                                                                              | Apply repository formatting before the final regression suite.                                                          |
| Full regression      | `pnpm check`                                                                                                                                                                                               | Run lint, typecheck, production build, and all Vitest tests as required by `AGENTS.md`.                                 |
| Desktop visual       | Playwright at `/admin/settings?tab=about`, approximately 1440×900                                                                                                                                          | Verify tab bar, information hierarchy, both theme modes, timestamp, and no overflow.                                    |
| Mobile visual        | Playwright at `/admin/settings?tab=about`, 375×812                                                                                                                                                         | Verify horizontal tab access, stacked cards, wrapped IDs, and no document-level horizontal scroll.                      |
| Zoom/accessibility   | Browser at 200% zoom plus keyboard navigation                                                                                                                                                              | Verify readable values, visible focus, selected-tab announcement, and panel relationship.                               |

For date-format tests, inject or mock locale/timezone behavior. Do not assert the
implementer's machine timezone or punctuation from the host ICU database.

## Edge Cases

- Netlify production, deploy preview, and branch deploy contexts.
- Vercel production and preview builds.
- GitHub Actions build without a provider deployment ID.
- Generic local `pnpm dev` and `pnpm build` with `.git` present.
- Docker or source archive build with no `.git` directory.
- Detached Git HEAD with a valid revision and no branch.
- Shallow clone with a valid HEAD.
- Missing or blank platform variables.
- Invalid explicit commit SHA.
- Invalid explicit deployment timestamp.
- Timestamp before or during a daylight-saving transition.
- Browser locale using 12-hour time and one using 24-hour time.
- Browser returning a timezone alias or no IANA timezone.
- Browser lacking `shortOffset` support.
- Very long custom branch, context, or deploy ID.
- `package.json` version with a prerelease suffix.
- Settings opened on About before the system-config fetch finishes or fails.
- Switching repeatedly between Data and About; About must not refresh DB stats.
- JavaScript disabled is outside the current client-rendered Settings contract.

## Risks And Mitigations

| Risk                                                           | Mitigation                                                                                                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| “Deployed” implies an exact provider publication time          | Label it `Deployed (build time)`, explain artifact-generation semantics, and support an explicit exact ISO override.                                          |
| Client bundle accidentally exposes secrets                     | Use seven literal allowlisted keys; never serialize or spread `process.env`; test only the public contract.                                                   |
| Git is unavailable during a build                              | Catch `execFileSync` failures and render `Unavailable`; version and timestamp still work.                                                                     |
| Local Git fallback makes config or type generation flaky       | Inject and unit-test the reader, suppress only expected command failure output, and never require Git success.                                                |
| Browser/server timezone causes hydration mismatch              | Format only after mount and use a skeleton until the client value is available.                                                                               |
| Platform-specific variables make self-hosting regress          | Keep explicit overrides, Git/local fallbacks, nullable optional fields, and no required new environment variable.                                             |
| Public metadata goes stale after image promotion               | Treat values as artifact metadata; document that build-time values are immutable and exact runtime promotion time requires `LIFEOS_DEPLOYED_AT` during build. |
| Adding a sixth tab becomes cramped                             | Preserve horizontal overflow, verify 375px, and keep compact existing tab styling.                                                                            |
| Settings page test becomes brittle because the file is large   | Keep presentation/formatting tests in the extracted component and helper; integration-test only registration, query selection, ARIA, and fetch isolation.     |
| Changing Next build IDs creates cache/version skew regressions | Do not set `generateBuildId` or `deploymentId`; report metadata only.                                                                                         |

## Rollout And Rollback

- No database migration, API version, data backfill, feature flag, or new secret
  is required.
- Netlify and Vercel builds automatically supply the preferred Git/provider
  fields. Generic builds gracefully use Git and current build time.
- After `pnpm check`, deploy through the existing remote Git-based workflow.
  Confirm About on the unique deploy URL before relying on the production URL,
  consistent with the repository's Netlify cache postmortem guidance.
- Compare the displayed short SHA with the commit deployed and confirm the
  localized time includes both an offset and the browser IANA timezone.
- Rollback is a code revert of the About component, helper/config additions,
  Settings registration, tests, and documentation. There is no persisted state
  to undo.
- Optional `LIFEOS_*` variables can remain harmlessly after rollback, though
  they should be removed from deployment configuration if no longer used.

## Non-Goals

- Renaming the `tmp-app` package.
- Automatically incrementing semantic versions or introducing release tooling.
- Changing Next.js `generateBuildId`, `deploymentId`, caching, or skew protection.
- Querying Netlify, Vercel, or GitHub APIs at runtime.
- Adding provider access tokens or authenticated deployment webhooks.
- Writing build information to MongoDB, metrics, exports, or imports.
- Exposing repository/account URLs, host paths, secrets, or arbitrary
  environment variables.
- Adding release notes, changelog browsing, update availability, uptime,
  database health, or dependency inventory to About.
- Adding copy-to-clipboard actions or outbound commit/deploy links in the first
  version.
- Redesigning all Settings tabs, changing their click/history behavior, or
  splitting the large Settings page beyond the new About component.
- Adding public-site version information.

## Implementer Handoff Checklist

- [ ] Read this document and the current Settings, Next config, deployment, and
      test files before editing.
- [ ] Keep `package.json` as the version source and `Life OS` as the product
      label.
- [ ] Add failing resolver tests before the resolver implementation.
- [ ] Preserve the documented metadata priority and validate SHA/timestamp
      overrides.
- [ ] Ensure Git fallback can never fail config loading or production builds.
- [ ] Inline only the seven allowlisted public metadata strings.
- [ ] Keep Node-only build resolution separate from browser-safe formatting.
- [ ] Format deployment time after mount in the browser's locale and timezone.
- [ ] Show an explicit UTC offset, IANA timezone, and stable unavailable states.
- [ ] Add the About component with semantic `dl` markup and no fetch.
- [ ] Register About as the sixth Settings tab and support `?tab=about`.
- [ ] Add complete tab semantics without changing existing tab behavior.
- [ ] Confirm opening About never invokes `/api/db-stats`.
- [ ] Use only semantic/zinc colors and existing component/icon patterns.
- [ ] Document optional overrides and build-vs-publish timestamp semantics.
- [ ] Run focused tests, `pnpm format`, and `pnpm check`.
- [ ] Visually verify desktop, mobile, light/dark themes, keyboard navigation,
      200% zoom, long identifiers, and fallback metadata.
