# Warranty module: coverage, uploaded documents, and service history

## Goal

Add a private Warranty module for household devices, appliances, and other belongings. Each item brings together purchase information, multiple warranty coverages, actual uploaded bills/documents, support contacts, service history, and expiry reminders so the owner can find what they need when something fails.

This is a feature design and implementation handoff only. No application implementation, deployment, or commit is part of this planning task. The user's latest requirement makes actual uploads a first-version requirement, alongside optional existing Bill links.

## Current State

- `package.json` uses Next.js 16.1.6, React 19.2.3, MongoDB driver 7, Zod 4, Tailwind 4, and Vitest 4. Required implementation verification is `pnpm format` and `pnpm check`.
- `src/registry.ts`, `src/app/admin/page.tsx`, and `src/components/shell/AdminSidebar.tsx` register modules and dashboard widgets. Command Palette and Global Module Search have their own icon maps. `src/app/admin/[module]/page.tsx` already provides dynamic module loading with `AdminModuleSkeleton`; no new page route is necessary.
- Data uses `ContentDocument` in the shared MongoDB `content` collection. `src/lib/schemas.ts` owns schema registration and existing calendar-date, currency, ObjectId, and MIME validators.
- `src/components/ui/DocumentUpload.tsx` already accepts any file type, converts files to base64, supports multiple files, processes uploads sequentially, exposes progress/errors, and limits each file to 5 MiB. Its compact variant and optional external input ref support a toolbar Upload button and one drop area.
- Expense Spaces stores each upload in a separate `expense_space_document` content record. Its document routes authenticate directly, return metadata-only lists, and serve bytes through an authenticated attachment response. This is a better fit than Bills' embedded attachment arrays for a growing warranty document archive.
- `src/components/ui/DocPreview.tsx` previews images/PDFs and offers downloads. Warranty must only invoke previews for the explicitly supported safe preview types below; other uploads remain downloadable.
- `src/app/api/bills/route.ts` supports `?compact=true`, which omits attachment bytes. Existing Bill records can be selected without downloading their files.
- Generic `/api/content` mutations already reject Expense Space domain-managed types. Warranty needs the same dedicated-route boundary for immutable keys, private files, and validation of relationships. Public generic reads currently rely on `is_public`, so Warranty also needs an explicit always-private guard.
- Notifications use source registration, a delivery ledger, timezone-aware scheduling, retries, and Telegram channels. `src/lib/notifications/sources/health.ts` demonstrates per-entry events. `netlify.toml` configures the existing `netlify/functions/notifications-dispatch.mts` hourly function; no new scheduler is necessary.
- `/api/export` includes all content, including file bytes. `/api/import` strips content MongoDB IDs before insertion. Warranty-to-document relationships therefore cannot use MongoDB IDs as permanent foreign keys.
- `src/lib/seed.ts` backfills new modules and initializes indexes. Maintenance already handles recurring upkeep; this feature does not duplicate its scheduling workflow.
- The working tree was clean at the start of this planning task. The documented `_template/Widget.tsx` reference is absent in this checkout; use the existing Maintenance widget and widget primitives as concrete references.

## Requirements

1. Create and edit items with minimal required data, search/filter them, and retain expired warranty and service history.
2. Support multiple independent coverage periods per item: manufacturer, component-specific, extended, seller, and other.
3. Upload actual bills, receipts, warranty certificates, manuals, service receipts, photos, and other files directly to an item. Uploading must not require a Bill record or an external URL.
4. Support any file type for storage/download, up to 5 MiB per file. Preview supported images and PDFs; show download-only controls for other types.
5. Keep optional links to existing Bills without copying their attachments or requiring that integration for uploads.
6. Record support details and dated service entries, with documents optionally associated with a coverage or service entry.
7. Show computed coverage status and configurable expiry reminders through existing notification infrastructure.
8. Provide a compact dashboard widget and module help documentation.
9. Keep items and files private across dedicated APIs, generic content APIs, backup restoration, and public module settings.
10. Preserve relationships after backup restore, avoid file bytes in list/summary responses, and use accessible responsive controls, semantic colors, skeletons, and recoverable error states.

## Assumptions

- Scope is personal/household warranty and service tracking, not a general asset-management or insurance system.
- The first version includes the core scope recommended in the preceding conversation: multiple coverages, purchase/support information, uploaded documents, optional Bill links, service history, reminders, and a widget.
- Only the item name is required to create a record. Coverage, purchase, and service details can be added later. Unknown dates never imply verified coverage.
- “Image, PDF or whatever” means unrestricted file-type storage/download following Expense Spaces, not universal browser previews or file conversion. The existing 5 MiB limit is retained.
- Item removal is reversible archive/restore in version one. No permanent item purge is provided. Individual uploaded files can be explicitly deleted after confirmation.
- Ownership (`owned`, `sold`, `retired`) is separate from archive state and computed coverage state. Sold, retired, and archived items do not generate new reminders or contribute to the widget.
- Dates are calendar dates in `YYYY-MM-DD`, inclusive through the warranty end date. Use notification settings' timezone, with the existing UTC default, consistently for API calculations, the widget, and reminders.
- New coverages default to reminders enabled with offsets `[7, 30]`; sending still requires globally enabled notifications and a configured channel. No channel or global notification setting is changed automatically.
- Maintenance integration, formal claim workflows, OCR/AI extraction, barcode scanning, QR labels, and universal preview support are deferred.
- Uploaded photos are documents in version one; a separate cover-photo selector and automatic list thumbnails are deferred.
- Optional Bill links survive full backups through the narrowly scoped import remapping described below. Deleting a Bill later leaves a readable missing-reference state.

## Proposed Design

### Module and data ownership

Register slug `warranty`, display name `Warranty`, icon `ShieldCheck`, `defaultPublic: false`, content type `warranty_item`, and search tags `warranty`, `devices`, `appliances`, `service`, `documents`.

Use two discriminators in the existing `content` collection:

- `warranty_item`: item information, coverage entries, service history, and Bill references.
- `warranty_document`: one uploaded file plus metadata, attached through an immutable `warranty_key` UUID.

Dedicated `/api/warranty` routes own mutations. Both document types always store `is_public: false`; reject caller-supplied visibility and server-owned fields. Register stored schemas in `SchemaRegistry` for consistency, but reject generic POST/PUT/PATCH/DELETE for these two types before any write. Return a Warranty-specific dedicated-API error without changing existing Expense Spaces errors.

Public `/api/content` list queries must exclude both types even if a bad historical/imported record has `is_public: true`. Generic single-item GET must require authentication for either type regardless of visibility. Authenticated generic reads remain compatible with existing backup/admin behavior, but the Warranty UI must exclusively use its compact dedicated routes.

### Schemas and types

Add the following exports to `src/lib/schemas.ts`, reusing the existing local primitive validators. Derive frontend payload types from schemas in `src/modules/warranty/types.ts`; use distinct metadata DTOs that cannot contain file bytes.

| Schema                    | Fields and constraints                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WarrantyCoverageSchema`  | `id`: UUID; `archived`: boolean default false; `label`: trimmed 1–120 chars; `type`: `manufacturer`, `component`, `extended`, `seller`, `other`; optional `provider` ≤200, `policy_number` ≤200, `start_date`, `end_date`, `coverage_notes` ≤3000, `exclusions` ≤3000; `reminder_enabled` default true; `reminder_offsets_days`: 1–10 unique integers 0–365, sorted, default `[7,30]`. If both dates exist require end ≥ start.                                                                                                                                                                                                                                                                                                             |
| `WarrantyServiceSchema`   | `id`: UUID; `archived`: boolean default false; `date`: calendar date; `type`: `repair`, `routine`, `inspection`, `replacement`, `other`; `description`: 1–1000 chars; optional `provider` ≤200, `reference_number` ≤200, `cost` finite/nonnegative, `currency` three-letter code default INR, `covered_by_warranty` boolean, `notes` ≤3000.                                                                                                                                                                                                                                                                                                                                                                                                 |
| `WarrantyBillLinkSchema`  | `id`: server-generated UUID; `bill_id`: ObjectId string or null after a restore with a missing target; `name_snapshot`: 1–200 chars. Maximum 20 links per item, unique link IDs and non-null Bill IDs. API derives snapshots when adding links; users cannot forge them.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `WarrantyItemSchema`      | Immutable `warranty_key`: UUID; server-owned `revision`: positive integer; `name`: 1–200; `category`: `appliance`, `electronics`, `computer`, `mobile`, `home`, `other` default other; optional `brand`, `model`, `serial_number`, `seller` ≤200 each, `location` ≤120, `purchase_date`, `purchase_price` finite/nonnegative, `order_number` ≤200; `currency` default INR; `ownership_status` default owned; `archived` default false; `support`: optional object with `name` ≤200, `phone` ≤100, valid `email` ≤254, HTTP(S) `url` ≤2048, `instructions` ≤3000; `notes` ≤5000; `coverages`: max 30, default []; `service_history`: max 200, default []; `linked_bills`: max 20, default []. IDs must be unique within each embedded array. |
| `WarrantyItemInputSchema` | Strict editable item fields from the preceding row, excluding `warranty_key`, `revision`, `archived`, and stored Bill links. Accept `linked_bill_ids`: unique ObjectId strings, max 20, default []; `removed_bill_link_ids`: unique UUIDs, max 20, default [], to explicitly unlink missing-reference snapshots. Separate item archive PATCH as below.                                                                                                                                                                                                                                                                                                                                                                                      |
| `WarrantyDocumentSchema`  | `warranty_key`: UUID; `filename`: trimmed 1–255, reject path separators/control characters; `content_type`: existing MIME validator or octet-stream fallback; `data`: canonical base64, nonempty, max 6,990,508 characters; `size`: server-computed integer 1–5,242,880; `kind`: `invoice`, `warranty`, `manual`, `service_receipt`, `photo`, `other` default other; optional `coverage_id`/`service_id`: UUID; optional `notes` ≤1000. At most one association ID may be set.                                                                                                                                                                                                                                                              |
| Request schemas           | Strict create/update/archive, upload, and document-metadata PATCH bodies. Do not accept keys beginning with `$`, dotted paths, visibility, raw Mongo updates, immutable keys, or timestamps. Metadata PATCH permits `kind`, `notes`, `coverage_id`, `service_id`; explicit null clears an optional association or notes. Reject empty PATCH. Filename/bytes replacement is not part of PATCH.                                                                                                                                                                                                                                                                                                                                               |

Use empty-to-omitted normalization in forms. Do not convert a blank monetary input to zero. Service costs retain their own currency; display totals grouped by currency, with no implied conversion. Serial numbers are strings and are not globally unique constraints. Coverages may overlap legitimately.

Coverage/service UUIDs are generated when adding an entry and preserved on edits. Item key and revision are generated by the server. Persisted coverage/service entries are archived/restored rather than physically removed from arrays: reject a PUT that drops an existing entry ID. This keeps document associations valid even if an entry is archived during an upload. Archived entries do not contribute to coverage calculations, service totals, or reminders; offer a Show archived toggle in their tabs. Array limits include archived entries and must produce clear limit errors. Unsaved drafts can be removed locally. A purchase date may prefill a new coverage's start date in the form, but changing the purchase date must never silently rewrite coverage dates.

### Computed coverage and listing behavior

Put pure functions in `src/lib/warranty/coverage.ts`:

- `getCoverageStatus(coverage, today)` returns `unknown`, `upcoming`, `active`, `expiring`, or `expired`, plus nullable days remaining. Missing either date means unknown; otherwise start > today means upcoming, end < today means expired, and a currently active period ending in 0–30 days is expiring.
- `summarizeWarrantyItem(item, today)` ignores archived coverage entries and returns counts per coverage state and earliest current expiry with coverage label. Never claim that remaining component coverage means the whole product is comprehensively covered.
- `buildWarrantySummary(items, today)` returns `{ tracked_items, expiring_items, next_expiry }`, counting distinct owned, unarchived items with at least one expiring coverage. `next_expiry` includes item ID/name, coverage label/end date, and days remaining; ties break by item name, item ID, coverage ID.

List filters: `search` (≤200 characters), `category`, `ownership`, `archived=false|true|all`, `coverage=all|unknown|upcoming|active|expiring|expired`, `page` default 1, `page_size` default 25/max 100. Default ownership is all; default archive filter is false. Coverage filters are “has at least one unarchived coverage in this state”; an item with no unarchived coverages matches unknown. Active excludes expiring, which has its own filter.

Search matches item name, brand, model, serial number, location, and seller using escaped literal case-insensitive matching. List endpoint projects only item identity, row fields, ownership/archive state, coverage dates/labels/archive flags, and timestamps. Calculate coverage filtering on these compact item records before slicing the page, so filtered pagination is correct. This deliberately bounded household-scale approach must never scan document bytes or service history. Sort expiring items first, then other current coverage, upcoming, unknown, expired; within groups use earliest relevant date, then name and ID. Return total and totalPages; out-of-range pages return an empty page, allowing the client to reset to page 1.

Return `{ items, page, pageSize, total, totalPages, today, timezone }`. `today` and `timezone` come from validated notification settings even when notifications are disabled. Refresh visible list/detail status at the next minute tick if that timezone's calendar date changed, and on window focus, so a tab left open overnight does not retain yesterday's badges.

### API contracts

All dedicated handlers authenticate using cookies/`verifyToken` before database access, validate ObjectIds, use existing API response helpers, and return `Cache-Control: private, no-store`. Add `/api/warranty` to protected paths in `src/proxy.ts`; existing origin protection applies unchanged.

| Method and path                                  | Request and response                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/warranty`                              | Filters above; metadata-only paginated response.                                                                                                                                                                                                                                                                   |
| `POST /api/warranty`                             | `{ payload: WarrantyItemInput }`; validate selected Bills by discriminator, derive snapshots, assign UUID and revision 1, insert private record, return full item DTO with 201. Name-only creation works.                                                                                                          |
| `GET /api/warranty/:id`                          | Full item plus `{ today, timezone }`; no document bytes. Resolve linked Bill metadata using a projection that excludes attachments, marking missing targets explicitly.                                                                                                                                            |
| `PUT /api/warranty/:id`                          | `{ revision, payload: WarrantyItemInput }`; validate merged domain relationships, replace editable item fields while preserving UUID/archive state, increment revision, return updated item. Use a conditional update filter on ID, discriminator, and revision; return 409 if a concurrent edit won.              |
| `PATCH /api/warranty/:id`                        | Exactly `{ revision, archived: boolean }`; conditional update and revision increment. Archive/restore preserves all history/files. An archived item rejects PUT and document mutations with 409 until restored.                                                                                                    |
| `GET /api/warranty/:id/documents`                | `page`, `page_size`, optional escaped `search` by filename, `kind`, `coverage_id`, `service_id`; resolve parent then query children by its UUID and discriminator. Return `{ documents, page, pageSize, total, totalPages }` using an inclusion projection excluding data.                                         |
| `POST /api/warranty/:id/documents`               | `{ filename, content_type?, data, kind?, coverage_id?, service_id?, notes? }`; validate actual decoded length, parent and association, store independent private document, return metadata only with 201.                                                                                                          |
| `GET /api/warranty/:id/documents/:documentId`    | Resolve both IDs and require child UUID to match parent. Return file bytes with attachment disposition, encoded original filename, `nosniff`, actual decoded Content-Length, and private/no-store. Serve only PDF and allowlisted image MIME types with their original MIME; use octet-stream for all other types. |
| `PATCH /api/warranty/:id/documents/:documentId`  | Partial allowed document metadata fields; validate resulting association against the parent; update only those fields/timestamp and return metadata. No bytes or filename changes.                                                                                                                                 |
| `DELETE /api/warranty/:id/documents/:documentId` | Explicit file deletion scoped by ID, discriminator, and parent key; return `{ success: true }`. Return 404 on a missing/mismatched document.                                                                                                                                                                       |

Errors: 401 unauthorized, 400 malformed JSON/IDs/validation/invalid association/dropped persisted entry IDs, 404 missing record, 409 archived/revision conflict, 413 upload size limit, generic 500 unexpected failure. Client errors must preserve drafts. Log route/method/error class, not filenames, serial numbers, uploaded contents, request bodies, or credentials.

Create `src/lib/warranty/server.ts` for authentication, parent resolution, private DTO projection, sanitized logging, and validated settings-to-calendar context. Create `repository.ts` for item CRUD, compact listing, document metadata queries, and conditional updates. Keep route adapters thin; no new generic repository framework.

On document upload/reassociation, require the chosen coverage/service entry to exist and be unarchived. Existing associations to subsequently archived entries remain readable and display an archived label; metadata PATCH can clear them. Archiving an entry never deletes files. On item PUT, derive active Bill links from `linked_bill_ids`, preserve their existing link UUIDs, and assign UUIDs/snapshots for newly selected Bills. Retain unresolved links with null Bill IDs unless their link UUID appears in `removed_bill_link_ids`; previously linked non-null IDs that now resolve to no Bill may be retained without revalidation failure. Reject newly added nonexistent Bill IDs, unknown removal UUIDs, and selecting/removing the same link in one request. Unlinking affects only the reference, never the Bill itself.

Archive checks and child writes are separate operations, matching Expense Spaces' consistency model. A concurrent archive may allow one in-flight child operation to finish; no file becomes orphaned because the parent is retained. Do not add a transaction or distributed lock for this case. Concurrent parent edits use revision checks to prevent silent loss of service history or coverage arrays.

### Upload, download, and document UI

Reuse `DocumentUpload` unchanged, with no `accept` restriction. State the limit as “Any file type · Max 5 MB each · Multiple files supported” in UI. Reject empty files using its `validateFile` prop; enforce the same check server-side. Preserve the existing sequential upload queue and its partial-failure behavior.

For the upload route, add a small `readWarrantyUploadBody` helper that reads a bounded UTF-8 request body (7,100,000 bytes maximum), stops/cancels above the bound, and returns 413 before JSON decoding large bodies. Also reject excessive declared Content-Length. After strict request-schema parsing, require canonical padded base64, decode with `Buffer.from`, compare re-encoded base64 to the input, and validate actual bytes. Never trust supplied MIME as proof of file content or a caller-supplied size.

Use one document per content record, with no embedded file array or persistent filesystem directory. MongoDB persistence already includes backups and needs no new service credentials. Upload limits apply per file; the UI submits separate requests for a batch. No hidden per-item aggregate quota is introduced.

Document list displays filename, type/category, formatted size, upload date, and optional service/coverage label. Provide Upload, download, edit metadata, and confirmed delete. One file-input instance backs the toolbar and drop area. Keep the uploader mounted during metadata refreshes so the first successful upload cannot interrupt the remaining batch. Show saved uploads even if a later upload fails. Do not automatically retry ambiguous POST failures, which could duplicate files; duplicate names themselves are valid.

Preview allowlist: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, and `application/pdf`. Fetch a file only when preview/download is requested. Construct a Blob with the validated response MIME, and pass its object URL to `DocPreview`. SVG, HTML, Office documents, archives, unknown MIME types, and unsupported image codecs use download-only controls. Preview rendering failure leaves a visible download option; it must not lose the document row. Never use `dangerouslySetInnerHTML`, an uploaded URL as navigation, or remote URL fetching to preview unknown files.

Revoke object URLs on preview replacement, close, item switch, and unmount; abort obsolete reads so late responses cannot reopen an old item's file. Direct download anchors point to the authenticated endpoint. This is private file storage, not malware scanning or document conversion.

Create-item flow: save the minimal item first and open its detail view on Documents with a visible “Item saved—add your files” confirmation. Upload failure does not roll back the saved item. Uploading an invoice neither creates a Bill automatically nor requires one.

### Admin interface and Bill links

`AdminView.tsx` owns list filters/page and selected item from `?item=<id>`. Clicking a row opens an in-page detail panel; Back restores filters and scroll. A missing deep-linked item shows a readable not-found state with Back, not an empty success state. There is no new nested page route.

Use these components under `src/modules/warranty/components/`:

- `WarrantyList.tsx`: responsive list/cards, search, category/ownership/archive/coverage filters, pagination, coverage labels, and Create action.
- `WarrantyItemForm.tsx`: item/purchase/support fields with progressive sections; only name required. Money, dates, serial number, and support URL have field-level validation.
- `WarrantyDetail.tsx`: Overview, Coverage, Documents, Service History tabs, item edit, ownership selection, and archive/restore confirmation. Own item revision and reject stale-save replacement.
- `WarrantyCoverageEditor.tsx`: add/edit/archive/restore coverage entries and existing `RelativeDateNotificationFields`; preserve UUIDs. Explain that both dates are required for calculated status and reminders.
- `WarrantyDocuments.tsx`: independent metadata loading, uploader, association editor, preview lifecycle, and delete confirmation.
- `WarrantyServiceHistory.tsx`: newest-first history and add/edit/archive/restore form; per-currency totals of unarchived entries and a Documents action filtering by the saved service UUID. Save the service entry before uploading associated files.
- `WarrantyBillLinks.tsx`: picker populated from `/api/bills?compact=true`, selected names, remove-link action, and selected-Bill inspection. Fetch an individual Bill only when opening it, reuse its attachment metadata for explicit preview/download, and keep bytes out of item/list state. Missing links retain their snapshot label with an Unlink action. Read-only inspection does not edit Bills.

Bill attachment inspection uses existing `/api/bills/:id` JSON and applies the same preview allowlist as warranty uploads. Convert only the explicitly selected attachment to a Blob. Revoke URLs as above. Do not assume an unimplemented `/admin/bills?item=` deep link works.

Render `AdminModuleSkeleton`, `ContentListSkeleton`, and `SkeletonBlock` as appropriate. Preserve existing results during refresh; distinguish initial failure, empty collection, and no search results. Use abort/request-ID guards for list, detail, Bill picker, and document reads. On successful mutation followed by failed refresh, retain the saved result and report refresh failure separately. Reset pagination on filter changes/deletion and ignore stale responses.

All interactive files use `"use client"`. Use semantic colors, Lucide icons, keyboard-operable tabs, visible focus, labeled inputs, accessible dialog primitives/`ConfirmDialog`, at least 44px actions, and wrapping layouts at 375px. Changing tabs with a dirty edit offers discard/cancel; in-flight saves/uploads prevent item switching until complete. Unknown status uses a neutral tone; expiry warnings must retain text, not color alone.

### Reminders and dashboard

Add `warrantyNotificationSource` in `src/lib/notifications/sources/warranty.ts` and register it once. Query only owned/unarchived items with a projection containing their UUID/name and coverage fields. Validate a dedicated projected-source schema rather than parsing incomplete records with the full item schema.

For unarchived, complete, nonexpired coverage periods with reminders enabled, build one candidate per offset. Use `source.module_type = "warranty_item"`, `source.document_id = warranty_key` (stable across restore), `source.event = "warranty_expiry:" + coverage.id`, and `source.event_date = end_date`. Keep `scheduled_date = addDaysToCalendarDate(end_date, -offset)` exactly; never clamp missed dates to today. Call existing `isCandidateDue` for delivery-hour/catch-up handling. No reminder fires before coverage starts or after expiry. An offset scheduled before coverage starts is skipped, not rescheduled.

Message includes item name, coverage label, expiry date, and `/admin/warranty?item=<current MongoDB ID>`; no documents, price, serial number, or support credentials. Multiple coverages ending together remain independent events. Existing ledger keys distinguish item, coverage, date, offset, and channel. Activation summary counts eligible coverage periods, with `explicit_count = eligible_count` and `inherited_count = 0`.

Use the existing dispatcher, channels, settings, delivery ledger, and Netlify schedule unchanged. Global disabled/unconfigured state produces a neutral settings link in the editor; do not imply reminders will be delivered without configuration. Already-materialized deliveries retain the platform's snapshot/retry behavior; editing/archiving prevents new candidates but does not promise cancellation of a queued message. Document this limitation in module help.

Add an early `warranty_item` branch to `/api/widgets/summary`, using a projection of only eligible item IDs/names/coverage IDs/dates/labels/archive flags and shared date helpers. Return `buildWarrantySummary`. The widget uses `WidgetStat` for “items expiring in 30 days” and one `WidgetHighlight` for the next relevant item/coverage. When no items are expiring, show tracked item count and the next current coverage expiry, or “No upcoming expiry recorded” if none exists. When no items are tracked, show zero and a short add-item suggestion. Use `WidgetCard href="/admin/warranty"`, no nested buttons, and stay within 280px. Fetch only the summary endpoint.

### Backup, privacy, and indexes

Export remains unchanged: both record types and bytes are already included. Add a scoped restore preparation helper, `src/lib/warranty/restore.ts`, called in `/api/import` before any collection deletion:

1. When a content array is supplied, validate Warranty payloads, including canonical base64 and actual decoded size matching stored size; require unique item UUIDs and each Warranty document's UUID/optional association to resolve inside that backup. Reject invalid new-module data with 400 before mutating system/content/metrics.
2. Allocate fresh ObjectIds for the complete incoming content array, retaining the existing policy of not reusing exported MongoDB IDs. Build an old-ID-to-new-ID map for incoming `bill` records only.
3. Rewrite `warranty_item.payload.linked_bills[*].bill_id` using that map; missing targets become null while keeping the snapshot. Do not repair unrelated module references.
4. Force both Warranty types private. Preserve immutable UUIDs, embedded entry IDs, file bytes, and metadata. Insert the prepared records using their new IDs. Leave system/metrics behavior and backup version 1.0 unchanged.

This is not a general import refactor. Preserve behavior for backups with no Warranty records; verify that legacy documents without `_id` still import. Warranty references by UUID survive without remapping. A backup containing child documents without their parent is rejected, since normal export includes the complete collection.

Add idempotent indexes in `seed.ts`:

- Unique partial index `{ "payload.warranty_key": 1 }` restricted to `module_type: "warranty_item"`.
- Child-list index `{ module_type: 1, "payload.warranty_key": 1, created_at: -1, _id: -1 }`.

Do not create indexes per upload. Existing module backfill exposes Warranty to current installations; no historical item migration is required. UI visibility settings cannot make Warranty content public because route/data guards remain authoritative.

## Files To Change

All paths below are repository-relative. No existing files are deleted.

| File                                                         | Action | Detailed change                                                                                                                       |
| ------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/registry.ts`                                            | Modify | Register private Warranty module with ShieldCheck and searchable metadata.                                                            |
| `src/lib/schemas.ts`                                         | Modify | Stored and strict input schemas, domain validations, two discriminator registrations.                                                 |
| `src/lib/warranty/coverage.ts`                               | Add    | Pure status, item summary, widget summary, stable tie-breaking.                                                                       |
| `src/lib/warranty/server.ts`                                 | Add    | Auth, parent lookup, metadata DTO conversion, safe error logging, calendar context.                                                   |
| `src/lib/warranty/repository.ts`                             | Add    | Projected queries, revision-based item updates, scoped document operations and association checks.                                    |
| `src/lib/warranty/files.ts`                                  | Add    | Browser-safe size constants, preview MIME allowlist, and response MIME selection shared by UI and server.                             |
| `src/lib/warranty/uploads.ts`                                | Add    | Server-only bounded body reader and base64/size/filename validation. Never import this Node-dependent module into a client component. |
| `src/lib/warranty/restore.ts`                                | Add    | Prevalidate Warranty backup records and prepare fresh IDs/Bill remapping.                                                             |
| `src/app/api/warranty/route.ts`                              | Add    | Authenticated filtered list and create.                                                                                               |
| `src/app/api/warranty/[id]/route.ts`                         | Add    | Read/update item and archive/restore.                                                                                                 |
| `src/app/api/warranty/[id]/documents/route.ts`               | Add    | Paginated metadata list and actual file upload.                                                                                       |
| `src/app/api/warranty/[id]/documents/[documentId]/route.ts`  | Add    | Authenticated bytes, metadata edit, scoped deletion.                                                                                  |
| `src/app/api/content/route.ts`                               | Modify | Block Warranty generic writes; explicitly exclude it from public list results.                                                        |
| `src/app/api/content/[id]/route.ts`                          | Modify | Block Warranty generic mutations; enforce always-private single-item reads.                                                           |
| `src/proxy.ts`                                               | Modify | Protect Warranty API family, preserving origin rules.                                                                                 |
| `src/lib/seed.ts`                                            | Modify | Two Warranty indexes; rely on existing module backfill.                                                                               |
| `src/app/api/import/route.ts`                                | Modify | Prepare/validate content before any deletes; scoped Warranty restore behavior.                                                        |
| `src/modules/warranty/types.ts`                              | Add    | Item, coverage, service, document metadata, list, detail, and summary types.                                                          |
| `src/modules/warranty/api.ts`                                | Add    | Typed fetch client, error handling, abort support, CRUD/document methods and explicit Bill inspection.                                |
| `src/modules/warranty/AdminView.tsx`                         | Add    | List/detail selection, query parameter, loading/error states and refresh coordination.                                                |
| `src/modules/warranty/components/WarrantyList.tsx`           | Add    | Responsive search/filter/list/pagination UI.                                                                                          |
| `src/modules/warranty/components/WarrantyItemForm.tsx`       | Add    | Item/purchase/support creation and edit form.                                                                                         |
| `src/modules/warranty/components/WarrantyDetail.tsx`         | Add    | Four tabs, dirty-state handling, revision state, archive/restore.                                                                     |
| `src/modules/warranty/components/WarrantyCoverageEditor.tsx` | Add    | Multiple coverage periods and reminder fields.                                                                                        |
| `src/modules/warranty/components/WarrantyDocuments.tsx`      | Add    | Upload, metadata management, preview/download and delete.                                                                             |
| `src/modules/warranty/components/WarrantyServiceHistory.tsx` | Add    | Service entries and document association navigation.                                                                                  |
| `src/modules/warranty/components/WarrantyBillLinks.tsx`      | Add    | Existing-Bill picker, references, missing states and read-only inspection.                                                            |
| `src/modules/warranty/Widget.tsx`                            | Add    | Compact summary-only widget with loading/error/empty states.                                                                          |
| `src/app/api/widgets/summary/route.ts`                       | Modify | Projected Warranty branch and shared date/status computation.                                                                         |
| `src/app/admin/page.tsx`                                     | Modify | Dynamic Warranty widget import with literal loading option.                                                                           |
| `src/components/shell/AdminSidebar.tsx`                      | Modify | ShieldCheck icon mapping.                                                                                                             |
| `src/components/shell/GlobalModuleSearch.tsx`                | Modify | ShieldCheck icon mapping.                                                                                                             |
| `src/components/ui/CommandPalette.tsx`                       | Modify | ShieldCheck icon mapping.                                                                                                             |
| `src/lib/notifications/sources/warranty.ts`                  | Add    | Per-coverage expiry source and activation summary.                                                                                    |
| `src/lib/notifications/sources/registry.ts`                  | Modify | Register the Warranty source.                                                                                                         |
| `src/modules/warranty/README.md`                             | Add    | Data, routes, upload/storage limits, backup relationships, operational behavior.                                                      |
| `src/modules/warranty/info.md`                               | Add    | User guide: add item, upload bills, coverage, services, reminders, archive and file deletion.                                         |
| `README.md`                                                  | Modify | Add Warranty to module list and document notification prerequisites.                                                                  |
| `AGENTS.md`                                                  | Modify | Add Warranty API/domain-managed storage and always-private behavior to project guidance.                                              |

Test files to add/modify are named in the Testing Plan below and are also part of the implementation scope. Shared `DocumentUpload`, `DocPreview`, notification dispatcher, scheduler, and Maintenance need no product changes for this design.

## Implementation Phases

### Phase 1: Domain contracts and calculations

1. Add schema and helper tests, then implement Warranty schemas/types and pure coverage functions.
2. Lock down date boundaries, missing-date states, distinct-item counts, multi-coverage behavior, currencies, and UUID preservation.
3. Add upload validation/body-bound tests and implement `uploads.ts` without changing shared upload behavior.

### Phase 2: Private persistence and restore safety

1. Implement server/repository helpers and all four route files, beginning with auth/scoping/invalid-input tests.
2. Add generic content guards and proxy protection before exposing any UI.
3. Implement metadata-only file listing, authenticated byte download, metadata edit/delete, and parent revision conflicts.
4. Implement restore prevalidation/remapping and indexes, with round-trip fixture tests. No production database changes or restore operations are needed during implementation.

### Phase 3: Item and coverage UI

1. Add typed API client, list, create/edit form, detail panel, and tabs.
2. Implement multiple coverages, configurable reminder controls, status labels, filters/pagination, archive/restore, and stale-request protection.
3. Register module and icons, retaining existing route skeletons. Add no public page.

### Phase 4: Actual documents, Bills, and services

1. Implement Documents with the existing uploader, multi-file queue, explicit metadata associations, preview allowlist, downloads, and deletion confirmation.
2. Implement service history and the save-before-attach workflow.
3. Implement optional existing-Bill selection and explicit read-only inspection, including missing references and object-URL cleanup.
4. Verify that a name-only item plus directly uploaded PDF/image works without any Bills records or notification configuration.

### Phase 5: Summaries and notifications

1. Add compact summary branch, widget, dashboard registration, and tests for 280px-compatible content and no full-data fetching.
2. Add/register the notification source and tests for independent coverage events, offsets, timezone/catch-up, stable identity, exclusions, and existing disabled/global-channel behavior.
3. Add module help/README/project guidance and operational limitations, including already-queued notification snapshots.

### Phase 6: Verification and release preparation

1. Run focused tests, then `pnpm format` and `pnpm check`; inspect formatting output and exclude unrelated changes.
2. Use Playwright MCP at `http://localhost:3091` for desktop/375px mobile verification, light/dark themes, authenticated Warranty and dashboard pages, and public privacy regression checks.
3. Exercise PNG, PDF, TXT, DOCX, and an unsupported-preview file; verify original download bytes/name, boundary sizes, failed upload retry, independent multiple files, and archive/restore.
4. Use disposable test data only; do not restore over a real database or send live Telegram messages. Verify backup round trips and notifications with isolated fixtures/mocked channels. Stop a dev server only if this work started it.

## Testing Plan

| Test                | File or command                                                                                                                                        | Purpose                                                                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Schema/date rules   | Add `src/lib/warranty/__tests__/schemas.test.ts` and `coverage.test.ts`                                                                                | Name-only record, invalid dates/leap days, end/start order, duplicate IDs, limits, money/currencies, 0/30/31-day boundaries, mixed coverages and unknown states.                                                         |
| Upload boundary     | Add `src/lib/warranty/__tests__/uploads.test.ts`                                                                                                       | Canonical base64, empty/invalid input, exact 5 MiB/one-byte-over, forged size/MIME, absent MIME, large streamed body, filename/control characters, preview allowlist.                                                    |
| Item API            | Add `src/app/api/warranty/__tests__/route.test.ts` and `src/app/api/warranty/[id]/__tests__/route.test.ts`                                             | Auth before DB, create defaults, query validation, projections, filtered pagination, stable UUID, revision conflicts, archive/restore, Bill validation, persisted-entry preservation and association retention.          |
| Document API        | Add `src/app/api/warranty/[id]/documents/__tests__/route.test.ts` and `src/app/api/warranty/[id]/documents/[documentId]/__tests__/route.test.ts`       | Upload actual bytes, metadata-only output, discriminator/parent scoping, association validation, archive checks, headers, unsafe MIME download-only, patch preservation, deletion and errors.                            |
| Privacy/proxy       | Modify `src/app/api/content/__tests__/route.test.ts`, `src/app/api/content/[id]/__tests__/route.test.ts`, and `src/app/__tests__/proxy.test.ts`        | Generic mutation bypass blocked, nonadmin list/single reads blocked even with malicious public flag, admin behavior retained, CSRF and new API protection.                                                               |
| Restore             | Add `src/lib/warranty/__tests__/restore.test.ts`; modify `src/app/api/import/__tests__/route.test.ts` and `src/app/api/export/__tests__/route.test.ts` | File bytes included, fresh Mongo IDs, UUID/entry associations preserved, linked Bills remapped, missing links retained as snapshots, invalid/orphan Warranty backup rejected before all writes, legacy backup unchanged. |
| Index/registration  | Modify `src/lib/__tests__/seed.test.ts` and `src/lib/__tests__/admin-modules.test.ts`                                                                  | Index options, new-module backfill, private default, discoverability.                                                                                                                                                    |
| UI workflow         | Add `src/modules/warranty/__tests__/AdminView.test.tsx`                                                                                                | Name-only creation, independent failure/empty states, query-selected item, filters, stale response ordering, archive and conflict recovery.                                                                              |
| Forms/coverage      | Add `src/modules/warranty/components/__tests__/WarrantyItemForm.test.tsx` and `WarrantyCoverageEditor.test.tsx`                                        | Optional fields, field errors, date behavior, UUID preservation, reminder controls, keyboard actions and draft preservation.                                                                                             |
| Documents           | Add `src/modules/warranty/components/__tests__/WarrantyDocuments.test.tsx`                                                                             | Direct multi-file upload without Bills, queue stays mounted across reload, partial failure, no eager byte fetch, safe previews, download-only formats, URL cleanup, metadata edit and confirmed delete.                  |
| Services/Bills      | Add `src/modules/warranty/components/__tests__/WarrantyServiceHistory.test.tsx` and `WarrantyBillLinks.test.tsx`                                       | Service edits/history, currencies, attachment association, compact Bill picker, lazy inspection, missing Bill reference and unlink preservation.                                                                         |
| Summary/widget      | Modify `src/app/api/widgets/summary/__tests__/route.test.ts`; add `src/modules/warranty/__tests__/Widget.test.tsx`                                     | Only compact projections, shared timezone, distinct items, exclusion rules, summary-only fetch, loading/error and bounded content.                                                                                       |
| Notifications       | Add `src/lib/notifications/sources/__tests__/warranty.test.ts`; modify `src/lib/notifications/sources/__tests__/registry.test.ts`                      | Exact registry membership, two same-date coverages distinct, stable UUID dedupe inputs after restore, offsets, timezone/DST, catch-up without date clamping, no expired/unknown/sold/retired/archived candidates.        |
| Regression          | Existing uploader/preview, Bills, Expense Spaces, dispatcher and notification settings suites                                                          | Confirm no shared behavior changes. All run under the full check below.                                                                                                                                                  |
| Focused command     | `pnpm test -- src/lib/warranty src/modules/warranty src/app/api/warranty src/lib/notifications/sources/__tests__/warranty.test.ts`                     | Fast feedback on new feature surfaces.                                                                                                                                                                                   |
| Required checks     | `pnpm format` then `pnpm check`                                                                                                                        | Formatting, lint, typecheck, production build and all tests.                                                                                                                                                             |
| Visual verification | Playwright MCP: `/admin/warranty`, `/admin`, public `/`, `/api/warranty` logged out                                                                    | Desktop/mobile, theme tokens, long names, keyboard focus, upload/service workflows, widget overflow and privacy.                                                                                                         |

API test files follow the Node Vitest environment used by Expense Spaces document tests. Mock MongoDB and auth; test query predicates/projections, not just returned fixtures. Use byte-for-byte file round-trip fixtures and assertions that unauthorized handlers never access the database. Tests must check actual failed-write/partial-success user behavior, not merely mirror helper implementation.

## Edge Cases

- Warranty expires today: expiring, zero days remaining; expiration begins the next calendar day in the configured timezone.
- Missing one coverage date: unknown, no reminders until dates are complete; users may still save documents and service history.
- A comprehensive plan expires while motor coverage continues: show both named periods; do not label the entire appliance fully protected.
- Registration/installation may start coverage after purchase; preserve independent dates.
- Same filename or serial number on multiple records: allowed; identity is UUID/ObjectId-based.
- Existing Bill removed after linking: keep snapshot and allow unlink; directly uploaded invoice remains unaffected.
- Service/coverage archiving with attached documents: preserve the entry UUID and files, show an archived association label, and exclude the entry from active calculations. An in-flight upload racing with archive remains attached to an existing entry.
- Archived item: files remain readable/downloadable; edits/uploads/deletes require restoring first. Sold/retired but unarchived records remain editable for historical corrections.
- Cross-item file URL: 404 even if the document ID exists. Missing parent also means no file access.
- Concurrent edit in another tab: 409 retains draft with Reload/Cancel options; no silent full-payload overwrite.
- Upload success followed by list failure: keep successful metadata locally, expose retry refresh, and do not re-upload automatically.
- Unrecognized/empty browser MIME: store octet-stream; download works. Bad image/PDF bytes fail preview without executing as HTML or changing the stored file.
- New item with reminders configured for an already-missed offset: only the existing catch-up window applies; no burst of all historical reminders.
- A file delete is irreversible within the application; confirmation names the file and explains that recovery requires an existing backup.

## Risks And Mitigations

- Base64 increases request and backup sizes. Keep the existing 5 MiB per-file limit, bounded requests, separate child records, projections, and on-demand bytes. Deployment-platform request ceilings may be lower than application limits; verify a near-limit upload on the actual hosting preview before release and report an actionable failure rather than silently reducing the limit. Object storage is a future migration, not a first-version dependency.
- Arbitrary file types cannot all be previewed safely. Download everything, preview only the allowlist, never render uploaded HTML/SVG as a document, and use no-store/nosniff/attachment responses.
- Generic content routes and permissive import are alternative mutation/read paths. Explicit type guards and pre-import validation prevent bypassing Warranty privacy or relationships.
- Full editable item PUT could lose concurrent history. Revision predicates prevent silent overwrite; document writes do not replace the parent payload.
- Status filtering scans compact item records. This is acceptable for the assumed household scale; document bytes/history never participate. If that scale changes, move filtering to database aggregation without changing the API contract.
- Backup ID rewriting is shared code. Keep the modification scoped, validate before destructive work, and test legacy backups as well as new relationships. Existing import is not transactional; this feature does not claim to make general restore atomic.
- Notification snapshots can outlive edits, and restored content can meet a reminder window again. Stable UUID identities preserve existing dedupe keys; queued snapshot behavior and ledger retention remain the platform's existing semantics.

## Rollout And Rollback

Ship schemas, private API guards, import support, UI, notification source, and widget in the same release. No new package, service, environment variable, or scheduler is required. Existing module backfill makes Warranty available and indexes initialize through the existing seed path. Normal item/file CRUD works without Telegram configuration.

Before release, verify file-size behavior on the actual hosting environment and a representative backup round trip in an isolated test database. Retain the normal pre-deployment database backup. No real restore or notification send is part of this planning or local verification task.

For an operational rollback, disable the Warranty module in system configuration and remove/disable its notification source while keeping the always-private content guards and validated storage routes deployed. UI hiding alone is not a data-access or notification-off switch. Do not roll back only the guards while leaving Warranty data writable through generic APIs. If reverting all feature code, first preserve a backup and use a compatibility patch retaining the Warranty generic mutation/read guards; leave stored records/indexes intact for a forward fix. Do not delete user uploads as rollback cleanup.

## Non-Goals

- Application implementation, commits, deployment, production data writes, or live notification sends during this planning task.
- General asset depreciation, resale management, insurance policies, AMCs, inventory quantities, or multi-user sharing.
- Formal warranty claims/status pipeline, repair-vs-replace recommendations, OCR, AI extraction, automatic manufacturer registration, or external support API integrations.
- Maintenance task creation/synchronization, calendar integrations, or new notification channels.
- Unlimited file size, object-storage migration, malware scanning, arbitrary active-content previews, file replacement/rename, bulk download/delete, or automatic Bill creation.
- Public Warranty views or permanent item deletion.

## Implementer Handoff Checklist

- [x] Requirement is unambiguous or assumptions are explicit.
- [x] Actual uploaded bills/documents of any file type are included in version one, independent of links.
- [x] Files, routes, schemas, limits, privacy boundaries, and restore behavior are named.
- [x] Phases are ordered and prerequisites are explicit.
- [x] Tests, required commands, and visual verification are listed.
- [x] Risks, limitations, operational prerequisites, and rollback notes are covered.
- [x] No application implementation is authorized or performed by this planning artifact alone.
