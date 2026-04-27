// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("snippets widget contract", () => {
  it("keeps the card to one detail section without a footer", () => {
    const source = readFileSync(resolve(__dirname, "../Widget.tsx"), "utf8");

    expect(source).toContain("WidgetStat");
    expect(source).toContain("WidgetHighlight");
    expect(source).not.toContain("footer=");
  });
});
