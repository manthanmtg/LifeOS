// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { GET } from "../route";

vi.mock("fs", () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

const readFile = vi.mocked(fs.readFile);

function createContext(slug: string) {
  return {
    params: Promise.resolve({ slug }),
  };
}

describe("GET /api/module-info/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns module info markdown content", async () => {
    readFile.mockResolvedValue("# Expenses\n\nTrack spending." as never);

    const response = await GET({} as never, createContext("expenses"));

    expect(response.status).toBe(200);
    expect(readFile).toHaveBeenCalledWith(
      path.join(process.cwd(), "src", "modules", "expenses", "info.md"),
      "utf-8",
    );
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { content: "# Expenses\n\nTrack spending." },
    });
  });

  it("strips unsafe characters from the slug before reading from disk", async () => {
    readFile.mockResolvedValue("# Shopping List" as never);

    const response = await GET(
      {} as never,
      createContext("../shopping-list<script>"),
    );

    expect(response.status).toBe(200);
    expect(readFile).toHaveBeenCalledWith(
      path.join(
        process.cwd(),
        "src",
        "modules",
        "shopping-listscript",
        "info.md",
      ),
      "utf-8",
    );
  });

  it("allows lowercase letters, numbers, and hyphens in slugs", async () => {
    readFile.mockResolvedValue("# AI Usage" as never);

    await GET({} as never, createContext("ai-usage-2026"));

    expect(readFile).toHaveBeenCalledWith(
      path.join(process.cwd(), "src", "modules", "ai-usage-2026", "info.md"),
      "utf-8",
    );
  });

  it("returns a not found response when the info file is missing", async () => {
    readFile.mockRejectedValue(new Error("missing"));

    const response = await GET({} as never, createContext("unknown-module"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Module info not found",
    });
  });

  it("returns a not found response when route params reject", async () => {
    const response = await GET({} as never, {
      params: Promise.reject(new Error("bad params")),
    });

    expect(response.status).toBe(404);
    expect(readFile).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Module info not found",
    });
  });
});
