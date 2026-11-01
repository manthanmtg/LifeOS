import { ObjectId } from "mongodb";
import {
  resolveShare,
  shareHeaders,
  unavailable,
} from "@/lib/expense-spaces/public-share";
import type {
  ExpenseSpaceDocumentPayload,
  ExpenseSpaceEntryPayload,
} from "@/modules/expense-spaces/types";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ token: string; kind: string; id: string }> };
export async function GET(request: Request, { params }: Params) {
  try {
    const { token, kind, id } = await params;
    if (!ObjectId.isValid(id) || (kind !== "document" && kind !== "receipt"))
      return unavailable();
    const resolved = await resolveShare(token);
    if (!resolved) return unavailable();
    const doc = await resolved.db.collection("content").findOne({
      _id: new ObjectId(id),
      module_type:
        kind === "document" ? "expense_space_document" : "expense_space_entry",
      "payload.space_key": resolved.space.space_key,
    });
    if (!doc) return unavailable();
    let file:
      | { filename: string; data?: string; content_type?: string }
      | undefined;
    if (kind === "document") file = doc.payload as ExpenseSpaceDocumentPayload;
    else {
      const index = Number(
        new URL(request.url).searchParams.get("index") ?? "0",
      );
      if (!Number.isSafeInteger(index) || index < 0) return unavailable();
      const payload = doc.payload as ExpenseSpaceEntryPayload;
      file = [
        ...(payload.receipts ?? []),
        ...(payload.receipt ? [payload.receipt] : []),
      ][index];
    }
    if (!file || typeof file.data !== "string") return unavailable();
    const bytes = Buffer.from(file.data, "base64");
    const inlineTypes = new Set([
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
    ]);
    const inline = inlineTypes.has(file.content_type ?? "");
    return new Response(bytes, {
      headers: {
        ...shareHeaders,
        "Content-Type": inline
          ? file.content_type!
          : "application/octet-stream",
        "Content-Length": String(bytes.length),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    console.error("[Expense Spaces] public attachment read failed", {
      error_type: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Unable to load attachment" },
      { status: 500, headers: shareHeaders },
    );
  }
}
