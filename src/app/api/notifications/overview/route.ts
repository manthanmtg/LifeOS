import { getDb } from "@/lib/mongodb";
import { ApiError, ApiSuccess } from "@/lib/api-response";
import type { SystemConfig } from "@/lib/types";
import { requireNotificationAdmin } from "@/lib/notifications/api-auth";
import { isNotificationEncryptionReady } from "@/lib/notifications/crypto";
import { NotificationSettingsSchema } from "@/lib/notifications/schemas";
import {
  ensureNotificationIndexes,
  getNotificationDeliveryOverview,
  getRecentNotificationDeliveries,
  listNotificationChannels,
  toNotificationChannelDto,
} from "@/lib/notifications/repositories";
import { notificationSources } from "@/lib/notifications/sources/registry";

export async function GET() {
  if (!(await requireNotificationAdmin())) {
    return ApiError("Unauthorized", 401);
  }

  try {
    const db = await getDb();
    await ensureNotificationIndexes(db);

    const systemConfig = await db
      .collection<SystemConfig>("system")
      .findOne({ _id: "global" });
    const settings = NotificationSettingsSchema.parse(
      systemConfig?.notificationSettings ?? {},
    );
    const channels = await listNotificationChannels(db);
    const deliveryOverview = await getNotificationDeliveryOverview(db);
    const recentDeliveries = await getRecentNotificationDeliveries(db, 20);
    const sources = await Promise.all(
      notificationSources.map((source) =>
        source.getActivationSummary({
          db,
          now: new Date(),
          systemConfig:
            systemConfig ??
            ({
              _id: "global",
              site_title: "Life OS",
              active_theme: "one-dark",
              bio: "",
              moduleRegistry: {},
            } as SystemConfig),
          settings,
        }),
      ),
    );

    return ApiSuccess({
      settings,
      encryption_ready: isNotificationEncryptionReady(),
      channels: channels.map(toNotificationChannelDto),
      sources,
      ...deliveryOverview,
      recent_deliveries: recentDeliveries,
    });
  } catch (error) {
    console.error("GET /api/notifications/overview failed:", error);
    return ApiError("Failed to load notification overview", 500);
  }
}
