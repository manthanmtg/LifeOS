import type { CropExportFormat, CropExportReport } from "./export-data";

const TYPES: Record<CropExportFormat, string> = {
  xlsx: "Excel",
  pdf: "PDF",
  html: "HTML",
};

function slug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "crop"
  );
}

export async function createCropExportFile(
  report: CropExportReport,
  format: CropExportFormat,
) {
  const blob =
    format === "xlsx"
      ? await (await import("./export-xlsx")).renderCropExportXlsx(report)
      : format === "pdf"
        ? await (await import("./export-pdf")).renderCropExportPdf(report)
        : (await import("./export-html")).renderCropExportHtml(report);
  return {
    blob,
    filename: `crop-history-${slug(report.cropName)}-${report.localDate}.${format}`,
    label: TYPES[format],
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
