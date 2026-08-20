// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("responsive admin shell", () => {
  it("uses the dynamic viewport and safe-area-aware mobile content offset", () => {
    const layout = source("src/app/admin/layout.tsx");

    expect(layout).toContain("h-dvh");
    expect(layout).toContain("env(safe-area-inset-top)");
    expect(layout).not.toContain("h-screen");
  });

  it("protects the fixed mobile header and drawer from display cutouts", () => {
    const header = source("src/components/shell/AdminHeader.tsx");
    const sidebar = source("src/components/shell/AdminSidebar.tsx");

    expect(header).toContain("env(safe-area-inset-top)");
    expect(sidebar).toContain("h-dvh");
    expect(sidebar).toContain("env(safe-area-inset-bottom)");
  });

  it("scopes zen styling to explicit shell chrome", () => {
    const globals = source("src/app/globals.css");

    expect(globals).toContain(".zen-mode [data-zen-chrome]");
    expect(globals).not.toContain(".zen-mode nav");
  });
});
