# loading_skeleton_auditor verification failure

## Prompt
loading_skeleton_auditor

## Failure
Automated verification failed in `pnpm build` and `pnpm check` due pre-existing TypeScript errors unrelated to this patch:
- `src/modules/binge/components/BingeForm.tsx` payload type mismatch on `type`/`status` assignment.
- `src/modules/recurring-expenses/Widget.tsx` invalid `variant` color type.
- `src/modules/_template/__tests__/AdminView.test.tsx` `RequestInfo | URL` string method usage (`startsWith`).

## Required follow-up
Revisit the above errors and rerun `pnpm check` before declaring this prompt complete.
