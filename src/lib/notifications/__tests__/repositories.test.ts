import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";

import type {
  NotificationChannelDocument,
  NotificationDeliveryDocument,
} from "../contracts";
import {
  calculateNextAttemptAt,
  ensureNotificationIndexes,
  toNotificationChannelDto,
  toNotificationDeliveryDto,
} from "../repositories";

const credential = {
  version: 1 as const,
  algorithm: "aes-256-gcm" as const,
  iv: "iv",
  auth_tag: "tag",
  ciphertext: "ciphertext",
};

describe("notification repositories", () => {
  it("ensures channel and delivery indexes", async () => {
    const createIndex = vi.fn().mockResolvedValue("index");
    const collection = vi.fn().mockReturnValue({ createIndex });
    const db = { collection };

    await ensureNotificationIndexes(db as never);

    expect(collection).toHaveBeenCalledWith("notification_channels");
    expect(collection).toHaveBeenCalledWith("notification_deliveries");
    expect(createIndex).toHaveBeenCalledWith(
      { dedupe_key: 1 },
      { unique: true },
    );
    expect(createIndex).toHaveBeenCalledWith(
      { expire_at: 1 },
      { expireAfterSeconds: 0 },
    );
  });

  it("maps a channel to a safe DTO without credentials or full chat ID", () => {
    const channel: NotificationChannelDocument = {
      _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f0f0"),
      adapter_type: "telegram",
      name: "Personal",
      enabled: true,
      config: {
        chat_id: "-1001234567890",
        bot_username: "lifeos_bot",
        destination_label: "Chat ****7890",
      },
      credentials: credential,
      last_tested_at: "2026-07-31T00:00:00.000Z",
      last_test_status: "success",
      created_at: "2026-07-31T00:00:00.000Z",
      updated_at: "2026-07-31T00:00:00.000Z",
    };

    expect(toNotificationChannelDto(channel)).toEqual({
      id: "64f0f0f0f0f0f0f0f0f0f0f0",
      adapter_type: "telegram",
      name: "Personal",
      enabled: true,
      config: {
        bot_username: "lifeos_bot",
        destination_label: "Chat ****7890",
        chat_id_hint: "****7890",
      },
      has_credentials: true,
      last_tested_at: "2026-07-31T00:00:00.000Z",
      last_test_status: "success",
      created_at: "2026-07-31T00:00:00.000Z",
      updated_at: "2026-07-31T00:00:00.000Z",
    });
  });

  it("maps a delivery to a safe DTO without the message body", () => {
    const delivery: NotificationDeliveryDocument = {
      _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f0f2"),
      dedupe_key: "dedupe",
      channel_id: new ObjectId("64f0f0f0f0f0f0f0f0f0f0f0"),
      channel_snapshot: { name: "Personal", adapter_type: "telegram" },
      source: {
        module_type: "recurring_expense",
        document_id: "64f0f0f0f0f0f0f0f0f0f0f3",
        event: "renewal",
        event_date: "2026-07-31",
      },
      scheduled_date: "2026-07-30",
      offset_days: 1,
      message_snapshot: {
        title: "Netflix renews tomorrow",
        body: "secret-ish body",
        url: "https://example.com",
      },
      status: "sent",
      attempt_count: 1,
      sent_at: "2026-07-30T03:30:00.000Z",
      created_at: "2026-07-30T03:30:00.000Z",
      updated_at: "2026-07-30T03:30:00.000Z",
      expire_at: new Date("2026-10-28T03:30:00.000Z"),
    };

    expect(toNotificationDeliveryDto(delivery).message).toEqual({
      title: "Netflix renews tomorrow",
      url: "https://example.com",
    });
  });

  it("uses bounded retry delays", () => {
    const now = new Date("2026-07-31T00:00:00.000Z");

    expect(calculateNextAttemptAt(now, 1).toISOString()).toBe(
      "2026-07-31T00:05:00.000Z",
    );
    expect(calculateNextAttemptAt(now, 2).toISOString()).toBe(
      "2026-07-31T00:30:00.000Z",
    );
    expect(calculateNextAttemptAt(now, 2, 60 * 60 * 24).toISOString()).toBe(
      "2026-07-31T06:00:00.000Z",
    );
  });
});
