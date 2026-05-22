# Vehicle Module

## Overview

The Vehicle module tracks ownership and maintenance data for one or more vehicles.
It stores each vehicle in the shared `content` collection with `module_type:
vehicle` and provides a private admin workflow at `/admin/vehicle`.

## Registration

- **Module slug**: `vehicle`
- **Content type**: `vehicle`
- **Icon**: `Car`
- **Default visibility**: private
- **Location**: `src/modules/vehicle`
- **Registry**: `src/registry.ts`

## Data Schema

Vehicle records are validated by `VehicleSchema` in `src/lib/schemas.ts` and are
stored in the document `payload` field.

### Top-level payload fields

| Field | Type | Notes |
| --- | --- | --- |
| `name` | `string` | Required vehicle label. |
| `make` | `string` | Optional manufacturer/brand. |
| `model` | `string` | Optional model name. |
| `year` | `number` | Optional year, min `1886`, max next year. |
| `registration_number` | `string` | Optional registration / plate value. |
| `color` | `string` | Optional color value. |
| `fuel_type` | enum | `petrol`, `diesel`, `electric`, `hybrid`, `cng`, `lpg`, `other` (default `petrol`). |
| `odometer_reading` | `number` | Current odometer value; must be >= 0. |
| `odometer_unit` | enum | `km` or `mi` (default `km`). |
| `insurance_expiry` | `string` | Optional ISO datetime. |
| `pollution_certificate_expiry` | `string` | Optional ISO datetime. |
| `next_service_due` | `string` | Optional ISO datetime. |
| `next_service_odometer` | `number` | Optional odometer target for next service. |
| `notes` | `string` | Optional free-text notes. |
| `service_records` | `ServiceRecord[]` | See table below. Defaults to `[]`. |
| `fuel_logs` | `FuelLog[]` | See table below. Defaults to `[]`. |
| `documents` | `VehicleDocument[]` | See table below. Defaults to `[]`. |

### `ServiceRecord`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Auto-generated UUID-like string by default. |
| `date` | `string` | ISO datetime. |
| `type` | enum | `routine`, `repair`, `inspection`, `tire`, `oil_change`, `brake`, `battery`, `wash`, `other` (default `routine`). |
| `description` | `string` | Required description. |
| `odometer` | `number` | Optional odometer snapshot. |
| `cost` | `number` | Optional service cost (>= 0). |
| `currency` | `string` | ISO 4217 code, default `INR`. |
| `garage` | `string` | Optional garage/vendor name. |
| `notes` | `string` | Optional notes. |

### `FuelLog`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Auto-generated UUID-like string by default. |
| `date` | `string` | ISO datetime. |
| `quantity` | `number` | Fuel quantity, must be > 0. |
| `fuel_unit` | enum | `liters` or `gallons` (default `liters`). |
| `cost` | `number` | Total fill cost. |
| `currency` | `string` | ISO 4217 code, default `INR`. |
| `odometer` | `number` | Optional odometer at fill. |
| `full_tank` | `boolean` | Is this a full tank fill. |
| `station` | `string` | Optional station/source. |

### `VehicleDocument`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Auto-generated UUID-like string by default. |
| `type` | enum | `insurance`, `registration`, `pollution`, `license`, `warranty`, `other` (default `other`). |
| `title` | `string` | Document title. |
| `expiry_date` | `string` | Optional ISO datetime. |
| `notes` | `string` | Optional notes. |

## Admin Features

- Manage vehicles with create/edit/delete flows.
- Maintain service logs with:
  - Type and odometer
  - Cost and currency
  - Vendor/garage and notes
- Maintain fuel logs with mileage and cost tracking.
- Track expiry dates and next service reminders.
- Upload and edit multiple related documents.
- Review alerts:
  - Expired/warning insurance
  - Expired/warning pollution certificate
  - Expired/warning service due date
- Compute mileage and cost-derived summaries for quick admin visibility.
- Navigate between:
  - Overview
  - Service
  - Fuel
  - Documents

## Components

- `AdminView.tsx` contains the full CRUD experience for vehicle, service, fuel,
  and document records.
- `Widget.tsx` consumes `/api/widgets/summary?module_type=vehicle` and renders:
  - total vehicles
  - number of expiry/service alerts
  - latest service description
  - monthly fuel spend snapshot

## Example API usage

Create a vehicle:

```ts
await fetch("/api/content", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    module_type: "vehicle",
    is_public: false,
    payload: {
      name: "City Commuter",
      make: "Toyota",
      model: "Corolla",
      year: 2021,
      fuel_type: "petrol",
      odometer_reading: 12450,
      odometer_unit: "km",
      service_records: [],
      fuel_logs: [],
      documents: [],
      notes: "Primary car used for daily commute.",
    },
  }),
});
```

Fetch all vehicles:

```ts
const response = await fetch("/api/content?module_type=vehicle");
const { data } = await response.json();
```

Fetch vehicle widget summary:

```ts
const response = await fetch(
  "/api/widgets/summary?module_type=vehicle",
);
const { data } = await response.json();
```

## Notes

There is no public module view for vehicle data; the module is currently private and
admin-only.

