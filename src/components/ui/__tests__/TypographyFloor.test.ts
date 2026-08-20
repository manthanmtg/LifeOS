// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      return name === "__tests__" ? [] : sourceFiles(path);
    }
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("typography floor", () => {
  it("keeps meaningful UI text at 12px or larger", () => {
    const violations = sourceFiles(join(process.cwd(), "src"))
      .filter((path) =>
        /text-\[(?:8|9|10|11)px\]/.test(readFileSync(path, "utf8")),
      )
      .map((path) => path.replace(`${process.cwd()}/`, ""));

    expect(violations).toEqual([]);
  });
});
