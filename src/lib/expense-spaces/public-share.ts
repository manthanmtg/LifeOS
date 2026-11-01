import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { hashShareToken, isShareToken } from "./share-token";
import type { ExpenseSpacePayload } from "@/modules/expense-spaces/types";

export const shareHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
};
export function unavailable() {
  return Response.json(
    { error: "This share is unavailable" },
    { status: 404, headers: shareHeaders },
  );
}
export async function resolveShare(token: string) {
  if (!isShareToken(token)) return null;
  const db = await getDb();
  const share = await db
    .collection<{
      _id: ObjectId;
      tokenHash: string;
      paused: boolean;
    }>("expense_space_shares")
    .findOne({ tokenHash: hashShareToken(token), paused: false });
  if (!share) return null;
  const parent = await db
    .collection("content")
    .findOne({ _id: share._id, module_type: "expense_space" });
  if (!parent) return null;
  return { db, space: parent.payload as ExpenseSpacePayload };
}
