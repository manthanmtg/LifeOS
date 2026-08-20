import "server-only";

import type { Collection, Document, Filter } from "mongodb";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function aggregateDistinctValues<TSchema extends Document>(
  collection: Collection<TSchema>,
  field: string,
  filter: Filter<TSchema>,
  options: { unwind?: boolean } = {},
): Promise<unknown[]> {
  const fieldPath = `$${field}`;
  const [result] = await collection
    .aggregate<{
      values: unknown[];
    }>([
      { $match: filter },
      ...(options.unwind ? [{ $unwind: fieldPath }] : []),
      { $group: { _id: null, values: { $addToSet: fieldPath } } },
    ])
    .toArray();

  return Array.isArray(result?.values) ? result.values : [];
}

export async function requireExpenseSpacesAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("lifeos_token")?.value;
  return token ? Boolean(await verifyToken(token)) : false;
}

export function logExpenseSpacesRouteError(
  route: string,
  operation: string,
  error: unknown,
) {
  console.error(`[Expense Spaces] ${route} ${operation} failed`, {
    error_type: error instanceof Error ? error.name : "UnknownError",
  });
}
