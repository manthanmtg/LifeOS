// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_FILES = [
  "../components/SnippetCard.tsx",
  "../components/SnippetForm.tsx",
];

describe("snippets theme contract", () => {
  it("uses theme-aware shadow tokens instead of hardcoded colors", () => {
    const sources = SOURCE_FILES.map((file) =>
      readFileSync(resolve(__dirname, file), "utf8"),
    ).join("\n");

    expect(sources).not.toMatch(/shadow-black|rgba\(/);
  });
});
