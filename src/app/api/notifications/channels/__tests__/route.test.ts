/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "../route";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  encryptCredential: vi.fn(),
  isNotificationEncryptionReady: vi.fn(),
  adapterTest: vi.fn(),
  createNotificationChannel: vi.fn(),
  toNotificationChannelDto: vi.fn(),
}));

vi.mock("@/lib/mongodb", () => ({
  getDb: mocks.getDb,
}));

vi.mock("@/lib/auth", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/notifications/crypto", () => ({
  encryptCredential: mocks.encryptCredential,
  isNotificationEncryptionReady: mocks.isNotificationEncryptionReady,
}));

vi.mock("@/lib/notifications/adapters/registry", () => ({
  getNotificationAdapter: () => ({ test: mocks.adapterTest }),
}));

vi.mock("@/lib/notifications/repositories", () => ({
  createNotificationChannel: mocks.createNotificationChannel,
  toNotificationChannelDto: mocks.toNotificationChannelDto,
}));

function request(body: unknown) {
  return new Request("http://localhost/api/notifications/channels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/notifications/channels", () => {
  const db = {
    collection: vi.fn().mockReturnValue({
      findOne: vi.fn().mockResolvedValue({ _id: "global" }),
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "token" }),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
    mocks.getDb.mockResolvedValue(db);
    mocks.isNotificationEncryptionReady.mockReturnValue(true);
    mocks.encryptCredential.mockReturnValue({
      version: 1,
      algorithm: "aes-256-gcm",
      iv: "iv",
      auth_tag: "tag",
      ciphertext: "ciphertext",
    });
    mocks.adapterTest.mockResolvedValue({
      provider_account_label: "@lifeos_bot",
      destination_label: "Chat ****7890",
    });
    mocks.createNotificationChannel.mockResolvedValue({
      _id: "channel-id",
      name: "Telegram",
    });
    mocks.toNotificationChannelDto.mockReturnValue({
      id: "channel-id",
      adapter_type: "telegram",
      name: "Telegram",
      enabled: true,
      has_credentials: true,
    });
  });

  it("tests Telegram before persisting a new channel", async () => {
    const response = await POST(
      request({
        adapter_type: "telegram",
        name: "Telegram",
        bot_token: "123456:secret",
        chat_id: "-1001234567890",
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.adapterTest).toHaveBeenCalledWith({
      botToken: "123456:secret",
      chatId: "-1001234567890",
    });
    expect(mocks.createNotificationChannel).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        adapter_type: "telegram",
        name: "Telegram",
        enabled: true,
        config: expect.objectContaining({
          chat_id: "-1001234567890",
          bot_username: "lifeos_bot",
        }),
      }),
    );
  });

  it("does not persist when the connection test fails", async () => {
    mocks.adapterTest.mockRejectedValue(new Error("bad token"));

    const response = await POST(
      request({
        adapter_type: "telegram",
        name: "Telegram",
        bot_token: "123456:secret",
        chat_id: "-1001234567890",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.createNotificationChannel).not.toHaveBeenCalled();
  });

  it("returns a safe configuration error when encryption is missing", async () => {
    mocks.isNotificationEncryptionReady.mockReturnValue(false);

    const response = await POST(
      request({
        adapter_type: "telegram",
        name: "Telegram",
        bot_token: "123456:secret",
        chat_id: "-1001234567890",
      }),
    );

    expect(response.status).toBe(503);
    expect(mocks.adapterTest).not.toHaveBeenCalled();
  });
});
