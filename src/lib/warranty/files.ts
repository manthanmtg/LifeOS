export const WARRANTY_MAX_FILE_SIZE = 5 * 1024 * 1024;

export const WARRANTY_PREVIEW_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export function canPreviewWarrantyDocument(contentType: string) {
  return WARRANTY_PREVIEW_CONTENT_TYPES.has(contentType.toLowerCase());
}

export function safeWarrantyResponseContentType(contentType: string) {
  return canPreviewWarrantyDocument(contentType)
    ? contentType.toLowerCase()
    : "application/octet-stream";
}
