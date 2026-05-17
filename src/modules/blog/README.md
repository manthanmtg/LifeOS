# Blog Module

The blog module stores editorial content in the shared `content` collection using
`module_type: "blog_post"`. It supports draft-to-publish workflows, markdown
authoring, tag filtering, SEO metadata, and a public reading surface under
`/blog`.

## Registration

| Field              | Value                                  |
| ------------------ | -------------------------------------- |
| Registry slug      | `blog`                                 |
| Content type       | `blog_post`                            |
| Default visibility | Public                                 |
| Admin route        | `/admin/blog`                          |
| Public route       | `/blog`                                |
| Public item route   | `/blog/[slug]`                         |
| Widget summary     | `/api/widgets/summary?module_type=blog_post` |

## Data Schema

`src/lib/schemas.ts` validates `blog_post` payloads with `BlogPostSchema`.

| Payload field        | Type                | Notes |
| -------------------- | ------------------- | ----- |
| `title`              | string              | Required. 3-200 characters. |
| `slug`               | string              | URL-safe slug (`[a-z0-9]+(?:-[a-z0-9]+)*`), max 200 chars. |
| `content`            | string              | Required markdown content, max 1,000,000 chars. |
| `status`             | enum                | `draft` (default), `published`, `archived`. |
| `published_at`       | datetime string     | Optional ISO 8601 publication timestamp. |
| `tags`               | string array         | Optional up to 20 tags, defaults to `[]`. |
| `estimated_reading_time` | number         | Optional integer read-time override (minutes). |
| `seo_description`    | string              | Optional SEO text, max 160 chars. |
| `cover_image_url`    | URL string          | Optional hero image link. |

### Runtime DTOs in `src/modules/blog/types.ts`

- `BlogPayload`: module payload shape used by admin/public views.
- `BlogPost`: complete document shape from `/api/content`.
- `BlogSummary`: compact metrics used by the widget.

## Admin Experience

`AdminView.tsx` is a rich client module that:

- fetches posts via `GET /api/content?module_type=blog_post`,
- supports status filtering (`all`, `draft`, `published`, `archived`),
- persists posts with autosave and manual save,
- auto-generates slugs from titles (can be overridden manually),
- computes reading-time, tag input parsing, and searchable/sortable list views,
- supports status transitions and delete flows.

The editor intentionally persists local state while drafting and can restore local
drafts across sessions.

## Widget

`Widget.tsx` follows the widget contract:

- Fetches compact data from `/api/widgets/summary?module_type=blog_post`.
- Shows hero published-count metric via `WidgetStat`.
- Uses `WidgetHighlight` and `WidgetCard` footer chips for drafts and total posts.

## Public Experience

`View.tsx` powers `/blog`:

- loads published posts from `/api/content?module_type=blog_post`,
- filters by search keyword and tag,
- renders summary cards with totals and derived read-time,
- features a highlighted top post and animated empty states.

There is no `PublicView.tsx`; the module uses `View.tsx` directly from
`src/app/blog/page.tsx`.

## API Quickstart

Create or update posts from admin clients using these endpoints:

```bash
# List blog posts (admin sees all visibility states)
GET /api/content?module_type=blog_post

# Create a draft
POST /api/content
Content-Type: application/json

{
  "module_type": "blog_post",
  "is_public": true,
  "payload": {
    "title": "How I rebuilt my writing loop",
    "slug": "how-i-rebuilt-my-writing-loop",
    "content": "# Draft heading\n\nNotes...",
    "status": "draft",
    "tags": ["lifeos", "workflow"],
    "seo_description": "Short SEO summary"
  }
}

# Update a post
PUT /api/content/{id}
Content-Type: application/json
{
  "payload": {
    "status": "published",
    "published_at": "2026-05-17T00:00:00.000Z"
  }
}
```

## Related Files

- [Registry mapping](../..//registry.ts)
- [Schema registry](../..//lib/schemas.ts)
- [Admin UI](./AdminView.tsx)
- [Widget](./Widget.tsx)
- [Public view](./View.tsx)
