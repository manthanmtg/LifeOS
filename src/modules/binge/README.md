# Binge

Track movies, series, documentaries, and anime — all in one place.

The **Binge** module allows users to log their watch history, queue up new titles, and track progress on active series. It supports ratings, notes, platform tracking, and rewatch counters.

## Features

- **Content Types**: Track `movie`, `series`, `documentary`, and `anime`.
- **Status Management**: Manage titles across `to_watch`, `watching`, `completed`, and `dropped`.
- **Series Tracking**: Record the current season and episode for ongoing shows.
- **Rich Metadata**: Store ratings (1–10), genres, platforms, release years, and poster URLs.
- **Rewatch Tracking**: Keep a count of how many times a title has been rewatched.
- **Dashboard Widget**: Summarizes total titles, average rating, the number of currently watching items, and highlights the latest active show.

## Data Schema

The `payload` for a `binge_item` uses the following structure:

| Field | Type | Description |
|---|---|---|
| `title` | `string` | The title of the movie or show. |
| `type` | `"movie" \| "series" \| "documentary" \| "anime"` | The type of content. |
| `status` | `"to_watch" \| "watching" \| "completed" \| "dropped"` | The current watch status. |
| `rating` | `number` (optional) | Rating out of 10. |
| `notes` | `string` (optional) | Personal thoughts or review. |
| `genre` | `string` (optional) | Content genre. |
| `platform` | `string` (optional) | Where the title is available (e.g., Netflix, Hulu). |
| `year` | `number` (optional) | Release year. |
| `poster_url` | `string` (optional) | URL to the movie/show poster. |
| `recommended_by` | `string` (optional) | Who recommended the title. |
| `rewatched` | `boolean` | Whether the title has been rewatched. |
| `rewatch_count` | `number` | Total number of rewatches. |
| `current_season` | `number` (optional) | (Series only) Current season being watched. |
| `current_episode` | `number` (optional) | (Series only) Current episode being watched. |
| `total_seasons` | `number` (optional) | (Series only) Total seasons available. |

## Registration

**Content Type:** `binge_item`

This module is registered in `src/registry.ts` with the `Tv` icon.

## Example Usage

**Creating a new Binge item:**

```typescript
const newItem = {
  contentType: "binge_item",
  payload: {
    title: "Breaking Bad",
    type: "series",
    status: "watching",
    rating: 9.5,
    genre: "Crime, Drama",
    platform: "Netflix",
    year: 2008,
    rewatched: false,
    rewatch_count: 0,
    current_season: 2,
    current_episode: 4,
  }
};
```
