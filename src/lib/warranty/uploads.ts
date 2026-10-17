import "server-only";

import { WARRANTY_MAX_FILE_SIZE } from "./files";

export { canPreviewWarrantyDocument } from "./files";

export interface ParsedWarrantyUpload {
  filename: string;
  content_type: string;
  data: string;
  size: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseWarrantyUpload(value: unknown): ParsedWarrantyUpload {
  if (!isRecord(value)) throw new Error("Upload body must be an object");
  const filename =
    typeof value.filename === "string" ? value.filename.trim() : "";
  if (
    !filename ||
    filename.length > 255 ||
    /[\\/\u0000-\u001F\u007F]/.test(filename)
  ) {
    throw new Error("Invalid filename");
  }
  const data = typeof value.data === "string" ? value.data : "";
  if (!data || !/^[A-Za-z0-9+/]*={0,2}$/.test(data) || data.length % 4 !== 0) {
    throw new Error("Document data must be canonical base64");
  }
  const bytes = Buffer.from(data, "base64");
  if (bytes.length === 0 || bytes.toString("base64") !== data) {
    throw new Error("Document data must be canonical base64");
  }
  if (bytes.length > WARRANTY_MAX_FILE_SIZE)
    throw new Error("File exceeds 5 MB limit");
  const suppliedContentType =
    typeof value.content_type === "string" ? value.content_type.trim() : "";
  const content_type =
    suppliedContentType &&
    /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(suppliedContentType)
      ? suppliedContentType
      : "application/octet-stream";
  return { filename, content_type, data, size: bytes.length };
}
