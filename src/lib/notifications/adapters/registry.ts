import type {
  NotificationAdapter,
  NotificationAdapterType,
  TelegramRuntimeConfig,
} from "../contracts";
import { NotificationError } from "../errors";
import { telegramAdapter } from "./telegram";

const adapters: Record<
  NotificationAdapterType,
  NotificationAdapter<TelegramRuntimeConfig>
> = {
  telegram: telegramAdapter,
};

export function getNotificationAdapter(type: NotificationAdapterType) {
  const adapter = adapters[type];
  if (!adapter) {
    throw new NotificationError(
      "notification_adapter_unsupported",
      `Unsupported notification adapter: ${type}`,
    );
  }
  return adapter;
}
