import { ApiError, ApiSuccess, ApiValidationError } from "@/lib/api-response";
import { getDb } from "@/lib/mongodb";
import { requireNotificationAdmin } from "@/lib/notifications/api-auth";
import { getNotificationAdapter } from "@/lib/notifications/adapters/registry";
import {
  decryptCredential,
  encryptCredential,
  isNotificationEncryptionReady,
} from "@/lib/notifications/crypto";
import { TelegramChannelUpdateSchema } from "@/lib/notifications/schemas";
import {
  deleteNotificationChannel,
  getNotificationChannelById,
  toNotificationChannelDto,
  updateNotificationChannel,
} from "@/lib/notifications/repositories";

function providerLabelToUsername(label: string): string {
  return label.replace(/^@/, "");
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireNotificationAdmin())) return ApiError("Unauthorized", 401);

  try {
    const id = (await params).id;
    const body = await request.json().catch(() => ({}));
    const parsed = TelegramChannelUpdateSchema.safeParse(body);
    if (!parsed.success) return ApiValidationError(parsed.error.format());

    const db = await getDb();
    const existing = await getNotificationChannelById(db, id);
    if (!existing) return ApiError("Notification channel not found", 404);

    const now = new Date().toISOString();
    const updates: Parameters<typeof updateNotificationChannel>[2] = {
      updated_at: now,
    };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.enabled !== undefined)
      updates.enabled = parsed.data.enabled;

    if (parsed.data.chat_id || parsed.data.bot_token) {
      if (!isNotificationEncryptionReady()) {
        return ApiError(
          "NOTIFICATION_ENCRYPTION_KEY is required before updating Telegram",
          503,
        );
      }

      const botToken =
        parsed.data.bot_token ?? decryptCredential(existing.credentials);
      const chatId = parsed.data.chat_id ?? existing.config.chat_id;
      const testResult = await getNotificationAdapter("telegram").test({
        botToken,
        chatId,
      });
      updates.config = {
        chat_id: chatId,
        bot_username: providerLabelToUsername(
          testResult.provider_account_label,
        ),
        destination_label: testResult.destination_label,
      };
      updates.last_tested_at = now;
      updates.last_test_status = "success";
      updates.last_error = undefined;
      if (parsed.data.bot_token) {
        updates.credentials = encryptCredential(parsed.data.bot_token);
      }
    }

    const updated = await updateNotificationChannel(db, id, updates);
    if (!updated) return ApiError("Notification channel not found", 404);
    return ApiSuccess(toNotificationChannelDto(updated));
  } catch (error) {
    console.error("PUT /api/notifications/channels/[id] failed:", error);
    return ApiError("Failed to update notification channel", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireNotificationAdmin())) return ApiError("Unauthorized", 401);

  try {
    const deleted = await deleteNotificationChannel(
      await getDb(),
      (await params).id,
    );
    if (!deleted) return ApiError("Notification channel not found", 404);
    return ApiSuccess({ success: true });
  } catch (error) {
    console.error("DELETE /api/notifications/channels/[id] failed:", error);
    return ApiError("Failed to delete notification channel", 500);
  }
}
