# LifeOS Core Library (`src/lib`)

The `src/lib` directory is the shared service layer for LifeOS. It provides:

- Content schema validation contracts used by API routes.
- Data and persistence helpers for system state and MongoDB.
- Module ordering/search utilities for admin shell features.
- Build and deployment metadata helpers for Settings -> About.
- Notification contracts, adapters, source registries, encryption, and dispatch.
- Lightweight UI utility helpers for analytics, formatting, and class merging.

Keep changes in this directory small and API-oriented; most module behavior should remain in `src/modules` and `src/app`.

## Module map

| File                   | Responsibility                                                         | Key exports                                                   |
| ---------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| `schemas.ts`           | Authoritative Zod payload contracts and module schema registry         | `SchemaRegistry`, `*Schema` exports                           |
| `types.ts`             | Shared interfaces used by API contracts and content typing             | `SystemConfig`, `ContentDocument`, `BlogPostPayload`          |
| `admin-modules.ts`     | Module registry filtering + sorting for dashboard navigation           | `getDisabledModules`, `getOrderedAdminModules`                |
| `mongodb.ts`           | MongoDB client caching and database factory                            | `getDb`                                                       |
| `seed.ts`              | First-run bootstrap for system config and indexes                      | `ensureSystemConfig`                                          |
| `auth.ts`              | JWT sign/verify helpers for admin auth middleware/API auth             | `signToken`, `verifyToken`                                    |
| `api-response.ts`      | Shared NextResponse helpers for consistent JSON shape                  | `ApiSuccess`, `ApiError`, `ApiValidationError`, `ApiNotFound` |
| `module-search.ts`     | Tokenized matching for module search with score and highlights         | `getModuleSearchResults`, `highlightText`                     |
| `analytics.ts`         | Client-side analytics event sender used by widgets and feature actions | `trackEvent`                                                  |
| `metrics-cache.ts`     | Cached metric aggregation for visit-tier sorting and dashboards        | `getTieredVisits`                                             |
| `formatters.ts`        | Currency/number formatting helpers                                     | `formatNumber`, `formatCurrency`                              |
| `build-info-config.ts` | Node/build-time About metadata resolver                                | `resolveBuildInfo`                                            |
| `build-info.ts`        | Browser-safe About metadata contract and formatters                    | `APP_BUILD_INFO`, `formatBrowserDeploymentTime`               |
| `utils.ts`             | Tailwind class merge helper                                            | `cn`                                                          |
| `cropImage.ts`         | Browser-side image crop utility for image upload/edit flows            | `getCroppedImg`                                               |
| `notifications/`       | Shared notification platform with Telegram v1 support                  | `runNotificationDispatch`, source and adapter registries      |

## Zod schema registry (`SchemaRegistry`)

`SchemaRegistry` maps `module_type` values (stored in the `content` collection) to the payload schemas used by:

- `POST /api/content`
- `PUT /api/content/[id]`
- module-level admin editors during read/validation paths

Current `module_type` keys:

- `expense`
- `blog_post`
- `portfolio_profile`
- `recurring_expense`
- `reading_item`
- `book`
- `idea`
- `snippet`
- `habit`
- `calculator_profile`
- `metric`
- `compass_task`
- `emi_loan`
- `crop_history`
- `rain_area`
- `rain_entry`
- `todo`
- `shopping_list`
- `portfolio_resume`
- `ai_usage`
- `person`
- `vehicle`
- `maintenance_task`
- `health_profile`
- `whiteboard_note`
- `binge_item`
- `deck`
- `bill`
- `bill_folder`

See the registry in `src/registry.ts` for module-to-content-type mapping used by admin modules and widgets.

## Data layer usage pattern

### System bootstrap in server routes

```ts
import { ensureSystemConfig } from "@/lib/seed";

export async function GET() {
  await ensureSystemConfig();
  // continue request logic
}
```

### Fetching a database instance

```ts
import { getDb } from "@/lib/mongodb";

const db = await getDb();
const collection = db.collection("content");
```

### Standardized API responses

```ts
import { ApiSuccess, ApiValidationError } from "@/lib/api-response";

if (!payloadValid) {
  return ApiValidationError(validation.error.format());
}

return ApiSuccess({ id: result.insertedId.toString() });
```

### Module ordering and visibility logic

```ts
import { getOrderedAdminModules } from "@/lib/admin-modules";

const modules = getOrderedAdminModules(systemConfig);
// feed modules into sidebar or command palette collections
```

### Client analytics helper

```ts
import { trackEvent } from "@/lib/analytics";

trackEvent({
  module: "dashboard",
  action: "widget_open",
  label: "expenses-widget",
});
```

## Settings About build metadata

`build-info-config.ts` is the Node-only resolver used by `next.config.ts`.
It reads `package.json` version, safe deployment variables, and local Git
fallbacks once when Next configuration is evaluated. It never spreads
`process.env`, never requires Git to be present, and only returns the explicit
public fields needed by Settings -> About.

`build-info.ts` is browser-safe. It reads only the seven
`NEXT_PUBLIC_LIFEOS_*` values inlined by Next config and formats them for the
About tab. Do not import `build-info-config.ts` from client components.

Metadata priority:

1. Explicit `LIFEOS_*` build overrides.
2. Netlify, Vercel, or GitHub Actions build metadata.
3. Local Git fallback for commit and branch when `.git` is available.
4. `Unavailable` for optional fields that still cannot be resolved.

The automatic `deployedAt` value is artifact build/config time. If a deployment
pipeline knows the exact provider publish time, set `LIFEOS_DEPLOYED_AT` to an
ISO 8601 timestamp during the build. Generic self-hosted or Docker builds still
show version, build time, local context, and any Git revision that can be read.

## File-level notes

### `schemas.ts`

- Keep helper types (`CalendarDateSchema`, `CurrencyCodeSchema`, etc.) internal unless a new module needs sharing.
- Export concrete schema constants when they are used across routes/APIs.
- Update `SchemaRegistry` whenever a new `contentType`/module is introduced.

### `admin-modules.ts`

- `getOrderedAdminModules` respects `orderingStrategy` and `moduleOrder` from `SystemConfig`.
- Strategy modes:
  - `name`: alphabetical
  - `visits`: module visit tiers from `tieredVisits`
  - `custom`: explicit `moduleOrder`
- Disabled modules are derived from `SystemConfig.moduleRegistry`.

### `metrics-cache.ts`

- Aggregates 90 days of metrics into 7/30/60/90 day buckets.
- Caches results in-memory for 5 minutes.
- If MongoDB aggregation fails, stale cache is returned when available to avoid UI breakage.

### `auth.ts`

- Uses `jose` HMAC HS256 with issuer/audience constants.
- Requires `JWT_SECRET` from environment variables.

### `notifications/`

- `contracts.ts` and `schemas.ts` define browser-safe notification DTOs,
  settings, and item preference contracts.
- `crypto.ts` encrypts adapter credentials with AES-256-GCM using
  `NOTIFICATION_ENCRYPTION_KEY` first, then the admin-generated key stored on
  the global system document.
- `repositories.ts` owns the `notification_channels` and
  `notification_deliveries` collections, including dedupe, claim, retry, and
  TTL indexes.
- `sources/recurring-expenses.ts` turns due recurring-expense renewals into
  provider-neutral candidates.
- `adapters/telegram.ts` validates Telegram bot connections and sends plain
  text messages.
- `dispatcher.ts` is the shared scheduled/manual entry point used by the
  Netlify function and `/api/notifications/dispatch`.

## Related docs

- `AGENTS.md`: developer run contract and repo-wide conventions
- `src/lib` consumers: `src/app`, `src/components`, `src/modules`, `src/registry.ts`
