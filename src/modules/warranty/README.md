# Warranty module

The Warranty module stores private `warranty_item` and `warranty_document` records in the shared `content` collection. A stable `warranty_key` associates files with an item, so documents do not depend on a MongoDB ID surviving a backup restore.

The admin UI lives at `/admin/warranty`. Its dashboard widget uses `/api/widgets/summary?module_type=warranty_item`; it never loads document bytes. Item and document mutations use the dedicated `/api/warranty` routes, keeping uploads, private access, and coverage validation out of generic content CRUD.

Uploaded files are base64-backed content records, capped at 5 MB each. List responses omit file bytes. Downloads use `private, no-store`, `nosniff`, and attachment headers. Only PDF, JPEG, PNG, GIF, and WebP are preview-eligible; other files remain download-only.
