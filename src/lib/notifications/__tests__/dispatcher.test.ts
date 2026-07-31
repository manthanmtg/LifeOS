// @vitest-environment node
import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  NotificationCandidate,
  NotificationChannelDocument,
  NotificationDeliveryDocument,
  NotificationSource,
} from "../contracts";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  ensureNotificationIndexes: vi.fn(),
  listEnabledNotificationChannels: vi.fn(),
  materializeCandidateDeliveries: vi.fn(),
  claimNextNotificationDelivery: vi.fn(),
  getNotificationChannelById: vi.fn(),
  markNotificationDeliverySent: vi.fn(),
  markNotificationDeliveryFailed: vi.fn(),
  markNotificationDeliveryDeadLetter: vi.fn(),
  decryptCredential: vi.fn(),
  adapterSend: vi.fn(),
  sources: [] as NotificationSource[],
}));

vi.mock("../../mongodb", () => ({
  getDb: mocks.getDb,
}));

vi.mock("../repositories", () => ({
  ensureNotificationIndexes: mocks.ensureNotificationIndexes,
  listEnabledNotificationChannels: mocks.listEnabledNotificationChannels,
  materializeCandidateDeliveries: mocks.materializeCandidateDeliveries,
  claimNextNotificationDelivery: mocks.claimNextNotificationDelivery,
  getNotificationChannelById: mocks.getNotificationChannelById,
  markNotificationDeliverySent: mocks.markNotificationDeliverySent,
  markNotificationDeliveryFailed: mocks.markNotificationDeliveryFailed,
  markNotificationDeliveryDeadLetter: mocks.markNotificationDeliveryDeadLetter,
}));

vi.mock("../crypto", () => ({
  decryptCredential: mocks.decryptCredential,
}));

vi.mock("../adapters/registry", () => ({
  getNotificationAdapter: () => ({ send: mocks.adapterSend }),
}));

vi.mock("../sources/registry", () => ({
  notificationSources: mocks.sources,
}));

import { runNotificationDispatch } from "../dispatcher";

const candidate: NotificationCandidate = {
  source: {
    module_type: "recurring_expense",
    document_id: "64f0f0f0f0f0f0f0f0f0f0f3",
    event: "renewal",
    event_date: "2026-07-31",
  },
  scheduled_date: "2026-07-30",
  offset_days: 1,
  message: {
    title: "Netflix renews tomorrow",
    body: "INR 649",
  },
};

const channel: NotificationChannelDocument = {
  _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f0f0"),
  adapter_type: "telegram",
  name: "Telegram",
  enabled: true,
  config: {
    chat_id: "-1001234567890",
    bot_username: "lifeos_bot",
    destination_label: "Chat ****7890",
  },
  credentials: {
    version: 1,
    algorithm: "aes-256-gcm",
    iv: "iv",
    auth_tag: "tag",
    ciphertext: "ciphertext",
  },
  last_tested_at: "2026-07-31T00:00:00.000Z",
  last_test_status: "success",
  created_at: "2026-07-31T00:00:00.000Z",
  updated_at: "2026-07-31T00:00:00.000Z",
};

const delivery: NotificationDeliveryDocument = {
  _id: new ObjectId("64f0f0f0f0f0f0f0f0f0f0f2"),
  dedupe_key: "dedupe",
  channel_id: channel._id!,
  channel_snapshot: { name: "Telegram", adapter_type: "telegram" },
  source: candidate.source,
  scheduled_date: candidate.scheduled_date,
  offset_days: candidate.offset_days,
  message_snapshot: candidate.message,
  status: "processing",
  attempt_count: 1,
  created_at: "2026-07-31T00:00:00.000Z",
  updated_at: "2026-07-31T00:00:00.000Z",
  expire_at: new Date("2026-10-29T00:00:00.000Z"),
};

function system(enabled: boolean) {
  return {
    _id: "global",
    site_title: "Life OS",
    active_theme: "one-dark",
    bio: "",
    moduleRegistry: {},
    notificationSettings: {
      enabled,
      timezone: "UTC",
      deliveryHour: 9,
      catchUpHours: 36,
    },
  };
}

function fakeDb(config = system(true)) {
  return {
    collection: vi.fn((name: string) => {
      if (name === "system") {
        return { findOne: vi.fn().mockResolvedValue(config) };
      }
      return {};
    }),
  };
}

describe("runNotificationDispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sources.length = 0;
    mocks.getDb.mockResolvedValue(fakeDb());
    mocks.ensureNotificationIndexes.mockResolvedValue(undefined);
    mocks.listEnabledNotificationChannels.mockResolvedValue([channel]);
    mocks.materializeCandidateDeliveries.mockResolvedValue({
      created: 1,
      deduplicated: 0,
    });
    mocks.claimNextNotificationDelivery
      .mockResolvedValueOnce(delivery)
      .mockResolvedValueOnce(null);
    mocks.getNotificationChannelById.mockResolvedValue(channel);
    mocks.decryptCredential.mockReturnValue("telegram-token");
    mocks.adapterSend.mockResolvedValue({ external_message_id: "42" });
  });

  it("returns a zero summary when global notifications are disabled", async () => {
    mocks.getDb.mockResolvedValue(fakeDb(system(false)));

    await expect(
      runNotificationDispatch({ now: new Date("2026-07-31T00:00:00.000Z") }),
    ).resolves.toMatchObject({
      candidates_discovered: 0,
      deliveries_sent: 0,
    });

    expect(mocks.listEnabledNotificationChannels).not.toHaveBeenCalled();
  });

  it("returns a zero summary when no channel is enabled", async () => {
    mocks.listEnabledNotificationChannels.mockResolvedValue([]);

    await expect(
      runNotificationDispatch({ now: new Date("2026-07-31T00:00:00.000Z") }),
    ).resolves.toMatchObject({
      candidates_discovered: 0,
      deliveries_sent: 0,
    });

    expect(mocks.materializeCandidateDeliveries).not.toHaveBeenCalled();
  });

  it("materializes and sends candidates from registered sources", async () => {
    mocks.sources.push({
      moduleType: "recurring_expense",
      collectCandidates: vi.fn().mockResolvedValue({
        candidates: [candidate],
        items_skipped: 0,
      }),
      getActivationSummary: vi.fn(),
    });

    await expect(
      runNotificationDispatch({
        now: new Date("2026-07-31T00:00:00.000Z"),
        batchSize: 5,
      }),
    ).resolves.toMatchObject({
      sources_scanned: 1,
      candidates_discovered: 1,
      deliveries_created: 1,
      deliveries_sent: 1,
    });

    expect(mocks.adapterSend).toHaveBeenCalledWith(
      { botToken: "telegram-token", chatId: "-1001234567890" },
      candidate.message,
    );
    expect(mocks.markNotificationDeliverySent).toHaveBeenCalledWith(
      expect.anything(),
      delivery._id,
      expect.any(Date),
      "42",
    );
  });

  it("dead-letters a claimed delivery when its channel was disabled", async () => {
    mocks.getNotificationChannelById.mockResolvedValue({
      ...channel,
      enabled: false,
    });

    await runNotificationDispatch({
      now: new Date("2026-07-31T00:00:00.000Z"),
    });

    expect(mocks.adapterSend).not.toHaveBeenCalled();
    expect(mocks.markNotificationDeliveryDeadLetter).toHaveBeenCalledWith(
      expect.anything(),
      delivery,
      expect.any(Date),
      "channel_disabled",
      "Notification channel is disabled",
    );
  });

  it("isolates source failures and still processes other sources", async () => {
    mocks.sources.push(
      {
        moduleType: "broken",
        collectCandidates: vi.fn().mockRejectedValue(new Error("boom")),
        getActivationSummary: vi.fn(),
      },
      {
        moduleType: "recurring_expense",
        collectCandidates: vi.fn().mockResolvedValue({
          candidates: [candidate],
          items_skipped: 2,
        }),
        getActivationSummary: vi.fn(),
      },
    );

    await expect(
      runNotificationDispatch({ now: new Date("2026-07-31T00:00:00.000Z") }),
    ).resolves.toMatchObject({
      sources_scanned: 2,
      candidates_discovered: 1,
      items_skipped: 2,
      deliveries_sent: 1,
    });
  });
});
