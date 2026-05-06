import { getDb } from "@/lib/mongodb";
import { BillFolderSchema } from "@/lib/schemas";
import { ContentDocument } from "@/lib/types";
import { ApiSuccess, ApiError, ApiValidationError } from "@/lib/api-response";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  try {
    const db = await getDb();
    const results = await db
      .collection<ContentDocument>("content")
      .find({ module_type: "bill_folder" })
      .sort({ created_at: 1 })
      .toArray();
    return ApiSuccess(results);
  } catch (error) {
    console.error("GET /api/bills/folders failed:", error);
    return ApiError("Failed to fetch folders", 500);
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("lifeos_token")?.value;
    const isAdmin = token ? !!(await verifyToken(token)) : false;
    if (!isAdmin) return ApiError("Unauthorized", 401);

    const body = await request.json().catch(() => ({}));
    const { payload } = body;

    const parsed = BillFolderSchema.safeParse(payload);
    if (!parsed.success) {
      return ApiValidationError(parsed.error.format());
    }

    const doc: Omit<ContentDocument, "_id"> = {
      module_type: "bill_folder",
      is_public: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      payload: parsed.data,
    };

    const db = await getDb();
    const result = await db
      .collection<ContentDocument>("content")
      .insertOne(doc as ContentDocument);

    return ApiSuccess(
      { ...doc, _id: result.insertedId, insertedId: result.insertedId },
      201,
    );
  } catch (error) {
    console.error("POST /api/bills/folders failed:", error);
    return ApiError("Failed to create folder", 500);
  }
}
