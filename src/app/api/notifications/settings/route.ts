import { getDb } from "@/lib/mongodb";
import { ApiError, ApiSuccess, ApiValidationError } from "@/lib/api-response";
import type { SystemConfig } from "@/lib/types";
import { requireNotificationAdmin } from "@/lib/notifications/api-auth";
import {
  NotificationSettingsSchema,
  NotificationSettingsUpdateSchema,
} from "@/lib/notifications/schemas";

export async function PUT(request: Request) {
  if (!(await requireNotificationAdmin())) {
    return ApiError("Unauthorized", 401);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = NotificationSettingsUpdateSchema.safeParse(body);
    if (!parsed.success) return ApiValidationError(parsed.error.format());

    const db = await getDb();
    const systemCollection = db.collection<SystemConfig>("system");
    const current = await systemCollection.findOne({ _id: "global" });
    const existing = NotificationSettingsSchema.parse(
      current?.notificationSettings ?? {},
    );
    const settings = NotificationSettingsSchema.parse({
      ...existing,
      ...parsed.data,
    });

    await systemCollection.updateOne(
      { _id: "global" },
      { $set: { notificationSettings: settings } },
      { upsert: true },
    );

    return ApiSuccess(settings);
  } catch (error) {
    console.error("PUT /api/notifications/settings failed:", error);
    return ApiError("Failed to save notification settings", 500);
  }
}
