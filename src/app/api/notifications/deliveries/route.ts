import { ApiError, ApiSuccess } from "@/lib/api-response";
import { getDb } from "@/lib/mongodb";
import { requireNotificationAdmin } from "@/lib/notifications/api-auth";
import { getRecentNotificationDeliveries } from "@/lib/notifications/repositories";

export async function GET(request: Request) {
  if (!(await requireNotificationAdmin())) return ApiError("Unauthorized", 401);

  try {
    const { searchParams } = new URL(request.url);
    const requestedLimit = Number(searchParams.get("limit") ?? 20);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100)
      : 20;

    const deliveries = await getRecentNotificationDeliveries(
      await getDb(),
      limit,
    );
    return ApiSuccess(deliveries);
  } catch (error) {
    console.error("GET /api/notifications/deliveries failed:", error);
    return ApiError("Failed to load notification deliveries", 500);
  }
}
