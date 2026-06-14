# Rain Tracker

## Overview
The Rain Tracker module provides a comprehensive system for logging daily rainfall measurements and tracking precipitation patterns over time. It supports multiple recording areas, unit conversions, and detailed analytics to help correlate weather patterns with other aspects of LifeOS (like Crop History).

## Data Schema

The module uses two primary content types defined via Zod schemas:

### `rain_area` Payload
Defines a specific location where rainfall is tracked.
- `name` (string, required): The name of the tracking area.
- `location` (string, optional): A broader geographic location or specific description.
- `description` (string, optional): Notes about the area or setup.
- `is_active` (boolean, default: `true`): Whether this area is currently being monitored.

### `rain_entry` Payload
A specific rainfall measurement for an area.
- `area_id` (string, required): The ID of the `rain_area` this entry belongs to.
- `rainfall_amount` (number, required): The amount of rain measured (cannot be negative).
- `rainfall_unit` (`"mm" | "cm" | "in"`, default: `"mm"`): The unit of measurement.
- `date` (string, required): ISO date-time of the measurement.
- `notes` (string, optional): Observations (e.g., "heavy thunderstorm", "drizzle").
- `source` (`"manual" | "sensor" | "imported"`, default: `"manual"`): How the data was recorded.

## Features

- **Area Management**: Track multiple locations simultaneously (e.g., "Front Yard", "Farm Field B").
- **Flexible Logging**: Record entries manually or note them as sensor readings. Supports `mm`, `cm`, and `in` with automatic conversions across the UI.
- **Analytics & Trends**:
  - Last 7 days and Last 30 days trends.
  - Identification of the "Wettest Day", "Wettest Month", and "Average Rainy Day".
  - Dry spell tracking and rainy day counts.
- **Visualization Settings**: Configure default display units and toggle between Bar and Area charts in the settings.
- **Dashboard Widget**: See the 7-day and 30-day precipitation summary at a glance, highlighting the most recent logged entry.

## Example Usage

### Creating an Area and Logging an Entry via API
If you are programmatically pushing sensor data, you can interact with the general content API:

```json
// POST /api/content?module_type=rain_area
{
  "name": "Garden Gauge",
  "location": "Backyard",
  "is_active": true
}

// POST /api/content?module_type=rain_entry
{
  "area_id": "area_12345",
  "rainfall_amount": 12.5,
  "rainfall_unit": "mm",
  "date": "2026-06-14T08:00:00.000Z",
  "source": "sensor"
}
```

### Tips for Best Use
- **Consistency**: Measure at the same time each day for manual gauges.
- **Zero-Rain Days**: Log zero-rainfall days during wet seasons if you want highly accurate dry-spell calculations.
- **Cross-Referencing**: Pair rainfall data with the Crop History module to analyze crop yield against seasonal precipitation.
