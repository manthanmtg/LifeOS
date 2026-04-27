// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("ai-usage style contract", () => {
  it("uses semantic theme classes instead of hardcoded Tailwind hues", () => {
    const adminViewSource = readFileSync(
      resolve(__dirname, "../AdminView.tsx"),
      "utf8",
    );

    expect(adminViewSource).not.toMatch(
      /\b(?:red|green|emerald|amber|yellow|rose|orange|purple|cyan|sky|indigo|teal|pink|violet|fuchsia)-\d{2,3}\b/,
    );
  });
});
