import { describe, expect, it } from "vitest";
import { moduleRegistry } from "../registry";
import { SchemaRegistry } from "../lib/schemas";

const entries = Object.entries(moduleRegistry);

describe("moduleRegistry", () => {
  it("contains registered modules", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it("uses URL-safe module slugs", () => {
    for (const [slug] of entries) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("defines complete display metadata for every module", () => {
    for (const [, config] of entries) {
      expect(config.name.trim()).not.toBe("");
      expect(config.icon.trim()).not.toBe("");
      expect(config.description.trim()).not.toBe("");
      expect(config.tags.length).toBeGreaterThan(0);
      expect(config.tags.every((tag) => tag.trim().length > 0)).toBe(true);
    }
  });

  it("uses unique content types across modules", () => {
    const contentTypes = entries.map(([, config]) => config.contentType);
    expect(new Set(contentTypes).size).toBe(contentTypes.length);
  });

  it("maps every module content type to a Zod schema", () => {
    for (const [, config] of entries) {
      expect(SchemaRegistry[config.contentType]).toBeDefined();
      expect(typeof SchemaRegistry[config.contentType]?.safeParse).toBe(
        "function",
      );
    }
  });

  it("keeps public defaults limited to modules with public views", () => {
    const publicModules = entries
      .filter(([, config]) => config.defaultPublic)
      .map(([slug]) => slug)
      .sort();

    expect(publicModules).toEqual(["blog", "portfolio"]);
  });

  it("keeps the registry order stable for the first dashboard modules", () => {
    expect(Object.keys(moduleRegistry).slice(0, 4)).toEqual([
      "portfolio",
      "blog",
      "expenses",
      "recurring-expenses",
    ]);
  });
});
