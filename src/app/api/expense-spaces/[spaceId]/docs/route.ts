import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { ExpenseSpaceDocumentSchema } from "@/lib/schemas";
import type { ContentDocument } from "@/lib/types";
import type {
  ExpenseSpaceDocumentPayload,
  ExpenseSpacePayload,
} from "@/modules/expense-spaces/types";
import {
  ApiError,
  ApiNotFound,
  ApiSuccess,
  ApiValidationError,
} from "@/lib/api-response";
import { escapeRegex } from "@/lib/expense-spaces/validation";
import {
  logExpenseSpacesRouteError,
  requireExpenseSpacesAdmin,
} from "@/lib/expense-spaces/server";

type Params = { params: Promise<{ spaceId: string }> };
type SpaceContent = ContentDocument<
  ExpenseSpacePayload | ExpenseSpaceDocumentPayload
>;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const DOCUMENT_PROJECTION = {
  _id: 1,
  module_type: 1,
  is_public: 1,
  created_at: 1,
  updated_at: 1,
  "payload.space_key": 1,
  "payload.filename": 1,
  "payload.content_type": 1,
  "payload.size": 1,
} as const;

export async function GET(request: Request, { params }: Params) {
  try {
    if (!(await requireExpenseSpacesAdmin()))
      return ApiError("Unauthorized", 401);
    const { spaceId } = await params;
    if (!ObjectId.isValid(spaceId)) return ApiError("Invalid space ID", 400);
    const queryParams = new URL(request.url).searchParams;
    const page = Number(queryParams.get("page") ?? "1");
    const pageSize = Number(queryParams.get("page_size") ?? "25");
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    )
      return ApiError("Invalid pagination", 400);
    const db = await getDb();
    const content = db.collection<SpaceContent>("content");
    const parent = await content.findOne({
      _id: new ObjectId(spaceId),
      module_type: "expense_space",
    });
    if (!parent) return ApiNotFound("Expense space not found");
    const payload = parent.payload as ExpenseSpacePayload;
    const search = queryParams.get("search")?.trim();
    const query: Record<string, unknown> = {
      module_type: "expense_space_document",
      "payload.space_key": payload.space_key,
    };
    if (search)
      query["payload.filename"] = {
        $regex: escapeRegex(search),
        $options: "i",
      };
    const [documents, total] = await Promise.all([
      content
        .find(query, { projection: DOCUMENT_PROJECTION })
        .sort({ created_at: -1, _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      content.countDocuments(query),
    ]);
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    if (total && page > totalPages)
      return ApiError("page exceeds the available result pages", 400);
    const metadata = documents.map((document) => {
      const { data: _data, ...payload } =
        document.payload as ExpenseSpaceDocumentPayload;
      void _data;
      return { ...document, payload };
    });
    return ApiSuccess({
      documents: metadata,
      page,
      pageSize,
      total,
      totalPages,
    });
  } catch (error) {
    logExpenseSpacesRouteError(
      "/api/expense-spaces/[spaceId]/docs",
      "GET",
      error,
    );
    return ApiError("Failed to fetch documents", 500);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    if (!(await requireExpenseSpacesAdmin()))
      return ApiError("Unauthorized", 401);
    const { spaceId } = await params;
    if (!ObjectId.isValid(spaceId)) return ApiError("Invalid space ID", 400);
    const body = await request.json().catch(() => ({}));
    if (
      typeof body.data !== "string" ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(body.data)
    )
      return ApiError("Invalid document data", 400);
    const size = Buffer.byteLength(body.data, "base64");
    if (size > MAX_FILE_SIZE) return ApiError("File exceeds 5 MB limit", 400);
    const parsed = ExpenseSpaceDocumentSchema.omit({
      space_key: true,
    }).safeParse({
      ...body,
      size,
      content_type: body.content_type || "application/octet-stream",
    });
    if (!parsed.success) return ApiValidationError(parsed.error.format());
    const db = await getDb();
    const content = db.collection<SpaceContent>("content");
    const parent = await content.findOne({
      _id: new ObjectId(spaceId),
      module_type: "expense_space",
    });
    if (!parent) return ApiNotFound("Expense space not found");
    const space = parent.payload as ExpenseSpacePayload;
    if (space.status === "archived")
      return ApiError(
        "Restore this expense space before uploading documents",
        409,
      );
    const timestamp = new Date().toISOString();
    const document = {
      module_type: "expense_space_document" as const,
      is_public: false as const,
      created_at: timestamp,
      updated_at: timestamp,
      payload: { ...parsed.data, space_key: space.space_key },
    };
    const result = await content.insertOne(document as SpaceContent);
    const { data: _data, ...metadata } = document.payload;
    void _data;
    return ApiSuccess(
      { ...document, _id: result.insertedId.toString(), payload: metadata },
      201,
    );
  } catch (error) {
    logExpenseSpacesRouteError(
      "/api/expense-spaces/[spaceId]/docs",
      "POST",
      error,
    );
    return ApiError("Failed to upload document", 500);
  }
}
