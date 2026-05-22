import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

describe("EMITrackerWidget", () => {
  it("uses the same module settings key as the admin view", () => {
    const source = readFileSync(resolve(__dirname, "../Widget.tsx"), "utf8");

    expect(source).toContain('useModuleSettings<EmiSettings>("emi-tracker"');
    expect(source).not.toContain("emiTrackerSettings");
  });
});
