// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("ImagePreview", () => {
  const source = readFileSync(
    join(process.cwd(), "src/components/ui/ImagePreview.tsx"),
    "utf8",
  );

  it("marks the overlay as a modal dialog", () => {
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain("aria-label={");
  });

  it("gives icon-only controls stable accessible names", () => {
    expect(source).toContain('aria-label="Download image"');
    expect(source).toContain('aria-label="Close image preview"');
  });
});
