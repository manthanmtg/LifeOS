import type { SystemConfig } from "@/lib/types";
import { getDb } from "../mongodb";

import {
  NOTIFICATION_BATCH_SIZE,
  NOTIFICATION_MAX_BATCH_SIZE,
  NOTIFICATION_SEND_CONCURRENCY,
  type NotificationCandidate,
  type NotificationChannelDocument,
  type NotificationDeliveryDocument,
  type NotificationDispatchSummary,
  ZERO_NOTIFICATION_DISPATCH_SUMMARY,
} from "./contracts";
import { decryptCredential } from "./crypto";
import { getNotificationAdapter } from "./adapters/registry";
import { toNotificationError } from "./errors";
import { NotificationSettingsSchema } from "./schemas";
import {
  claimNextNotificationDelivery,
  ensureNotificationIndexes,
  getNotificationChannelById,
  listEnabledNotificationChannels,
  markNotificationDeliveryDeadLetter,
  markNotificationDeliveryFailed,
  markNotificationDeliverySent,
  materializeCandidateDeliveries,
} from "./repositories";
import { notificationSources } from "./sources/registry";

function createSummary(): NotificationDispatchSummary {
  return { ...ZERO_NOTIFICATION_DISPATCH_SUMMARY };
}

function clampBatchSize(batchSize: number | undefined): number {
  const requested =
    typeof batchSize === "number" && Number.isInteger(batchSize)
      ? batchSize
      : NOTIFICATION_BATCH_SIZE;
  return Math.min(Math.max(requested, 1), NOTIFICATION_MAX_BATCH_SIZE);
}

function readNotificationSettings(systemConfig: SystemConfig) {
  const parsed = NotificationSettingsSchema.safeParse(
    systemConfig.notificationSettings ?? {},
  );
  return parsed.success ? parsed.data : NotificationSettingsSchema.parse({});
}

function resolveCandidateChannels(
  candidate: NotificationCandidate,
  channels: NotificationChannelDocument[],
) {
  if (!candidate.channel_ids?.length) return channels;
  const requested = new Set(candidate.channel_ids);
  return channels.filter((channel) =>
    channel._id ? requested.has(String(channel._id)) : false,
  );
}

async function processWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex];
        nextIndex += 1;
        await worker(item);
      }
    },
  );

  await Promise.all(workers);
}

async function processDelivery(
  db: Awaited<ReturnType<typeof getDb>>,
  delivery: NotificationDeliveryDocument,
  now: Date,
  summary: NotificationDispatchSummary,
  systemConfig: SystemConfig,
) {
  const channel = await getNotificationChannelById(db, delivery.channel_id);
  if (!channel) {
    await markNotificationDeliveryDeadLetter(
      db,
      delivery,
      now,
      "channel_not_found",
      "Notification channel no longer exists",
    );
    summary.deliveries_dead_lettered += 1;
    return;
  }

  if (!channel.enabled) {
    await markNotificationDeliveryDeadLetter(
      db,
      delivery,
      now,
      "channel_disabled",
      "Notification channel is disabled",
    );
    summary.deliveries_dead_lettered += 1;
    return;
  }

  try {
    const adapter = getNotificationAdapter(channel.adapter_type);
    const result = await adapter.send(
      {
        botToken: decryptCredential(channel.credentials, systemConfig),
        chatId: channel.config.chat_id,
      },
      delivery.message_snapshot,
    );

    if (delivery._id) {
      await markNotificationDeliverySent(
        db,
        delivery._id,
        now,
        result.external_message_id,
      );
    }
    summary.deliveries_sent += 1;
  } catch (error) {
    const status = await markNotificationDeliveryFailed(
      db,
      delivery,
      toNotificationError(error),
      now,
    );
    if (status === "dead_letter") {
      summary.deliveries_dead_lettered += 1;
    } else {
      summary.deliveries_failed += 1;
    }
  }
}

export async function runNotificationDispatch(options?: {
  now?: Date;
  batchSize?: number;
}): Promise<NotificationDispatchSummary> {
  const now = options?.now ?? new Date();
  const batchSize = clampBatchSize(options?.batchSize);
  const summary = createSummary();
  const db = await getDb();

  await ensureNotificationIndexes(db);

  const systemConfig = await db
    .collection<SystemConfig>("system")
    .findOne({ _id: "global" });
  if (!systemConfig) return summary;

  const settings = readNotificationSettings(systemConfig);
  if (!settings.enabled) return summary;

  const channels = await listEnabledNotificationChannels(db);
  if (channels.length === 0) return summary;

  for (const source of notificationSources) {
    summary.sources_scanned += 1;
    try {
      const result = await source.collectCandidates({
        db,
        now,
        settings,
        systemConfig,
      });
      summary.items_skipped += result.items_skipped;
      summary.candidates_discovered += result.candidates.length;

      for (const candidate of result.candidates) {
        const candidateChannels = resolveCandidateChannels(candidate, channels);
        const materialized = await materializeCandidateDeliveries(
          db,
          candidate,
          candidateChannels,
          now,
        );
        summary.deliveries_created += materialized.created;
        summary.deliveries_deduplicated += materialized.deduplicated;
      }
    } catch (error) {
      console.error("[Notifications] Source collection failed", {
        module_type: source.moduleType,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const claimed: NotificationDeliveryDocument[] = [];
  for (let i = 0; i < batchSize; i += 1) {
    const delivery = await claimNextNotificationDelivery(db, now);
    if (!delivery) break;
    claimed.push(delivery);
  }

  await processWithConcurrency(
    claimed,
    NOTIFICATION_SEND_CONCURRENCY,
    async (delivery) => {
      await processDelivery(db, delivery, now, summary, systemConfig);
    },
  );

  console.info("[Notifications] Dispatch summary", summary);
  return summary;
}
