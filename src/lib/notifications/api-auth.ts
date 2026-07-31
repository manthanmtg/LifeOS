import { cookies } from "next/headers";

import { verifyToken } from "@/lib/auth";

export async function requireNotificationAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("lifeos_token")?.value;
  if (!token) return false;
  return Boolean(await verifyToken(token));
}
