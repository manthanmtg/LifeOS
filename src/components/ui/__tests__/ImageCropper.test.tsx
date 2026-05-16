// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("ImageCropper", () => {
  const source = readFileSync(
    join(process.cwd(), "src/components/ui/ImageCropper.tsx"),
    "utf8",
  );

  it("marks the overlay as a labelled modal dialog", () => {
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('aria-labelledby="image-cropper-title"');
    expect(source).toContain('id="image-cropper-title"');
  });

  it("gives the icon-only close control a stable accessible name", () => {
    expect(source).toContain('type="button"');
    expect(source).toContain('aria-label="Close image cropper"');
  });

  it("associates the zoom slider with its visible label", () => {
    expect(source).toContain('htmlFor="image-cropper-zoom"');
    expect(source).toContain('id="image-cropper-zoom"');
  });

  it("keeps cropper controls visibly focusable for keyboard users", () => {
    const focusRingCount = source.match(/focus-visible:ring-2/g)?.length ?? 0;

    expect(focusRingCount).toBeGreaterThanOrEqual(4);
  });
});
