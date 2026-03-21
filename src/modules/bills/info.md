# Bills Module

## Overview
The Bills module lets users upload, store, and organize bills with a flexible folder system and multiple file attachments per bill.

## Features
- **Folder system** — Create folders and subfolders to organize bills. Bills can also live at the root level.
- **Bill management** — Each bill has a name, date, optional description and notes.
- **File attachments** — Attach multiple images (any type) and PDFs to a bill. Files are stored as base64 in MongoDB (5 MB per file limit).
- **Move bills** — Assign or reassign a bill to any folder at any time.
- **Search** — Filter bills by name or description in real time.
- **Responsive UI** — Works on mobile and desktop. Folder tree collapses into a toggle on small screens.

## Data Model
- Bills use `module_type: "bill"` in the `content` collection.
- Folders use `module_type: "bill_folder"` in the `content` collection.
- Attachments are stored inline in `payload.attachments` as base64 strings.

## API Routes
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/bills` | List all bills |
| POST | `/api/bills` | Create a bill |
| GET | `/api/bills/:id` | Get a single bill |
| PUT | `/api/bills/:id` | Update a bill |
| DELETE | `/api/bills/:id` | Delete a bill |
| GET | `/api/bills/folders` | List all folders |
| POST | `/api/bills/folders` | Create a folder |
| PUT | `/api/bills/folders/:id` | Rename/update a folder |
| DELETE | `/api/bills/folders/:id` | Delete folder (moves bills to root) |
| POST | `/api/bills/:id/attachments` | Upload a file attachment |
| DELETE | `/api/bills/:id/attachments/:attachmentId` | Remove an attachment |

## File Storage
Files are base64-encoded in the browser using `FileReader` and sent as JSON. No separate upload infrastructure is required. Each file is limited to 5 MB; accepted types are `image/*` and `application/pdf`.
