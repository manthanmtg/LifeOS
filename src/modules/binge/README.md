# Binge

Track movies, series, documentaries, and anime in one place.

The **Binge** module logs what is queued, active, completed, or dropped. It supports ratings, notes, platform metadata, poster URLs, rewatch counters, and season/episode progress for series-style titles.

Admin data is loaded from `/api/content?module_type=binge_item`, and widget data is loaded from `/api/widgets/summary?module_type=binge_item`.

## Features

- **Content Types**: Track `movie`, `series`, `documentary`, and `anime`.
- **Status Management**: Manage titles across `to_watch`, `watching`, `completed`, and `dropped`.
- **Search and Filters**: Search by title, genre, or platform, then filter by status and content type.
- **Series Tracking**: Record current season, current episode, and total seasons for `series` and `anime`. These fields are only written for series-style content; movies and documentaries omit them when saved.
- **Rich Metadata**: Store ratings from 1 to 10, notes, genre, platform, release year, poster URL, and recommender.
- **Rewatch Tracking**: Mark rewatched titles and keep a rewatch count.
- **Metrics Header**: Shows total, watching, completed, average rating, to-watch, dropped, and type breakdown cards. Total and completed metrics include six-month sparklines.
- **Dashboard Widget**: Uses the constrained widget contract: one hero metric for currently watching, one latest active-title highlight, and footer stats for total titles and average rating.

## Local Components

| File | Responsibility |
| ---- | -------------- |
| `AdminView.tsx` | Fetches `binge_item` documents, owns filtering state, opens the add/edit form, and refreshes data after saves or deletes. |
| `Widget.tsx` | Fetches `/api/widgets/summary?module_type=binge_item` and renders the constrained dashboard tile. |
| `components/BingeMetrics.tsx` | Computes header counts, average rating, type totals, and six-month sparklines from the loaded admin collection. |
| `components/BingeFilters.tsx` | Renders the title/genre/platform search field plus status and type filter controls. |
| `components/BingeCard.tsx` | Displays poster art, badges, rating, notes, relative creation date, optional series progress, and edit/delete controls. |
| `components/BingeForm.tsx` | Creates and updates `binge_item` payloads through `/api/content`, including conditional series fields and rewatch metadata. |

## Data Schema

The `payload` shape is represented by `BingeItem` in `src/modules/binge/types.ts`. `binge_item` is registered in `src/registry.ts`, but it is not currently registered in `SchemaRegistry` in `src/lib/schemas.ts`.

| Field             | Type                                                   | Description                                  |
| ----------------- | ------------------------------------------------------ | -------------------------------------------- |
| `title`           | `string`                                               | The title of the movie or show.              |
| `type`            | `"movie" \| "series" \| "documentary" \| "anime"`      | The type of content.                         |
| `status`          | `"to_watch" \| "watching" \| "completed" \| "dropped"` | The current watch status.                    |
| `rating`          | `number` (optional)                                    | Rating from 1 to 10.                         |
| `notes`           | `string` (optional)                                    | Personal thoughts, review, or context.       |
| `genre`           | `string` (optional)                                    | Content genre.                               |
| `platform`        | `string` (optional)                                    | Where the title is available.                |
| `year`            | `number` (optional)                                    | Release year.                                |
| `poster_url`      | `string` (optional)                                    | URL to the movie/show poster.                |
| `recommended_by`  | `string` (optional)                                    | Who recommended the title.                   |
| `rewatched`       | `boolean`                                              | Whether the title has been rewatched.        |
| `rewatch_count`   | `number`                                               | Total number of rewatches.                   |
| `current_season`  | `number` (optional)                                    | (Series only) Current season being watched.  |
| `current_episode` | `number` (optional)                                    | (Series only) Current episode being watched. |
| `total_seasons`   | `number` (optional)                                    | (Series only) Total seasons available.       |

## Widget Summary

The widget does not fetch the full admin collection. The `/api/widgets/summary` route projects only `title`, `status`, `rating`, `current_season`, and `current_episode` for private `binge_item` documents, then returns:

| Field | Description |
| ----- | ----------- |
| `total` | Count of private Binge titles. |
| `watchingCount` | Count of titles with `status: "watching"`. |
| `avgRating` | Average of numeric ratings, or `0` when nothing is rated. |
| `latest` | The newest active watch, including title and optional season/episode progress. |

## Registration

- **Admin route**: `/admin/binge`
- **Content type**: `binge_item`
- **Icon**: `Tv`
- **Default visibility**: private

## Example Usage

Creating a new Binge item through `/api/content`:

```typescript
const newItem = {
  module_type: "binge_item",
  is_public: false,
  payload: {
    title: "Breaking Bad",
    type: "series",
    status: "watching",
    rating: 9,
    genre: "Crime, Drama",
    platform: "Netflix",
    year: 2008,
    rewatched: false,
    rewatch_count: 0,
    current_season: 2,
    current_episode: 4,
  },
};
```
