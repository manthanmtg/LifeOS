// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("maintenance widget loading contract", () => {
  it("clears loading from a guarded finally block", () => {
    const source = readFileSync(resolve(__dirname, "../Widget.tsx"), "utf8");

    expect(source).toContain(".finally(() => {");
    expect(source).toContain("if (!ac.signal.aborted) setLoading(false);");
  });
});
