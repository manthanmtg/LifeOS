// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("crop history widget contract", () => {
  it("uses one primitive detail section without a footer", () => {
    const source = readFileSync(resolve(__dirname, "../Widget.tsx"), "utf8");

    expect(source).toContain("WidgetStat");
    expect(source).toContain("WidgetHighlight");
    expect(source).not.toContain("WidgetMiniStats");
    expect(source).not.toContain("WidgetList");
    expect(source).not.toContain("footer=");
  });

  it("uses the lightweight summary endpoint without internal interactions", () => {
    const source = readFileSync(resolve(__dirname, "../Widget.tsx"), "utf8");

    expect(source).toContain("/api/widgets/summary?module_type=crop_history");
    expect(source).not.toContain("/api/content?module_type=crop_history");
    expect(source).not.toMatch(/<(button|input|select|textarea|a)\b/);
    expect(source).not.toContain("window.location");
  });
});
