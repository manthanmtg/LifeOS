import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { ApiError, ApiNotFound } from "@/lib/api-response";
import { buildExpenseSpaceReport, createExpenseSpaceReportFilename } from "@/lib/expense-spaces/report";
import { renderExpenseSpaceReportPdf } from "@/lib/expense-spaces/report-pdf";
import { logExpenseSpacesRouteError, requireExpenseSpacesAdmin } from "@/lib/expense-spaces/server";
import type { ContentDocument } from "@/lib/types";
import type { ExpenseSpaceEntryPayload, ExpenseSpacePayload } from "@/modules/expense-spaces/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ spaceId: string }> };
type ExpenseSpaceContent = ContentDocument<ExpenseSpacePayload | ExpenseSpaceEntryPayload>;

export async function GET(_request: Request, { params }: Params) {
  try {
    if (!(await requireExpenseSpacesAdmin())) return ApiError("Unauthorized", 401);
    const { spaceId } = await params;
    if (!ObjectId.isValid(spaceId)) return ApiError("Invalid space ID", 400);
    const content = (await getDb()).collection<ExpenseSpaceContent>("content");
    const parent = await content.findOne({ _id: new ObjectId(spaceId), module_type: "expense_space" });
    if (!parent) return ApiNotFound("Expense space not found");
    const space = parent.payload as ExpenseSpacePayload;
    const entries = await content
      .find({ module_type: "expense_space_entry", "payload.space_key": space.space_key })
      .sort({ "payload.date": -1, _id: -1 })
      .toArray();
    const report = buildExpenseSpaceReport({
      space: { _id: parent._id.toString(), payload: space },
      entries: entries.map((entry) => ({ _id: entry._id.toString(), payload: entry.payload as ExpenseSpaceEntryPayload })),
      generatedAt: new Date(),
    });
    const pdf = renderExpenseSpaceReportPdf(report);
    const filename = createExpenseSpaceReportFilename(space.name, report.generatedAt);
    return new Response(pdf.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.byteLength),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    logExpenseSpacesRouteError("/api/expense-spaces/[spaceId]/report", "GET", error);
    return ApiError("Failed to create expense space report", 500);
  }
}
