# Bills

Store and organize household bills, receipts, and related files.

The **Bills** module is a private admin workspace for archiving bill records in the shared `content` collection. It adds a folder tree on top of the standard LifeOS Discriminator Pattern so bills can live at the root level, inside folders, or inside nested folder hierarchies.

Admin data is loaded through the bills-specific API family under `/api/bills`. The dashboard widget uses `/api/widgets/summary?module_type=bill` and links to `/admin/bills`.

## Features

- **Bill Archive**: Create, edit, inspect, and delete bill records with date, amount, currency, description, notes, and tags.
- **Folder Organization**: Create root folders and nested folders, move folders safely, and move bills between folders or back to the root.
- **Attachments**: Upload multiple images or PDFs per bill. Files are stored inline as base64 attachment payloads with a 5 MB per-file limit.
- **Compact Loading**: The admin list requests `/api/bills?compact=true` so attachment `data` blobs are omitted until a bill detail view needs the full record.
- **Search And Views**: Filter by bill text and switch between grid and list views while preserving folder navigation.
- **Metrics**: The admin view shows lifetime bills, current-month count, and current-month total with month-over-month trends.
- **Dashboard Widget**: Shows total archived bills, the latest bill preview, folder count, and attachment count.

## Data Schema

Bills use `module_type: "bill"` and are validated by `BillSchema` in `src/lib/schemas.ts`. Folders use `module_type: "bill_folder"` and are validated by `BillFolderSchema`.

### Bill Payload

| Field         | Type                   | Description                                                                |
| ------------- | ---------------------- | -------------------------------------------------------------------------- |
| `name`        | `string`               | Required bill name, trimmed and capped at 200 characters.                  |
| `bill_date`   | ISO datetime `string`  | Required bill date.                                                        |
| `amount`      | `number` (optional)    | Optional non-negative amount.                                              |
| `currency`    | currency code `string` | Defaults to `INR` through `CurrencyCodeSchema`.                            |
| `description` | `string` (optional)    | Optional trimmed description, capped at 1,000 characters.                  |
| `notes`       | `string` (optional)    | Optional trimmed notes, capped at 5,000 characters.                        |
| `folder_id`   | `string` (optional)    | Mongo document id of the containing `bill_folder`; omitted for root bills. |
| `attachments` | `BillAttachment[]`     | Up to 50 inline attachments; defaults to an empty array.                   |
| `tags`        | `string[]`             | Up to 20 trimmed tags, each capped at 50 characters.                       |

### Attachment Payload

| Field          | Type                  | Description                                                |
| -------------- | --------------------- | ---------------------------------------------------------- |
| `id`           | `string`              | Attachment id generated with `crypto.randomUUID()`.        |
| `filename`     | `string`              | Original file name.                                        |
| `content_type` | `string`              | MIME type. Uploads accept `image/*` and `application/pdf`. |
| `data`         | base64 `string`       | File content; omitted from compact list responses.         |
| `size`         | `number`              | Estimated decoded size in bytes.                           |
| `uploaded_at`  | ISO datetime `string` | Upload timestamp.                                          |

### Folder Payload

| Field       | Type                          | Description                                                 |
| ----------- | ----------------------------- | ----------------------------------------------------------- |
| `name`      | `string`                      | Required folder name, trimmed and capped at 100 characters. |
| `parent_id` | `string` (optional)           | Parent `bill_folder` id; omitted for root folders.          |
| `color`     | hex color `string` (optional) | Optional `#rgb` or `#rrggbb` folder color.                  |

## API Routes

| Method   | Path                                       | Description                                                                                                     |
| -------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/bills`                               | List bills sorted newest first. Add `?compact=true` to omit attachment data blobs.                              |
| `POST`   | `/api/bills`                               | Create a private bill document after `BillSchema` validation.                                                   |
| `GET`    | `/api/bills/:id`                           | Fetch one full bill by id.                                                                                      |
| `PUT`    | `/api/bills/:id`                           | Replace a bill payload after validation.                                                                        |
| `DELETE` | `/api/bills/:id`                           | Delete a bill.                                                                                                  |
| `PUT`    | `/api/bills/:id/move`                      | Move a bill with `{ "folder_id": "..." }` or `{ "folder_id": null }`.                                           |
| `POST`   | `/api/bills/:id/attachments`               | Append one image or PDF attachment.                                                                             |
| `DELETE` | `/api/bills/:id/attachments/:attachmentId` | Remove one attachment from a bill.                                                                              |
| `GET`    | `/api/bills/folders`                       | List folders sorted oldest first.                                                                               |
| `POST`   | `/api/bills/folders`                       | Create a private folder document after `BillFolderSchema` validation.                                           |
| `PUT`    | `/api/bills/folders/:id`                   | Rename or update folder payload fields.                                                                         |
| `DELETE` | `/api/bills/folders/:id`                   | Delete a folder and move its bills (including direct child folder bills) to root.                                |
| `PUT`    | `/api/bills/folders/:id/move`              | Move a folder with `{ "parent_id": "..." }` or `{ "parent_id": null }`; self and descendant moves are rejected. |

## Registration

- **Admin route**: `/admin/bills`
- **Content type**: `bill`
- **Folder content type**: `bill_folder`
- **Icon**: `Receipt`
- **Default visibility**: private
- **Schema registry keys**: `bill`, `bill_folder`

## Example Usage

Creating a bill through `/api/bills`:

```typescript
const response = await fetch("/api/bills", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    payload: {
      name: "Electricity Bill",
      bill_date: new Date("2026-05-01").toISOString(),
      amount: 2450,
      currency: "INR",
      description: "May electricity statement",
      tags: ["utilities", "home"],
      attachments: [],
    },
  }),
});
```

Moving the bill into a folder:

```typescript
await fetch(`/api/bills/${billId}/move`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ folder_id: folderId }),
});
```
