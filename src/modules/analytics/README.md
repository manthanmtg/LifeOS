# Analytics Module

## Overview

The Analytics module provides LifeOS behavior observability for both public and admin routes. It captures page views, action events, session duration, device mix, referrer intelligence, and module-level engagement. The admin dashboard gives a live summary of activity patterns and trend insights.

Registration is defined in `src/registry.ts`:

- Registry slug: `analytics`
- Module type: `metric`
- Default visibility: `false`
- Admin route: `/admin/analytics`

The module does not expose a public module view.

## Data Schema

Analytics events are stored in MongoDB in the shared `metrics` collection and validated with `MetricEventSchema` in `src/lib/schemas.ts`.

| Field | Type | Notes |
| --- | --- | --- |
| `path` | `string` | Full request path used for event context, defaulting to `/`. |
| `module` | `string` | Route module label, e.g. `blog`, `analytics`, `core`, etc. |
| `action` | `string` | Event type such as `page_view`, `session_start`, `session_end`, or module-specific action names. |
| `label` | `string \| null` | Optional free-text event label; commonly mirrors `pathname`. |
| `value` | `number \| null` | Optional numeric value, used for `session_end` duration in milliseconds. |
| `metadata` | `Record<string, unknown>` | Optional structured metadata bag. |
| `referrer` | `string \| null` | Referrer URL when available. |
| `device_type` | `enum` | One of `mobile`, `tablet`, `desktop`, or `unknown`. |
| `is_admin` | `boolean` | Client-supplied hint; server recalculates to prevent spoofing. |
| `_id` | `ObjectId` | Internal document identifier. |
| `timestamp` | `ISO datetime` | Server-generated ingest time. |
| `session_id` | `string` | Deterministic server-generated 12-char SHA-256 digest for the request day and device context. |

The API may store additional fields that are derived server-side (`is_admin`, `session_id`, `timestamp`).

## Admin Dashboard Features

`src/modules/analytics/AdminView.tsx` includes:

- Loading state and admin-facing skeleton rendering via `AdminModuleSkeleton`.
- Metric cards for total events, unique sessions, average session duration, active modules, and today-vs-yesterday trend.
- Module leaderboard and device split chart.
- Live event feed with action/module/path details.
- Action intelligence list by module/action pair.
- Hourly activity heatmap and referrer intelligence.
- Public vs admin daily stacked area chart.
- Controls for:
  - module filter (`all` / module name),
  - traffic source (`all`, `admin`, `public`),
  - metric type (`visitation`, `actions`, `combined`),
  - date range (`7D`, `30D`, `90D`).

The admin dashboard fetches events through:

```ts
await fetch(`/api/metrics?days=${dateRange}`);
```

## Widget Summary

`src/modules/analytics/Widget.tsx` follows the widget contract and uses:

```ts
/api/widgets/summary?module_type=analytics
```

The API returns:

```ts
interface AnalyticsSummary {
  todayCount: number;
  yesterdayCount: number;
}
```

`AnalyticsWidget` renders the current-day engagement count plus a trend highlight comparing yesterday.

## Tracking Pipeline

- `src/components/analytics/MetricsTracker.tsx` tracks route entry (`page_view`, `session_start`) and unload (`session_end`) events.
- `src/lib/analytics.ts` (`trackEvent`) provides a shared `POST /api/metrics` utility for custom actions.
- `POST /api/metrics` validates payloads and stores event documents in `metrics`.
- `GET /api/metrics?days=<1..365>` returns recent raw metrics for admin analysis.

### Common event payload examples

```ts
await trackEvent({
  module: "blog",
  action: "page_view",
  label: "/blog",
  path: "/blog",
  is_admin: false,
});
```

```ts
await trackEvent({
  module: "analytics",
  action: "button_click",
  label: "refresh-analytics",
  path: "/admin/analytics",
  value: 1,
  metadata: { source: "widget", target: "analytics-refresh" },
});
```

```ts
await fetch("/api/metrics", {
  method: "GET",
});
```
