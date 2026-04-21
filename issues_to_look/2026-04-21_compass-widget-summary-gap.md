# Compass widget summary gap

- Selected prompt: `prompts/widget_enhancer.md`
- Random module: `src/modules/compass`
- Date: `2026-04-21`

## What I reviewed

The `compass` dashboard widget currently fetches the full `compass_task` collection from `/api/content` instead of using `/api/widgets/summary`, which breaks the widget contract documented in `AGENTS.md` and `src/modules/_template/Widget.tsx`.

## Proposed fix

Add `compass_task` support to `src/app/api/widgets/summary/route.ts` with a compact summary payload such as:

- `inProgress`
- `review`
- `critical`
- `stuck`
- `total`

Then update `src/modules/compass/Widget.tsx` to consume that summary endpoint and surface the highest-priority attention state without loading the full task list.

## Why I held back

`prompts/widget_enhancer.md` says to log an issue instead of changing the backend when improving the widget would require API work. I also ran `pnpm check`, and the run failed during lint because of existing repo-wide ESLint warnings outside the `compass` module, so I did not force through an unverified widget change.

## Verification notes

`pnpm check` failed in the lint step on pre-existing warnings in unrelated files, including:

- `src/components/ui/DocPreview.tsx`
- `src/components/ui/ImagePreview.tsx`
- `src/modules/bills/components/BillCard.tsx`
- `src/modules/bills/components/BillDetail.tsx`
- several existing test files with unused variables / unused disable directives
