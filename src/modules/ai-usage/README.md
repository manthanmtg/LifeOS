# AI Usage Module

## Overview
The AI Usage module allows you to track your API usage, token consumption, and associated costs across different AI providers (e.g., OpenAI, Anthropic, Google). It provides a centralized dashboard for analyzing spending patterns, comparing model efficiency, and maintaining budget awareness.

## Data Schema
The module uses the `AiUsageSchema` (Zod) with the following key fields in its payload:
- `provider`: (Enum) The AI provider (e.g., `"openai"`, `"anthropic"`, `"google"`, `"other"`).
- `provider_config_id`: (Optional string) Link to a specific provider configuration.
- `model`: (String) The specific model used (e.g., `"gpt-4o"`, `"claude-3-opus-20240229"`).
- `input_tokens`: (Number) Number of tokens sent in the prompt.
- `output_tokens`: (Number) Number of tokens generated in the response.
- `cache_read_tokens` / `cache_write_tokens`: (Number) Tokens associated with prompt caching mechanisms.
- `num_requests`: (Number) Number of aggregated API requests in this entry.
- `cost`: (Number) The calculated cost of the usage in the specified currency.
- `currency`: (String) Defaults to `"USD"`.
- `date`: (String) ISO date-time of the usage.
- `bucket_width`: (Enum) Aggregation width, e.g., `"1d"` or `"1h"`.
- `api_key_label` / `session_label` / `notes`: (Optional strings) Additional context for the log entry.

## Features
- **Usage Logging**: Record detailed API metrics including distinct token types (input, output, cache reads/writes).
- **Multi-Provider Support**: Seamlessly track costs and usage across major models and providers.
- **Admin Dashboard**: View comprehensive trends, search/filter logs by provider or model, and analyze daily/monthly usage.
- **Cost Trends**: Monitor your month-over-month expenditure through the module widget, which highlights your top provider and total monthly cost.

## Example Usage

### Adding an AI Usage Entry
You can programmatically add a usage entry by POSTing to `/api/modules/ai-usage`:

```json
POST /api/modules/ai-usage
Content-Type: application/json

{
  "type": "ai_usage",
  "payload": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20240620",
    "input_tokens": 1200,
    "output_tokens": 850,
    "cost": 0.0163,
    "date": "2026-05-23T10:00:00.000Z",
    "notes": "Code refactoring session"
  }
}
```
