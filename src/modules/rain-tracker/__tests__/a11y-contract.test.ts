// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("rain tracker accessibility contract", () => {
  it("renders area rows as keyboard-selectable buttons", () => {
    const source = readFileSync(
      resolve(__dirname, "../components/AreaSidebar.tsx"),
      "utf8",
    );

    expect(source).toContain("<motion.button");
    expect(source).toContain('type="button"');
  });
});
