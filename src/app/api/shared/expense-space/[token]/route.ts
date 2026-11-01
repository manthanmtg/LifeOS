import {
  resolveShare,
  shareHeaders,
  unavailable,
} from "@/lib/expense-spaces/public-share";
import type {
  ExpenseSpaceEntryPayload,
  ExpenseSpaceDocumentPayload,
} from "@/modules/expense-spaces/types";
import { escapeRegex } from "@/lib/expense-spaces/validation";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ token: string }> };
export async function GET(request: Request, { params }: Params) {
  try {
    const { token } = await params;
    const resolved = await resolveShare(token);
    if (!resolved) return unavailable();
    const { db, space } = resolved;
    const query = new URL(request.url).searchParams;
    const page = Number(query.get("page") ?? "1");
    const docsPage = Number(query.get("docsPage") ?? "1");
    const search = (query.get("search") ?? "").trim().slice(0, 100);
    const category = (query.get("category") ?? "").slice(0, 100);
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 100000 ||
      !Number.isSafeInteger(docsPage) ||
      docsPage < 1 ||
      docsPage > 100000
    )
      return Response.json(
        { error: "Invalid page" },
        { status: 400, headers: shareHeaders },
      );
    const collection = db.collection("content");
    const entryFilter = {
      module_type: "expense_space_entry",
      "payload.space_key": space.space_key,
    };
    const scopedFilter = category
      ? { ...entryFilter, "payload.category_id": category }
      : entryFilter;
    const filtered = search
      ? {
          ...scopedFilter,
          $or: ["description", "paid_to", "reference", "notes", "tags"].map(
            (field) => ({
              [`payload.${field}`]: {
                $regex: escapeRegex(search),
                $options: "i",
              },
            }),
          ),
        }
      : scopedFilter;
    const docFilter = {
      module_type: "expense_space_document",
      "payload.space_key": space.space_key,
    };
    const [entries, total, documents, documentTotal, totals] =
      await Promise.all([
        collection
          .find(filtered, {
            projection: {
              "payload.amount": 1,
              "payload.currency": 1,
              "payload.description": 1,
              "payload.paid_to": 1,
              "payload.category_id": 1,
              "payload.subcategory_id": 1,
              "payload.date": 1,
              "payload.payment_method": 1,
              "payload.reference": 1,
              "payload.notes": 1,
              "payload.tags": 1,
              "payload.receipt_url": 1,
              "payload.receipts.filename": 1,
              "payload.receipt.filename": 1,
            },
          })
          .sort({ "payload.date": -1, _id: -1 })
          .skip((page - 1) * 25)
          .limit(25)
          .toArray(),
        collection.countDocuments(filtered),
        collection
          .find(docFilter, {
            projection: { "payload.filename": 1, "payload.size": 1 },
          })
          .sort({ created_at: -1, _id: -1 })
          .skip((docsPage - 1) * 25)
          .limit(25)
          .toArray(),
        collection.countDocuments(docFilter),
        collection
          .aggregate<{
            total: number;
            month: number;
            count: number;
          }>([
            { $match: entryFilter },
            {
              $group: {
                _id: null,
                total: { $sum: "$payload.amount" },
                count: { $sum: 1 },
                month: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          { $substrBytes: ["$payload.date", 0, 7] },
                          new Date().toISOString().slice(0, 7),
                        ],
                      },
                      "$payload.amount",
                      0,
                    ],
                  },
                },
              },
            },
          ])
          .toArray(),
      ]);
    return Response.json(
      {
        space: {
          name: space.name,
          description: space.description,
          currency: space.currency,
          number_format: space.number_format,
          budget: space.budget,
          categories: space.categories,
        },
        summary: totals[0] ?? { total: 0, month: 0, count: 0 },
        entries: entries.map((entry) => {
          const p = entry.payload as ExpenseSpaceEntryPayload;
          return {
            id: String(entry._id),
            amount: p.amount,
            currency: p.currency,
            description: p.description,
            paid_to: p.paid_to,
            category_id: p.category_id,
            subcategory_id: p.subcategory_id,
            date: p.date,
            payment_method: p.payment_method,
            reference: p.reference,
            notes: p.notes,
            tags: p.tags,
            receipt_url: p.receipt_url,
            receipts: [
              ...(p.receipts ?? []),
              ...(p.receipt ? [p.receipt] : []),
            ].map((receipt, index) => ({ filename: receipt.filename, index })),
          };
        }),
        total,
        page,
        documents: documents.map((doc) => ({
          id: String(doc._id),
          filename: (doc.payload as ExpenseSpaceDocumentPayload).filename,
          size: (doc.payload as ExpenseSpaceDocumentPayload).size,
        })),
        documentTotal,
        docsPage,
      },
      { headers: shareHeaders },
    );
  } catch (error) {
    console.error("[Expense Spaces] public share read failed", {
      error_type: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Unable to load this share" },
      { status: 500, headers: shareHeaders },
    );
  }
}
