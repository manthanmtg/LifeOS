import { describe, expect, it } from "vitest";

import { canPreviewWarrantyDocument, parseWarrantyUpload } from "../uploads";

describe("warranty uploads", () => {
  it("uses the decoded bytes rather than a caller supplied size", () => {
    expect(
      parseWarrantyUpload({
        filename: "invoice.txt",
        content_type: "text/plain",
        data: Buffer.from("receipt").toString("base64"),
      }),
    ).toMatchObject({ size: 7, content_type: "text/plain" });
  });

  it("rejects noncanonical base64 instead of accepting a malformed file", () => {
    expect(() =>
      parseWarrantyUpload({
        filename: "invoice.txt",
        content_type: "text/plain",
        data: "c mVjZWlwdA==",
      }),
    ).toThrow("Document data must be canonical base64");
  });

  it("only previews PDFs and explicitly allowed image types", () => {
    expect(canPreviewWarrantyDocument("application/pdf")).toBe(true);
    expect(canPreviewWarrantyDocument("image/webp")).toBe(true);
    expect(canPreviewWarrantyDocument("image/svg+xml")).toBe(false);
    expect(canPreviewWarrantyDocument("text/html")).toBe(false);
  });
});
