import { describe, expect, it } from "vitest";

import {
  NotificationPreferencesSchema,
  NotificationSettingsSchema,
  TelegramChannelCreateSchema,
} from "../schemas";

describe("NotificationPreferencesSchema", () => {
  it("accepts renewal offsets with optional explicit channel routing", () => {
    const parsed = NotificationPreferencesSchema.safeParse({
      enabled: true,
      rules: [
        {
          event: "renewal",
          offsets_days: [7, 1, 0],
          channel_ids: ["64f0f0f0f0f0f0f0f0f0f0f0"],
        },
      ],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.rules[0].offsets_days).toEqual([0, 1, 7]);
    }
  });

  it("rejects enabled preferences without rules", () => {
    const parsed = NotificationPreferencesSchema.safeParse({
      enabled: true,
      rules: [],
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects duplicate offsets", () => {
    const parsed = NotificationPreferencesSchema.safeParse({
      enabled: true,
      rules: [{ event: "renewal", offsets_days: [1, 1] }],
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects fractional and over-range offsets", () => {
    expect(
      NotificationPreferencesSchema.safeParse({
        enabled: true,
        rules: [{ event: "renewal", offsets_days: [1.5] }],
      }).success,
    ).toBe(false);
    expect(
      NotificationPreferencesSchema.safeParse({
        enabled: true,
        rules: [{ event: "renewal", offsets_days: [366] }],
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate events", () => {
    const parsed = NotificationPreferencesSchema.safeParse({
      enabled: true,
      rules: [
        { event: "renewal", offsets_days: [1] },
        { event: "renewal", offsets_days: [7] },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it("allows disabled preferences without rules", () => {
    const parsed = NotificationPreferencesSchema.safeParse({
      enabled: false,
      rules: [],
    });

    expect(parsed.success).toBe(true);
  });

  it("allows event-specific disabled preferences without rules", () => {
    const parsed = NotificationPreferencesSchema.safeParse({
      enabled: true,
      disabled_events: ["birthday"],
      rules: [],
    });

    expect(parsed.success).toBe(true);
  });
});

describe("NotificationSettingsSchema", () => {
  it("applies disabled-by-default runtime settings", () => {
    const parsed = NotificationSettingsSchema.parse({});

    expect(parsed).toEqual({
      enabled: false,
      timezone: "UTC",
      deliveryHour: 9,
      catchUpHours: 36,
    });
  });

  it("rejects invalid timezones and delivery hours", () => {
    expect(
      NotificationSettingsSchema.safeParse({
        timezone: "Mars/Base",
      }).success,
    ).toBe(false);
    expect(
      NotificationSettingsSchema.safeParse({
        deliveryHour: 24,
      }).success,
    ).toBe(false);
  });
});

describe("TelegramChannelCreateSchema", () => {
  it("accepts the first Telegram adapter connection payload", () => {
    const parsed = TelegramChannelCreateSchema.safeParse({
      adapter_type: "telegram",
      name: "Personal Telegram",
      bot_token: "123456:ABC-def_token",
      chat_id: "-1001234567890",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects non-telegram adapter types", () => {
    const parsed = TelegramChannelCreateSchema.safeParse({
      adapter_type: "slack",
      name: "Slack",
      bot_token: "xoxb-secret",
      chat_id: "C123",
    });

    expect(parsed.success).toBe(false);
  });
});
