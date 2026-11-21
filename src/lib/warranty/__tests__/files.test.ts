import { describe, expect, it } from "vitest";

import {
  canPreviewWarrantyDocument,
  safeWarrantyResponseContentType,
  WARRANTY_MAX_FILE_SIZE,
  WARRANTY_PREVIEW_CONTENT_TYPES,
} from "../files";

describe("warranty files", () => {
  it("allows every declared preview content type", () => {
    for (const contentType of WARRANTY_PREVIEW_CONTENT_TYPES) {
      expect(canPreviewWarrantyDocument(contentType)).toBe(true);
    }
  });

  it("rejects content types outside the preview allowlist", () => {
    expect(canPreviewWarrantyDocument("application/zip")).toBe(false);
    expect(canPreviewWarrantyDocument("application/msword")).toBe(false);
    expect(canPreviewWarrantyDocument("image/svg+xml")).toBe(false);
    expect(canPreviewWarrantyDocument("")).toBe(false);
  });

  it("matches content types case-insensitively", () => {
    expect(canPreviewWarrantyDocument("APPLICATION/PDF")).toBe(true);
    expect(canPreviewWarrantyDocument("Image/JPEG")).toBe(true);
    expect(canPreviewWarrantyDocument("IMAGE/GIF")).toBe(true);
  });

  it("does not match partially overlapping prefixes", () => {
    expect(canPreviewWarrantyDocument("application/pdfx")).toBe(false);
    expect(canPreviewWarrantyDocument("image/jpegfoo")).toBe(false);
    expect(canPreviewWarrantyDocument("application/pdf; charset=utf-8")).toBe(
      false,
    );
  });

  it("keeps a 5 MiB upload ceiling", () => {
    expect(WARRANTY_MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
  });

  it("returns the lowercased content type when preview is safe", () => {
    expect(safeWarrantyResponseContentType("Image/PNG")).toBe("image/png");
    expect(safeWarrantyResponseContentType("application/pdf")).toBe(
      "application/pdf",
    );
  });

  it("falls back to octet-stream for unsafe content types", () => {
    expect(safeWarrantyResponseContentType("text/html")).toBe(
      "application/octet-stream",
    );
    expect(safeWarrantyResponseContentType("")).toBe(
      "application/octet-stream",
    );
  });

  it("never echoes an attacker-influenced content type when unsafe", () => {
    const unsafe = 'application/pdf"\r\nX-Injection: 1';
    expect(safeWarrantyResponseContentType(unsafe)).toBe(
      "application/octet-stream",
    );
  });
});
