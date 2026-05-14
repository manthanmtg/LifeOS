# Slides widget summary mismatch

## Issue

The `slides` dashboard widget expects the `/api/widgets/summary?module_type=deck`
response to include `latest`, `publicDecks`, and `uniqueTopics`, but the summary
route currently falls through to the generic `{ total }` response for `deck`.

As a result, the widget can show the deck count but cannot display the latest
deck spotlight or richer deck state from the admin view.

## Proposed fix

Add a dedicated `deck` case to `src/app/api/widgets/summary/route.ts` that
returns compact deck summary fields already implied by `SlidesWidget`:

- total deck count
- public deck count
- unique topic count
- latest deck title and format

Then tighten `src/modules/slides/Widget.tsx` to consume that shape directly and
keep its single `WidgetStat` plus `WidgetHighlight` layout.

## Why held back

The selected `widget_enhancer` prompt says to log the issue instead of changing
the API when improving the widget requires a backend summary shape change. This
should be handled in a focused follow-up run that can cover the endpoint and the
widget together.
