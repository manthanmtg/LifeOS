import { ApiError, ApiSuccess } from "@/lib/api-response";
import { getDb } from "@/lib/mongodb";
import { requireNotificationAdmin } from "@/lib/notifications/api-auth";
import {
  generateNotificationEncryptionKey,
  getNotificationEncryptionStatus,
} from "@/lib/notifications/crypto";
import type { SystemConfig } from "@/lib/types";

export async function POST() {
  if (!(await requireNotificationAdmin())) return ApiError("Unauthorized", 401);

  try {
    const db = await getDb();
    const systemCollection = db.collection<SystemConfig>("system");
    const current = await systemCollection.findOne({ _id: "global" });
    const currentStatus = getNotificationEncryptionStatus(current);

    if (currentStatus.ready) {
      return ApiSuccess({
        encryption_ready: true,
        generated: false,
        source: currentStatus.source,
      });
    }

    const notificationEncryptionKey = generateNotificationEncryptionKey();
    await systemCollection.updateOne(
      { _id: "global" },
      { $set: { notificationEncryptionKey } },
      { upsert: true },
    );

    return ApiSuccess({
      encryption_ready: true,
      generated: true,
      source: "database",
    });
  } catch (error) {
    console.error("POST /api/notifications/encryption-key failed:", error);
    return ApiError("Failed to set up notification encryption", 500);
  }
}
