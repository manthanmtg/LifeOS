# Space documents: compact uploads and inline renaming

## Goal

Make existing documents the focus of the Expense Space Documents tab: move uploading below the list, add an Upload button beside search, and let users rename files directly in their rows. This is a bounded UI and API feature. This document is a plan only; application code is not changed.

## Current State

- `src/modules/expense-spaces/components/ExpenseSpaceDocuments.tsx` renders a heading card containing a large uploader, then a separate search/list card. Names are plain text. Preview, download, deletion confirmation, skeletons, search, and pagination already exist.
- `src/components/ui/DocumentUpload.tsx` owns a hidden multi-file input, base64 conversion, a sequential upload loop, progress, and errors. It is also used by `ExpenseEntryForm.tsx` for receipts, so defaults must remain compatible.
- `src/modules/expense-spaces/api.ts` exposes document list, upload, and delete methods. List pages contain 25 metadata records and a filtered `total`; each upload currently reloads the list.
- `src/app/api/expense-spaces/[spaceId]/docs/route.ts` authenticates requests, scopes documents by the parent's immutable `space_key`, projects out file bytes, and searches filenames. Out-of-range nonempty pages return 400.
- `src/app/api/expense-spaces/[spaceId]/docs/[documentId]/route.ts` implements GET and DELETE only. GET uses the stored filename for the download header. Archived spaces allow reads but reject mutations.
- `ExpenseSpaceDocumentSchema` in `src/lib/schemas.ts` requires a trimmed filename of 1–255 characters. File bytes are in `payload.data`, with MIME type and size stored separately. All documents are private.
- Existing document route tests cover metadata listing and uploads; no dedicated document-row or single-document route tests exist. Component tests use React Testing Library and Vitest; API tests use mocked MongoDB under the Node test environment.
- Stack: Next.js 16, React 19, MongoDB driver 7, Zod 4, Vitest 4. `src/proxy.ts` already protects this API family and checks mutation origins.

## Requirements

- Put a labeled Upload button immediately to the right of search on desktop and mobile. Search flexes with `min-w-0`; Upload keeps its label and a minimum 44px height.
- Remove the large uploader from the heading card. Keep the heading and privacy description with reduced spacing.
- Place one uploader at the bottom of the document card, after results and pagination. With documents or an active search, use a compact dashed strip: “Drag files here or click to upload”, with “Max 5 MB each · Multiple files supported” beneath it. Target approximately 64–80px height, allowing wrapping.
- With a successfully loaded, unfiltered empty space, use the existing larger upload presentation in that same bottom position. Do not duplicate it with a large empty-state illustration.
- Clicking a filename enters inline editing. Show a success-colored Check action to save and a danger-colored X action to discard; use `text-success` and `text-danger`, honoring theme tokens rather than literal green/red classes.
- Preserve preview, download, privacy, file-size limits, search, pagination, archived behavior, and skeletons.

## Assumptions

- Scope is Expense Space documents only. Receipt uploads keep their current appearance.
- Rename changes the actual stored/download filename, not a separate display title.
- Preserve the current final extension to prevent accidental file-type changes. Edit the basename and display the suffix beside the field. Split at the last dot only when it is neither the first nor last character: `report.pdf` becomes `report` + `.pdf`; `.env` and `README` have no suffix; `archive.tar.gz` becomes `archive.tar` + `.gz`.
- Duplicate filenames remain permitted; identity continues to use document IDs.
- One row can be edited at a time. A second filename cannot start editing until the first is saved or canceled. Leaving the tab discards an unsaved draft; blur alone does not save or discard.
- Existing mutation behavior is last-write-wins. No new version field, transaction, migration, or locking mechanism is introduced.

## Proposed Design

### Layout and upload flow

Keep one mounted `DocumentUpload` instance at the bottom. Extend its optional props with `variant?: "default" | "compact"`, `fileInputRef?: RefObject<HTMLInputElement | null>`, and `onUploadingChange?: (uploading: boolean) => void`. Defaults retain the receipt uploader's existing behavior. Resolve the supplied input ref or the internal fallback, without conditional hooks.

The parent owns the input ref and an `uploading` flag. Its Upload button calls `inputRef.current?.click()`; the footer uses the same input and upload queue. Do not render two independent uploaders. Keep the uploader mounted during list reloads and variant changes so uploading the first file in a batch cannot cancel later files or lose errors.

Use compact mode during initial loading, errors, any nonblank search, or nonzero unfiltered results. Use default mode only after a successful empty unfiltered response. Retain the last successful layout while refreshing. Search misses never imply the space is empty.

The uploader remains responsible for validation and sequential processing. Add an immediate ref-based busy guard shared by file input and drop handlers; ignore empty drops and additional batches while busy. Notify the parent when busy changes and reset busy state in `finally`. Expose progress through `role="status"`/`aria-live="polite"`, disable the toolbar trigger while uploading, retain its accessible name, and allow progress text to wrap.

Make the drop target keyboard operable with Enter/Space, a visible focus ring, an accessible name, and disabled semantics. Keep the hidden input outside any native button used as the drop target. Preserve all existing `accept`, `validateFile`, help text, and input-label props.

Archived spaces show the existing restore message expanded to mention uploading, renaming, and deleting. Render no uploader or Upload button and render filenames as text. Preview and download remain available.

### Inline editor

Add local `editingId`, `draftBaseName`, `renameError`, and `saving` state, plus refs for the input and focus restoration. Use a real text-styled filename button with `title` containing the full filename and `aria-label="Rename <filename>"`. Add a small Pencil affordance on hover/focus so editing is discoverable.

On entry, split the filename, select the basename, and focus the field. Display the suffix read-only with an accessible description. Recompose and validate the full filename before saving. Enter saves except during IME composition; Escape cancels. Check and X have explicit accessible labels and at least 44px hit areas. Keep the editor and actions on a wrapping row at narrow widths; existing preview/download/delete actions can occupy a second line rather than compressing the input.

An unchanged composed filename closes without a request. Empty basenames, names longer than 255 characters including suffix, `/`, `\\`, and ASCII control characters receive an inline error. Do not disable saving merely because input is invalid without explaining why. During save disable input, Check, X, and the row's delete action to prevent contradictory operations. Announce “Saving document name…” without removing the row.

On success replace that record with returned metadata, update an open preview's filename if it references that ID, close the editor, and announce “Document renamed”. On failure retain the draft and show a row-local error, enabling retry or discard. Cancel restores the original name without a request. Restore focus to the filename button, or to search if the row disappears.

Search/page controls remain disabled during an active edit so query changes cannot discard the draft. Other filename buttons are disabled too. Uploading can continue; list refreshes must keep editor state keyed by ID rather than resetting it on every response. If the edited item disappears or the space becomes archived, clear the editor and announce why.

After rename/delete, reset to page 1 and refresh using the current search; if already on page 1, explicitly refresh once. This avoids the existing API's out-of-range rejection when the final matching item disappears from a later page. Do not both call a stale `load()` closure and trigger a page-change effect. A renamed row that no longer matches the current search disappears after refresh; show the rename confirmation independently of the row.

Protect list state with a monotonically increasing request ID and effect cleanup; only the latest request for the mounted space may update documents, error, or loading. Invalidate outstanding reads when applying a successful mutation before scheduling the new fetch. A late search response must not restore the old name.

### API and validation

Add `PATCH /api/expense-spaces/:spaceId/docs/:documentId` accepting exactly `{ "filename": "Revised estimate.pdf" }`. Export `ExpenseSpaceDocumentRenameSchema` from `src/lib/schemas.ts`, derived from the existing filename schema, with strict keys and additional path/control-character checks. Add a pure `splitDocumentFilename` helper in `src/lib/expense-spaces/document-filename.ts` for shared suffix handling; do not change upload validation or migrate existing filenames.

Handler order:

1. Call `requireExpenseSpacesAdmin`; return 401 before database access if unauthorized.
2. Resolve parent and document using existing ID and `space_key` checks. Return 400 for malformed IDs and 404 for missing parent or document, including a document in another space.
3. Reject an archived parent with 409 and a restore message.
4. Parse JSON safely and validate with the strict rename schema; malformed JSON and invalid bodies return 400 through existing response helpers. Reject a changed final suffix or an empty basename with a readable 400 error. Enforce this on the server as well as the client.
5. For unchanged valid names return current metadata with no write. Otherwise use `findOneAndUpdate`, filtering by document ID, discriminator, and parent `space_key`, with `$set` of only `payload.filename` and `updated_at`. Request `returnDocument: "after"` and a metadata projection excluding `payload.data`. A null result returns 404 (concurrent deletion).
6. Return `ApiSuccess` containing the updated `ExpenseSpaceStoredDocument` metadata. Explicitly strip `data` on the no-op path too. Preserve bytes, MIME, size, creation time, space key, and privacy.
7. Catch unexpected failures, call `logExpenseSpacesRouteError` with PATCH, and return a generic 500. Do not log filenames or file contents.

Add `expenseSpacesApi.renameDocument(spaceId, documentId, filename): Promise<ExpenseSpaceStoredDocument>` using `jsonRequest("PATCH", { filename })`. Reuse the existing API error class. No proxy changes or generic `/api/content` route changes are needed.

### Additional usability improvements

Include these small improvements in this implementation:

- Show “No documents match your search” with a Clear search button for filtered empty results.
- Use the existing response `total` to show “N documents” when unfiltered or “N results” when filtered; never label a filtered count as the space total.
- Show full filenames on hover/focus through the name control's title/accessibility label, while retaining truncation in rows.
- Preserve extensions, keyboard save/cancel, row-local errors, and upload progress as described above.

Consider sorting, file-type filters, thumbnails, and bulk download/delete in a later change. They require broader API or interaction work and are not implementation requirements here.

## Files To Change

| File                                                                             | Action | Detailed Change                                                                                                                                  |
| -------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/modules/expense-spaces/components/ExpenseSpaceDocuments.tsx`                | Modify | Compact heading, toolbar, footer uploader, result count/states, inline editor, focus management, mutation refresh, latest-request protection.    |
| `src/components/ui/DocumentUpload.tsx`                                           | Modify | Optional compact variant, external input ref and busy notification, one guarded queue, keyboard and progress accessibility; compatible defaults. |
| `src/lib/expense-spaces/document-filename.ts`                                    | Add    | Pure basename/suffix splitter shared by editor and endpoint.                                                                                     |
| `src/lib/schemas.ts`                                                             | Modify | Strict rename input schema without changing stored-document/upload schema.                                                                       |
| `src/modules/expense-spaces/api.ts`                                              | Modify | Typed rename client method and stored-document type import.                                                                                      |
| `src/app/api/expense-spaces/[spaceId]/docs/[documentId]/route.ts`                | Modify | Authenticated, space-scoped PATCH and metadata-only response.                                                                                    |
| `src/modules/expense-spaces/components/__tests__/ExpenseSpaceDocuments.test.tsx` | Add    | User-facing layout, rename, async race, archive, and search tests.                                                                               |
| `src/components/ui/__tests__/DocumentUpload.test.tsx`                            | Add    | Shared trigger, compact/default presentation, keyboard, busy guard, progress, validation, and batch continuation tests.                          |
| `src/lib/expense-spaces/__tests__/document-filename.test.ts`                     | Add    | Suffix rules and rename schema boundaries, Unicode, separators, and strict body validation.                                                      |
| `src/app/api/expense-spaces/[spaceId]/docs/[documentId]/__tests__/route.test.ts` | Add    | PATCH contract, authorization/scoping, preservation, response redaction, failure cases, and renamed download headers.                            |

No files are deleted. Existing shared types already represent the required metadata.

## Implementation Phases

### Phase 1: Rename contract

- Add filename helper/schema tests and implement the helper and strict schema in the named files.
- Add single-document route tests, implement PATCH, then add the typed API method.
- Verify server preservation of bytes and metadata and rejection of cross-space/archive mutations before wiring the editor.

### Phase 2: Upload layout

- Extend `DocumentUpload` with compatible optional props and focused tests.
- Update `ExpenseSpaceDocuments` heading, toolbar, single stable footer uploader, count, and empty states.
- Guard list responses against stale requests and preserve upload state across first-file reloads.

### Phase 3: Inline renaming

- Add editor state, accessible filename buttons, suffix display, Check/X actions, keyboard behavior, pending/error handling, and focus restoration.
- Wire the API and explicit page-1 refresh flow for rename/delete, maintaining active search.
- Add component tests including rename while searching and stale response ordering.

### Phase 4: Verify

- Run targeted tests and the repository quality commands below.
- Visually verify active/archived and empty/populated states at desktop and 375px mobile widths using Playwright against `http://localhost:3091`. Capture before/after screenshots and check light/dark themes, long filenames, inline errors, keyboard focus, and first-upload batch transitions.
- Use a disposable space and test files for mutations. Inspect preview/download after renaming, upload multiple files through both entry points, check the receipt upload consumer, then remove test data and stop any server started for verification.

## Testing Plan

| Test            | File or Command                                                                                                                                                                                                                                                                                                                                                                                                                             | Purpose                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Filename rules  | `src/lib/expense-spaces/__tests__/document-filename.test.ts`                                                                                                                                                                                                                                                                                                                                                                                | PDF, multiple dots, dotfiles, trailing dots, extensionless names, Unicode, blank input, length boundary, separators/control characters, unexpected body keys.                                            |
| Endpoint        | `src/app/api/expense-spaces/[spaceId]/docs/[documentId]/__tests__/route.test.ts`                                                                                                                                                                                                                                                                                                                                                            | 401/400/404/409/500, malformed/null/array JSON, scope filters, no-op, extension protection, atomic field update, bytes omitted, concurrent delete, download filename and bytes after rename.             |
| UI              | `src/modules/expense-spaces/components/__tests__/ExpenseSpaceDocuments.test.tsx`                                                                                                                                                                                                                                                                                                                                                            | Toolbar/footer placement, search-empty state, counts, click/Enter/Escape/Check/X, IME, retry, unchanged name, archived read-only, long name, stale reads, current-search refresh and last-page deletion. |
| Upload          | `src/components/ui/__tests__/DocumentUpload.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                       | One input/queue, both triggers, rejected oversized file, mixed success/failure batch, repeat selection, ignored empty drop, busy guard, keyboard support, persistent upload state across layout change.  |
| Focused suites  | `pnpm test -- src/modules/expense-spaces/components/__tests__/ExpenseSpaceDocuments.test.tsx src/components/ui/__tests__/DocumentUpload.test.tsx src/lib/expense-spaces/__tests__/document-filename.test.ts 'src/app/api/expense-spaces/[spaceId]/docs/[documentId]/__tests__/route.test.ts' 'src/app/api/expense-spaces/[spaceId]/docs/__tests__/route.test.ts' src/modules/expense-spaces/components/__tests__/ExpenseEntryForm.test.tsx` | New behavior plus existing document API and receipt consumer regression coverage.                                                                                                                        |
| Required checks | `pnpm format` followed by `pnpm check`                                                                                                                                                                                                                                                                                                                                                                                                      | Formatting, lint, types, production build, and complete Vitest suite. Inspect and avoid including unrelated formatting changes.                                                                          |
| Visual          | Playwright on `/admin/expense-spaces`, open a disposable space's Documents tab                                                                                                                                                                                                                                                                                                                                                              | Desktop/mobile interaction, theme colors, overflow, actual upload/rename/download, and console errors.                                                                                                   |

## Edge Cases

- A search with no matches retains the compact uploader; a genuinely empty space gets the larger footer affordance after loading completes.
- The first upload changes the list from empty to populated without remounting the queue; later files in that batch still finish.
- If a refresh fails after a successful rename, retain the returned name, show a separate list refresh error, and do not describe the successful mutation as failed.
- Existing unusual filenames can still be read/downloaded. A rename must produce a valid name; no background normalization occurs.
- Double submit and repeated drops while pending produce one operation. Cancel is available again after a failed save.
- A space switch invalidates old list responses and edit state. Pending mutation responses must not replace records in the newly selected space.

## Risks And Mitigations

- Shared uploader changes can affect receipts: preserve defaults and run receipt tests plus a visual smoke check.
- Filename edits affect download names: server-side suffix validation and byte-preservation tests prevent unintended file changes.
- Concurrent search/refetch may overwrite fresh metadata: invalidate older reads and accept only the latest mounted-space response.
- An archive can race with a rename after the parent check, as with current upload/delete routes. Retain the existing consistency model; an atomic cross-document archive lock is outside this bounded change.
- Compact layouts can crowd controls: use wrapping rows, full touch targets, semantic colors, and mobile/light/dark verification.

## Rollout And Rollback

Deploy the additive PATCH route and UI together using the existing deployment process. No data migration, new dependency, index, environment variable, or feature flag is needed. Roll back the application commit if necessary; successfully renamed filenames remain valid for the previous UI and download route. Original names are not historically stored, so application rollback does not undo names; users can rename again while the feature is available.

## Non-Goals

- File replacement, extension conversion, folders, tags, sorting/filter APIs, bulk actions, storage migration, or changing the 5 MB limit.
- Restyling other document modules or the receipt uploader's default layout.
- Unrelated preview lifecycle, authentication, or archive transaction refactors.
- Implementation, deployment, or commits during this planning task.

## Implementer Handoff Checklist

- [x] Requirement is unambiguous or assumptions are explicit.
- [x] Files to change are named.
- [x] Phases are ordered.
- [x] Tests and commands are listed.
- [x] Risks and rollback notes are covered.
