// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("rain tracker accessibility contract", () => {
  it("keeps the dashboard widget to one detail section", () => {
    const source = readFileSync(resolve(__dirname, "../Widget.tsx"), "utf8");

    expect(source).toContain("WidgetHighlight");
    expect(source).not.toContain("WidgetMiniStats");
    expect(source).not.toContain("footer=");
  });
});
