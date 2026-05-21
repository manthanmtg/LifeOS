# Habits Module

The Habits module tracks recurring routines and supports consistency tracking with streak and weekly trend insights. It stores habits in the shared `content` collection via the existing discriminator model (`module_type: "habit"`) and renders as:

- Admin CRUD in `/admin/habits`
- Public dashboard cards via `PublicView` at `/habits` (when exposed in routing)
- Dashboard widget on `/admin`

## Runtime surface

- Admin view: `src/modules/habits/AdminView.tsx`
- Public view: `src/modules/habits/PublicView.tsx`
- Widget: `src/modules/habits/Widget.tsx`
- Types and utilities: `src/modules/habits/components/types.ts`
- Registry: `src/registry.ts`
- API contract: `src/lib/schemas.ts` (`HabitSchema`)

## Data model (`module_type: habit`)

A habit item payload contains:

| Field | Type | Notes |
| --- | --- | --- |
| `name` | `string` | Habit title, required, max length 100.
| `description` | `string?` | Optional plain-text description, max length 500.
| `frequency` | `"daily" \\| "weekly"` | Defaults to `"daily"`.
| `target_count` | `number` | Integer, positive, defaults to `1`.
| `color` | `string` | Hex color code (`#RGB` or `#RRGGBB`), defaults to `"#10b981"`.
| `completions` | `Array<{ date, count }>` | Defaults to `[]`.
| `completions[].date` | `string` | Must match `YYYY-MM-DD`.
| `completions[].count` | `number` | Integer `>= 0`, defaults to `1`.

In `ContentDocument`, payload is persisted under `payload` and registered as `habit` in `SchemaRegistry`.

## Features

### Admin behavior

- Create / edit habits with color, frequency, target, and optional notes.
- Toggle completion per date directly from habit cards (`HabitCard` interaction).
- Track rolling completion metrics in `HabitsMetrics`:
  - total habits
  - completed today
  - best current streak
  - weekly completion rate and trend
- Configure defaults in module settings:
  - `defaultFrequency`
  - `defaultTarget`
  - `weekStartMon`
  - `heatmapMonths`

### Public behavior

- 30-day mini heatmap-style visualization with current streak and completion trend.
- Completion badges for today and streak states.
- Weekly completion percentage (`x/30 days`) from completion log.

### Widget behavior

`src/modules/habits/Widget.tsx` hits:

- `GET /api/widgets/summary?module_type=habit`

It presents:

- Hero metric (`completed today / total habits`)
- Highlight state (`warning`, `success`, or `accent` variant)
- Link: `/admin/habits`

## Payload example

```json
{
  "module_type": "habit",
  "is_public": false,
  "payload": {
    "name": "Morning walk",
    "description": "10-minute walk before coffee.",
    "frequency": "daily",
    "target_count": 1,
    "color": "#10b981",
    "completions": [
      {
        "date": "2026-05-21",
        "count": 1
      }
    ]
  }
}
```

Create with curl:

```bash
curl -X POST http://localhost:3091/api/content \
  -H 'content-type: application/json' \
  -d '{"module_type":"habit","is_public":false,"payload":{"name":"Morning walk","frequency":"daily","target_count":1,"color":"#10b981","completions":[]}}'
```

Update an existing record:

```bash
curl -X PUT http://localhost:3091/api/content/<habit-id> \
  -H 'content-type: application/json' \
  -d '{"payload":{"name":"Morning walk","description":"Tracked habit","frequency":"daily","target_count":1,"color":"#10b981","completions":[{"date":"2026-05-21","count":1}]}}'
```

Delete:

```bash
curl -X DELETE http://localhost:3091/api/content/<habit-id>
```

## Cross-module references

- Module registration: `src/registry.ts` (`habits` slug -> `contentType: "habit"`)
- Schema entry: `src/lib/schemas.ts` (`habit` key in `SchemaRegistry`)
- Settings persistence: `src/hooks/useModuleSettings.ts`
- API read/listing: `src/app/api/content/route.ts`
- API summary route: `src/app/api/widgets/summary/route.ts`
