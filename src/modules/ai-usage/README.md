# AI Usage Module

The AI Usage module allows you to track your API usage, token consumption, and associated costs across different AI providers. It provides a centralized dashboard for analyzing spending patterns, comparing model efficiency, and maintaining budget awareness.

## Overview

| Property | Value |
| --- | --- |
| Registry slug | `ai-usage` |
| Content type | `ai_usage` |
| Icon | `Bot` |
| Default visibility | Private (`defaultPublic: false`) |

## Data Schema

The module payload is validated by `AiUsageSchema` in `src/lib/schemas.ts`.

| Field | Type | Rules |
| --- | --- | --- |
| `provider` | enum | `"openai"`, `"anthropic"`, `"google"`, `"mistral"`, `"cohere"`, `"perplexity"`, `"groq"`, `"together"`, `"fireworks"`, `"deepseek"`, `"xai"`, `"other"`. |
| `provider_config_id` | `string` | Optional string linking to a specific provider configuration. |
| `model` | `string` | Trimmed, required, max 100 characters. |
| `input_tokens` | `number` | Defaults to 0. |
| `output_tokens` | `number` | Defaults to 0. |
| `cache_read_tokens` | `number` | Defaults to 0. |
| `cache_write_tokens` | `number` | Defaults to 0. |
| `num_requests` | `number` | Defaults to 0. |
| `cost` | `number` | Required, non-negative. |
| `currency` | `string` | ISO currency code, defaults to `"USD"`. |
| `date` | `string` | Required ISO date-time of the usage. |
| `bucket_width` | enum | Either `"1d"` or `"1h"`; defaults to `"1d"`. |
| `api_key_label` | `string` | Optional context string, max 100 chars. |
| `session_label` | `string` | Optional context string, max 100 chars. |
| `notes` | `string` | Optional text, max 2000 chars. |
| `synced` | `boolean` | Defaults to `false`. Tracks external sync state. |

## Features

- **Usage Logging**: Record detailed API metrics including distinct token types (input, output, cache reads/writes).
- **Multi-Provider Support**: Seamlessly track costs and usage across 10+ major model providers including OpenAI, Anthropic, Google, and DeepSeek.
- **Admin Dashboard**: View comprehensive trends, search and filter logs by provider or model, and analyze daily or monthly aggregated usage.
- **Cost Trends**: Monitor your month-over-month expenditure through the module widget, which highlights your top provider and total monthly cost.

## Components

- `AdminView.tsx`: Main dashboard and data table for managing usage logs, with visual charts for spending trends.
- `Widget.tsx`: Bento Grid summary tile showing top provider and aggregate costs.
- `AiUsageLogTab.tsx`: Detailed data table for viewing individual request logs.

## API Example

### Adding an AI Usage Entry
You can programmatically add a usage entry by POSTing to `/api/content` using the shared Discriminator Pattern API:

```json
POST /api/content
Content-Type: application/json

{
  "module_type": "ai_usage",
  "is_public": false,
  "payload": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20240620",
    "input_tokens": 1200,
    "output_tokens": 850,
    "cache_read_tokens": 0,
    "cache_write_tokens": 0,
    "num_requests": 1,
    "cost": 0.0163,
    "currency": "USD",
    "date": "2026-05-23T10:00:00.000Z",
    "bucket_width": "1d",
    "notes": "Code refactoring session",
    "synced": false
  }
}
```
