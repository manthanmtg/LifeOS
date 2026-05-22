# Crop History

Track yield, price, and revenue data for multiple crops across configurable areas and periods.

## Overview

Crop History stores `content` documents with `module_type: "crop_history"` and uses module settings (`cropHistorySettings`) for crop/area definitions and formulas.

- Admin route: `/admin/crop-history`
- Widget route: `/admin` card (via `src/modules/crop-history/Widget.tsx`)
- No public view is exposed.

## Data Model

Each record payload follows `CropHistorySchema`:

```json
{
  "crop_id": "coffee",
  "schedule_period": "2026-H1",
  "source_data": {
    "area-west": {
      "undried": 1200,
      "ot": 82
    }
  },
  "summary_data": {
    "avg_price": 4200
  },
  "notes": "Weather was dry this period."
}
```

### Module settings (`cropHistorySettings`)

- `crops: CropConfig[]`
  - `id`, `name`, `scheduleType` (`yearly` / `half-yearly` / `quarterly` / `monthly` / `custom`)
  - `sourceFields`, `summaryFields`, `calculatedFields`, optional `constants`
  - optional `analyticsConfig` tags and optional `periodOrder` overrides
- `sources: AreaDef[]` shared across all crops

## Features

- **Spreadsheet tab** for period-by-period per-area and period-level entry
- **Settings tab** for crop fields, formulas, constants, and areas
- **Analytics tab** for computed trend summary
- **Docs tab** with formula reference and usage notes
- Dashboard widget summary from `/api/widgets/summary?module_type=crop_history`

## Smart capabilities

- Per-area source fields with auto-aggregation (SUM/AVG/MIN/MAX/COUNT)
- Cross-area weighted calculations (`WEIGHTED_AVG`)
- Derived fields from formulas and constants (`ROUND`, arithmetic operators)
- Optional custom period ordering with `periodOrder`
- Last-revenue trend displayed in widget (`+/-% vs previous period`)

## API usage

- Fetch records: `GET /api/content?module_type=crop_history`
- Fetch summary: `GET /api/widgets/summary?module_type=crop_history`

Use this doc as a quick starting point for operators and for keeping local module notes in sync with implementation.
