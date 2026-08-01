import { getDb } from "@/lib/mongodb";
import { ApiError, ApiSuccess, ApiValidationError } from "@/lib/api-response";
import type { SystemConfig } from "@/lib/types";
import { requireNotificationAdmin } from "@/lib/notifications/api-auth";
import {
  encryptCredential,
  isNotificationEncryptionReady,
} from "@/lib/notifications/crypto";
import { getNotificationAdapter } from "@/lib/notifications/adapters/registry";
import { TelegramChannelCreateSchema } from "@/lib/notifications/schemas";
import {
  createNotificationChannel,
  toNotificationChannelDto,
} from "@/lib/notifications/repositories";

function providerLabelToUsername(label: string): string {
  return label.replace(/^@/, "");
}

export async function POST(request: Request) {
  if (!(await requireNotificationAdmin())) {
    return ApiError("Unauthorized", 401);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = TelegramChannelCreateSchema.safeParse(body);
    if (!parsed.success) return ApiValidationError(parsed.error.format());

    const db = await getDb();
    const systemConfig = await db
      .collection<SystemConfig>("system")
      .findOne({ _id: "global" });

    if (!isNotificationEncryptionReady(systemConfig)) {
      return ApiError(
        "NOTIFICATION_ENCRYPTION_KEY is required before connecting Telegram",
        503,
      );
    }

    const adapter = getNotificationAdapter(parsed.data.adapter_type);
    let testResult;
    try {
      testResult = await adapter.test({
        botToken: parsed.data.bot_token,
        chatId: parsed.data.chat_id,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Telegram connection test failed";
      return ApiError(message, 400);
    }

    const now = new Date().toISOString();
    const channel = await createNotificationChannel(db, {
      adapter_type: "telegram",
      name: parsed.data.name,
      enabled: true,
      config: {
        chat_id: parsed.data.chat_id,
        bot_username: providerLabelToUsername(
          testResult.provider_account_label,
        ),
        destination_label: testResult.destination_label,
      },
      credentials: encryptCredential(parsed.data.bot_token, systemConfig),
      last_tested_at: now,
      last_test_status: "success",
      created_at: now,
      updated_at: now,
    });

    return ApiSuccess(toNotificationChannelDto(channel), 201);
  } catch (error) {
    console.error("POST /api/notifications/channels failed:", error);
    return ApiError("Failed to create notification channel", 500);
  }
}
