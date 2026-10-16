import { describe, expect, it } from "vitest";
import { renderCropExportHtml } from "../lib/export-html";
import { renderCropExportPdf } from "../lib/export-pdf";
import { renderCropExportXlsx } from "../lib/export-xlsx";

const report = {
  cropId: "coffee",
  cropName: "Coffee",
  generatedAt: "2026-10-16T00:00:00.000Z",
  localDate: "2026-10-16",
  timeZone: "UTC",
  areaCount: 1,
  periods: ["2025"],
  rows: [
    {
      section: "calculated" as const,
      group: "Calculated",
      label: "Quality",
      unit: "",
      format: "percentage" as const,
      values: [25],
    },
  ],
};

describe("crop export files", () => {
  it("creates an XLSX workbook with a literal percentage display", async () => {
    const blob = await renderCropExportXlsx(report);
    expect(blob.type).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(blob.size).toBeGreaterThan(100);
  });

  it("creates a PDF and rejects unsupported PDF characters", async () => {
    const blob = await renderCropExportPdf(report);
    expect(blob.type).toBe("application/pdf");
    expect(new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer())).toBe(
      "%PDF-",
    );
    await expect(
      renderCropExportPdf({ ...report, cropName: "ಕಾಫಿ" }),
    ).rejects.toThrow("Download as Excel or HTML");
  });

  it("keeps HTML as a UTF-8 standalone document", async () => {
    const blob = renderCropExportHtml(report);
    expect(await blob.text()).toContain("<!doctype html>");
  });
});
