import { ApiError, ApiSuccess } from "@/lib/api-response";
import { getDb } from "@/lib/mongodb";
import { requireNotificationAdmin } from "@/lib/notifications/api-auth";
import { getNotificationAdapter } from "@/lib/notifications/adapters/registry";
import { decryptCredential } from "@/lib/notifications/crypto";
import {
  getNotificationChannelById,
  toNotificationChannelDto,
  updateNotificationChannel,
} from "@/lib/notifications/repositories";

function providerLabelToUsername(label: string): string {
  return label.replace(/^@/, "");
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireNotificationAdmin())) return ApiError("Unauthorized", 401);

  const db = await getDb();
  const id = (await params).id;
  const channel = await getNotificationChannelById(db, id);
  if (!channel) return ApiError("Notification channel not found", 404);

  const now = new Date().toISOString();
  try {
    const testResult = await getNotificationAdapter(channel.adapter_type).test({
      botToken: decryptCredential(channel.credentials),
      chatId: channel.config.chat_id,
    });
    const updated = await updateNotificationChannel(db, id, {
      config: {
        ...channel.config,
        bot_username: providerLabelToUsername(
          testResult.provider_account_label,
        ),
        destination_label: testResult.destination_label,
      },
      last_tested_at: now,
      last_test_status: "success",
      last_error: undefined,
      updated_at: now,
    });

    return ApiSuccess(updated ? toNotificationChannelDto(updated) : null);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Telegram connection test failed";
    const updated = await updateNotificationChannel(db, id, {
      last_tested_at: now,
      last_test_status: "failed",
      last_error: message,
      updated_at: now,
    });

    return ApiError(
      message,
      400,
      updated ? toNotificationChannelDto(updated) : undefined,
    );
  }
}
