import { describe, expect, it } from "vitest";
import { renderCropExportHtml } from "../lib/export-html";

describe("renderCropExportHtml", () => {
  it("escapes record content and creates a standalone HTML document", async () => {
    const html = await renderCropExportHtml({
      cropId: "coffee",
      cropName: "Coffee <script>",
      generatedAt: "2026-10-16T00:00:00.000Z",
      localDate: "2026-10-16",
      timeZone: "UTC",
      areaCount: 1,
      periods: ["2025"],
      rows: [
        {
          section: "notes",
          group: "Notes",
          label: "Notes",
          unit: "",
          format: "text",
          values: ["<img src=x onerror=alert(1)>"],
        },
      ],
    });
    const text = await html.text();
    expect(html.type).toBe("text/html;charset=utf-8");
    expect(text).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(text).not.toContain("<img src=x");
    expect(text).toContain("Content-Security-Policy");
  });
});
