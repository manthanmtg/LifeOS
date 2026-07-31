import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { telegramAdapter } from "../telegram";

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);

describe("telegramAdapter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("tests a Telegram connection by validating the bot and sending a message", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        await jsonResponse({
          ok: true,
          result: { id: 123, is_bot: true, username: "lifeos_bot" },
        }),
      )
      .mockResolvedValueOnce(
        await jsonResponse({
          ok: true,
          result: { message_id: 10 },
        }),
      );

    await expect(
      telegramAdapter.test({
        botToken: "123456:secret",
        chatId: "-1001234567890",
      }),
    ).resolves.toEqual({
      provider_account_label: "@lifeos_bot",
      destination_label: "Chat ****7890",
    });
  });

  it("sends plain text and returns Telegram's message id", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      await jsonResponse({
        ok: true,
        result: { message_id: 42 },
      }),
    );

    await expect(
      telegramAdapter.send(
        { botToken: "123456:secret", chatId: "-1001234567890" },
        { title: "Netflix renews tomorrow", body: "INR 649" },
      ),
    ).resolves.toEqual({ external_message_id: "42" });

    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({
      chat_id: "-1001234567890",
      text: "Netflix renews tomorrow\n\nINR 649",
      disable_web_page_preview: false,
    });
  });

  it("classifies Telegram rate limits as retryable without leaking the token", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      await jsonResponse(
        {
          ok: false,
          error_code: 429,
          description: "Too Many Requests: retry later",
          parameters: { retry_after: 12 },
        },
        429,
      ),
    );

    await expect(
      telegramAdapter.send(
        { botToken: "123456:secret", chatId: "1234" },
        { title: "Title", body: "Body" },
      ),
    ).rejects.toMatchObject({
      code: "telegram_rate_limited",
      retryable: true,
      retryAfterSeconds: 12,
    });
  });

  it("classifies invalid tokens as permanent failures", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      await jsonResponse(
        {
          ok: false,
          error_code: 401,
          description: "Unauthorized",
        },
        401,
      ),
    );

    await expect(
      telegramAdapter.send(
        { botToken: "123456:secret", chatId: "1234" },
        { title: "Title", body: "Body" },
      ),
    ).rejects.toMatchObject({
      code: "telegram_invalid_token",
      retryable: false,
    });
  });

  it("classifies malformed Telegram responses as retryable", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      await jsonResponse({ ok: true, result: null }),
    );

    await expect(
      telegramAdapter.send(
        { botToken: "123456:secret", chatId: "1234" },
        { title: "Title", body: "Body" },
      ),
    ).rejects.toMatchObject({
      code: "telegram_malformed_response",
      retryable: true,
    });
  });
});
