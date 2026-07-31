import { ApiError, ApiSuccess } from "@/lib/api-response";
import { requireNotificationAdmin } from "@/lib/notifications/api-auth";
import { runNotificationDispatch } from "@/lib/notifications/dispatcher";

export async function POST() {
  if (!(await requireNotificationAdmin())) return ApiError("Unauthorized", 401);

  try {
    const summary = await runNotificationDispatch({ batchSize: 10 });
    return ApiSuccess(summary);
  } catch (error) {
    console.error("POST /api/notifications/dispatch failed:", error);
    return ApiError("Failed to run notification dispatch", 500);
  }
}
