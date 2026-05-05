# Snippets Module

The Snippets module is the LifeOS code library for reusable code blocks,
technical references, and short implementation notes. It is registered as the
`snippets` module with the `snippet` content type and stores all records in the
shared `content` collection through the discriminator pattern.

## Data Schema

Snippet payloads are validated by `SnippetSchema` in `src/lib/schemas.ts`.

| Field         | Type       | Validation                                | Notes                                                     |
| ------------- | ---------- | ----------------------------------------- | --------------------------------------------------------- |
| `title`       | `string`   | required, trimmed, 1-200 chars            | Display name for the snippet.                             |
| `code`        | `string`   | required, 1-100000 chars                  | Source code copied into admin and public views.           |
| `language`    | `string`   | required, trimmed, 1-50 chars             | Used for filters, chips, and language counts.             |
| `description` | `string`   | optional, trimmed, max 1000 chars         | Short context shown below code cards.                     |
| `tags`        | `string[]` | defaults to `[]`, max 20, each 1-50 chars | Powers search and trending tag metrics.                   |
| `is_favorite` | `boolean`  | defaults to `false`                       | Sorts starred snippets first and drives favorite metrics. |

The registry entry in `src/registry.ts` marks the module as private by default:

```ts
{
  name: "Snippets",
  icon: "Code",
  defaultPublic: false,
  contentType: "snippet",
}
```

## Admin Features

`AdminView.tsx` fetches `/api/content?module_type=snippet` and renders a
searchable, filterable code library.

- Create and edit snippets with title, language, favorite state, code,
  description, and comma-separated tags.
- Copy snippet code from cards, public cards, or the live form preview.
- Toggle favorites and delete records through `/api/content/[id]`.
- Filter by search text, language, and favorites-only mode.
- Sort favorites first, then newest snippets first in the admin view.
- Persist per-module settings through `useModuleSettings("snippetSettings")`.

Settings are defined in `components/types.ts`:

| Setting           | Default                   | Purpose                                           |
| ----------------- | ------------------------- | ------------------------------------------------- |
| `defaultLanguage` | `javascript`              | Initial language for new snippets.                |
| `languages`       | built-in `LANGUAGES` list | Available language options in the form.           |
| `showLineNumbers` | `false`                   | Adds formatted line numbers to preview and cards. |

## Metrics and Smart Views

`getSnippetStats` centralizes the admin statistics used by
`SnippetsMetrics.tsx`.

- Total library size.
- Favorite count and favorite ratio.
- Distinct language count.
- Average lines per snippet.
- Snippets added in the last 7 days.
- Distinct tag count.
- Six-week activity sparkline.
- Top five language distribution.
- Top eight trending tags.

`highlightCode` and `withLineNumbers` provide lightweight presentation helpers.
They escape code before adding span-based highlighting, then optionally prepend
line numbers for display.

## Widget Contract

`Widget.tsx` follows the dashboard widget contract:

- Fetches compact data from `/api/widgets/summary?module_type=snippet`.
- Uses `WidgetCard`, `WidgetStat`, and `WidgetHighlight`.
- Shows one hero metric: total snippets.
- Shows one detail row for either empty state guidance, favorite count, or
  language count.
- Routes through `href="/admin/snippets"` without internal widget controls.

Expected summary shape:

```ts
interface SnippetSummary {
  total: number;
  favorites: number;
  languageCount: number;
}
```

## Public View

`PublicView.tsx` renders public snippet records passed in by the dynamic public
module route. It supports search, language filtering, favorites-only filtering,
copy actions, and the same lightweight syntax highlighting as the admin cards.

Public records are still stored as `module_type: "snippet"` documents. Public
visibility is controlled by each document's `is_public` flag through the shared
content API and system module settings.

## API Examples

Create a snippet:

```ts
await fetch("/api/content", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    module_type: "snippet",
    is_public: false,
    payload: {
      title: "Fetch JSON helper",
      code: "export async function getJson(url) { return fetch(url).then((r) => r.json()); }",
      language: "typescript",
      description: "Small wrapper for JSON endpoints.",
      tags: ["fetch", "api"],
      is_favorite: true,
    },
  }),
});
```

Update favorite state:

```ts
await fetch(`/api/content/${snippet._id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    payload: {
      ...snippet.payload,
      is_favorite: !snippet.payload.is_favorite,
    },
  }),
});
```

Fetch widget summary:

```ts
const response = await fetch("/api/widgets/summary?module_type=snippet");
const { data } = await response.json();
```

## Key Files

- `AdminView.tsx` - Admin shell, data fetching, filters, CRUD handlers.
- `Widget.tsx` - Dashboard bento tile.
- `PublicView.tsx` - Public snippet browser.
- `components/types.ts` - Shared types, defaults, stats, date, and code display helpers.
- `components/SnippetForm.tsx` - Create/edit form with live preview.
- `components/SnippetCard.tsx` - Admin card with copy, favorite, edit, and delete actions.
- `components/SnippetsMetrics.tsx` - Admin metrics and smart distributions.
- `components/SnippetsSettings.tsx` - Per-module language and line number settings.
- `components/SnippetsFilters.tsx` - Search, language, and favorites filters.
