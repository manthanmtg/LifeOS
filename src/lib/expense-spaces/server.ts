import "server-only";

import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

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
