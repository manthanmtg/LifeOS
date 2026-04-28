import { getDb } from "@/lib/mongodb";
import { BillSchema } from "@/lib/schemas";
import { ContentDocument } from "@/lib/types";
import { ApiSuccess, ApiError, ApiValidationError } from "@/lib/api-response";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET(request?: Request) {
  try {
    const db = await getDb();
    const contentColl = db.collection<ContentDocument>("content");
    const compact =
      request &&
      new URL(request.url).searchParams.get("compact")?.toLowerCase() ===
        "true";
    const cursor = contentColl
      .find({ module_type: "bill" })
      .sort({ created_at: -1 });
    const results = await (
      compact ? cursor.project({ "payload.attachments.data": 0 }) : cursor
    ).toArray();
    return ApiSuccess(results);
  } catch (error) {
    console.error("GET /api/bills failed:", error);
    return ApiError("Failed to fetch bills", 500);
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("lifeos_token")?.value;
    const isAdmin = token ? !!(await verifyToken(token)) : false;
    if (!isAdmin) return ApiError("Unauthorized", 401);

    const body = await request.json();
    const { payload } = body;

    const parsed = BillSchema.safeParse(payload);
    if (!parsed.success) {
      return ApiValidationError(parsed.error.format());
    }

    const doc: Omit<ContentDocument, "_id"> = {
      module_type: "bill",
      is_public: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      payload: parsed.data,
    };

    const db = await getDb();
    const contentColl = db.collection<ContentDocument>("content");
    const result = await contentColl.insertOne(doc as ContentDocument);

    return ApiSuccess(
      { ...doc, _id: result.insertedId, insertedId: result.insertedId },
      201,
    );
  } catch (error) {
    console.error("POST /api/bills failed:", error);
    return ApiError("Failed to create bill", 500);
  }
}
