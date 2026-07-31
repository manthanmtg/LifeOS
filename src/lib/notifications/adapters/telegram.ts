import type {
  AdapterSendResult,
  AdapterTestResult,
  NotificationAdapter,
  NotificationMessage,
  TelegramRuntimeConfig,
} from "../contracts";
import { NotificationError, sanitizeErrorMessage } from "../errors";
import { getChatIdHint } from "../repositories";

const TELEGRAM_API_BASE = "https://api.telegram.org";
const TELEGRAM_TIMEOUT_MS = 10_000;

interface TelegramApiResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
  error_code?: number;
  parameters?: {
    retry_after?: number;
  };
}

function buildMessageText(message: NotificationMessage): string {
  return [message.title, message.body, message.url]
    .filter(Boolean)
    .join("\n\n");
}

function classifyTelegramError(
  response: TelegramApiResponse,
): NotificationError {
  const status = response.error_code ?? 0;
  const description = sanitizeErrorMessage(
    response.description || "Telegram request failed",
  );

  if (status === 429) {
    return new NotificationError("telegram_rate_limited", description, {
      retryable: true,
      retryAfterSeconds: response.parameters?.retry_after,
    });
  }

  if (status >= 500) {
    return new NotificationError("telegram_server_error", description, {
      retryable: true,
    });
  }

  if (status === 401) {
    return new NotificationError("telegram_invalid_token", description);
  }

  if (
    status === 400 ||
    status === 403 ||
    /chat|blocked|forbidden/i.test(description)
  ) {
    return new NotificationError("telegram_chat_inaccessible", description);
  }

  if (status >= 400) {
    return new NotificationError("telegram_permanent_error", description);
  }

  return new NotificationError("telegram_unknown_error", description, {
    retryable: true,
  });
}

async function fetchTelegram(
  token: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<TelegramApiResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : "{}",
      signal: controller.signal,
    });
    const json = (await response
      .json()
      .catch(() => null)) as TelegramApiResponse | null;

    if (!json || typeof json.ok !== "boolean") {
      throw new NotificationError(
        "telegram_malformed_response",
        "Telegram returned a malformed response",
        { retryable: true },
      );
    }

    if (!json.ok) {
      throw classifyTelegramError(json);
    }

    return json;
  } catch (error) {
    if (error instanceof NotificationError) throw error;
    const isAbort =
      error instanceof Error &&
      (error.name === "AbortError" || /abort/i.test(error.message));
    throw new NotificationError(
      isAbort ? "telegram_timeout" : "telegram_network_error",
      isAbort ? "Telegram request timed out" : "Telegram request failed",
      { retryable: true },
    );
  } finally {
    clearTimeout(timeout);
  }
}

function readBotUsername(result: unknown): string {
  if (
    result &&
    typeof result === "object" &&
    "username" in result &&
    typeof result.username === "string"
  ) {
    return result.username;
  }

  throw new NotificationError(
    "telegram_malformed_response",
    "Telegram returned a malformed bot profile",
    { retryable: true },
  );
}

function readMessageId(result: unknown): string | undefined {
  if (
    result &&
    typeof result === "object" &&
    "message_id" in result &&
    (typeof result.message_id === "string" ||
      typeof result.message_id === "number")
  ) {
    return String(result.message_id);
  }

  throw new NotificationError(
    "telegram_malformed_response",
    "Telegram returned a malformed message response",
    { retryable: true },
  );
}

export const telegramAdapter: NotificationAdapter<TelegramRuntimeConfig> = {
  type: "telegram",
  async test(config: TelegramRuntimeConfig): Promise<AdapterTestResult> {
    const profile = await fetchTelegram(config.botToken, "getMe");
    const username = readBotUsername(profile.result);

    await fetchTelegram(config.botToken, "sendMessage", {
      chat_id: config.chatId,
      text: "LifeOS notification test message.",
      disable_web_page_preview: true,
    });

    return {
      provider_account_label: `@${username}`,
      destination_label: `Chat ${getChatIdHint(config.chatId)}`,
    };
  },
  async send(
    config: TelegramRuntimeConfig,
    message: NotificationMessage,
  ): Promise<AdapterSendResult> {
    const response = await fetchTelegram(config.botToken, "sendMessage", {
      chat_id: config.chatId,
      text: buildMessageText(message),
      disable_web_page_preview: false,
    });

    return { external_message_id: readMessageId(response.result) };
  },
};
