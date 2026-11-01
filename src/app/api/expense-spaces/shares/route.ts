import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { ApiError, ApiSuccess } from "@/lib/api-response";
import {
  requireExpenseSpacesAdmin,
  logExpenseSpacesRouteError,
} from "@/lib/expense-spaces/server";
import {
  createShareToken,
  createShortShareToken,
  hashShareToken,
  newShareNonce,
} from "@/lib/expense-spaces/share-token";
import type { ExpenseSpacePayload } from "@/modules/expense-spaces/types";

type Share = {
  _id: ObjectId;
  nonce: string;
  tokenHash: string;
  tokenVersion?: number;
  paused: boolean;
  createdAt: string;
};

async function authorized() {
  return await requireExpenseSpacesAdmin();
}
function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is required");
  return value;
}
export async function GET() {
  try {
    if (!(await authorized())) return ApiError("Unauthorized", 401);
    const db = await getDb();
    const shares = await db
      .collection<Share>("expense_space_shares")
      .find({})
      .toArray();
    const spaces = await db
      .collection("content")
      .find(
        {
          module_type: "expense_space",
          _id: { $in: shares.map((s) => s._id) },
        },
        { projection: { "payload.name": 1 } },
      )
      .toArray();
    const names = new Map(
      spaces.map((s) => [
        String(s._id),
        (s.payload as ExpenseSpacePayload).name,
      ]),
    );
    const response = ApiSuccess(
      shares
        .filter((s) => names.has(String(s._id)))
        .map((s) => {
          const token =
            s.tokenVersion === 2
              ? createShortShareToken(s.nonce, secret())
              : createShareToken(s.nonce, secret());
          return {
            spaceId: String(s._id),
            name: names.get(String(s._id)),
            paused: s.paused,
            createdAt: s.createdAt,
            token: hashShareToken(token) === s.tokenHash ? token : null,
          };
        }),
    );
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    logExpenseSpacesRouteError("shares", "GET", error);
    return ApiError("Failed to load shares", 500);
  }
}
export async function POST(request: Request) {
  try {
    if (!(await authorized())) return ApiError("Unauthorized", 401);
    const body = await request.json().catch(() => null);
    if (
      !body ||
      typeof body.spaceId !== "string" ||
      !ObjectId.isValid(body.spaceId)
    )
      return ApiError("Invalid space ID", 400);
    const id = new ObjectId(body.spaceId);
    const db = await getDb();
    if (
      !(await db
        .collection("content")
        .findOne(
          { _id: id, module_type: "expense_space" },
          { projection: { _id: 1 } },
        ))
    )
      return ApiError("Space not found", 404);
    const shares = db.collection<Share>("expense_space_shares");
    // The unique index prevents two spaces from ever resolving to one code,
    // including when links are created concurrently on different servers.
    await shares.createIndex({ tokenHash: 1 }, { unique: true });
    for (let attempt = 0; attempt < 5; attempt++) {
      const nonce = newShareNonce();
      const token = createShortShareToken(nonce, secret());
      try {
        const result = await shares.updateOne(
          { _id: id },
          {
            $setOnInsert: {
              nonce,
              tokenHash: hashShareToken(token),
              tokenVersion: 2,
              paused: false,
              createdAt: new Date().toISOString(),
            },
          },
          { upsert: true },
        );
        if (!result.upsertedCount)
          return ApiError("A share already exists for this space", 409);
        return ApiSuccess({ token }, 201);
      } catch (error) {
        if (
          typeof error !== "object" ||
          error === null ||
          !("code" in error) ||
          error.code !== 11000
        )
          throw error;
        if (await shares.findOne({ _id: id }))
          return ApiError("A share already exists for this space", 409);
      }
    }
    return ApiError("Could not generate a unique link. Please try again.", 503);
  } catch (error) {
    logExpenseSpacesRouteError("shares", "POST", error);
    return ApiError("Failed to create share", 500);
  }
}
export async function PATCH(request: Request) {
  try {
    if (!(await authorized())) return ApiError("Unauthorized", 401);
    const body = await request.json().catch(() => null);
    if (
      !body ||
      typeof body.spaceId !== "string" ||
      !ObjectId.isValid(body.spaceId) ||
      typeof body.paused !== "boolean"
    )
      return ApiError("Invalid share update", 400);
    const db = await getDb();
    const result = await db
      .collection<Share>("expense_space_shares")
      .updateOne(
        { _id: new ObjectId(body.spaceId) },
        { $set: { paused: body.paused } },
      );
    return result.matchedCount
      ? ApiSuccess({ paused: body.paused })
      : ApiError("Share not found", 404);
  } catch (error) {
    logExpenseSpacesRouteError("shares", "PATCH", error);
    return ApiError("Failed to update share", 500);
  }
}
export async function DELETE(request: Request) {
  try {
    if (!(await authorized())) return ApiError("Unauthorized", 401);
    const body = await request.json().catch(() => null);
    if (
      !body ||
      typeof body.spaceId !== "string" ||
      !ObjectId.isValid(body.spaceId)
    )
      return ApiError("Invalid space ID", 400);
    const db = await getDb();
    const result = await db
      .collection<Share>("expense_space_shares")
      .deleteOne({ _id: new ObjectId(body.spaceId) });
    return result.deletedCount
      ? ApiSuccess({ deleted: true })
      : ApiError("Share not found", 404);
  } catch (error) {
    logExpenseSpacesRouteError("shares", "DELETE", error);
    return ApiError("Failed to delete share", 500);
  }
}
