import { ObjectId, type Db, type Filter } from "mongodb";

import type {
  NotificationCandidate,
  NotificationChannelDocument,
  NotificationChannelDto,
  NotificationDeliveryDocument,
  NotificationDeliveryDto,
  NotificationDeliveryStatus,
} from "./contracts";
import {
  NOTIFICATION_DELIVERY_TTL_DAYS,
  NOTIFICATION_LEASE_MINUTES,
} from "./contracts";
import { buildDeliveryDedupeKey } from "./delivery-key";
import type { NotificationError } from "./errors";

export const NOTIFICATION_CHANNELS_COLLECTION = "notification_channels";
export const NOTIFICATION_DELIVERIES_COLLECTION = "notification_deliveries";

export async function ensureNotificationIndexes(db: Db): Promise<void> {
  const channels = db.collection(NOTIFICATION_CHANNELS_COLLECTION);
  const deliveries = db.collection(NOTIFICATION_DELIVERIES_COLLECTION);

  await channels.createIndex({ adapter_type: 1, created_at: -1 });
  await channels.createIndex({ enabled: 1, adapter_type: 1 });

  await deliveries.createIndex({ dedupe_key: 1 }, { unique: true });
  await deliveries.createIndex({ status: 1, next_attempt_at: 1 });
  await deliveries.createIndex({ channel_id: 1, created_at: -1 });
  await deliveries.createIndex({ expire_at: 1 }, { expireAfterSeconds: 0 });
}

function channelCollection(db: Db) {
  return db.collection<NotificationChannelDocument>(
    NOTIFICATION_CHANNELS_COLLECTION,
  );
}

function deliveryCollection(db: Db) {
  return db.collection<NotificationDeliveryDocument>(
    NOTIFICATION_DELIVERIES_COLLECTION,
  );
}

export function getChatIdHint(chatId: string): string {
  return `****${chatId.slice(-4)}`;
}

export function toNotificationChannelDto(
  channel: NotificationChannelDocument,
): NotificationChannelDto {
  return {
    id: String(channel._id),
    adapter_type: channel.adapter_type,
    name: channel.name,
    enabled: channel.enabled,
    config: {
      bot_username: channel.config.bot_username,
      destination_label: channel.config.destination_label,
      chat_id_hint: getChatIdHint(channel.config.chat_id),
    },
    has_credentials: true,
    last_tested_at: channel.last_tested_at,
    last_test_status: channel.last_test_status,
    last_error: channel.last_error,
    created_at: channel.created_at,
    updated_at: channel.updated_at,
  };
}

export function toNotificationDeliveryDto(
  delivery: NotificationDeliveryDocument,
): NotificationDeliveryDto {
  return {
    id: String(delivery._id),
    channel: {
      id: String(delivery.channel_id),
      name: delivery.channel_snapshot.name,
      adapter_type: delivery.channel_snapshot.adapter_type,
    },
    source: delivery.source,
    scheduled_date: delivery.scheduled_date,
    offset_days: delivery.offset_days,
    message: {
      title: delivery.message_snapshot.title,
      url: delivery.message_snapshot.url,
    },
    status: delivery.status,
    attempt_count: delivery.attempt_count,
    next_attempt_at: delivery.next_attempt_at,
    sent_at: delivery.sent_at,
    last_error: delivery.last_error,
    created_at: delivery.created_at,
    updated_at: delivery.updated_at,
  };
}

export async function listNotificationChannels(
  db: Db,
): Promise<NotificationChannelDocument[]> {
  return channelCollection(db).find({}).sort({ created_at: -1 }).toArray();
}

export async function listEnabledNotificationChannels(
  db: Db,
): Promise<NotificationChannelDocument[]> {
  return channelCollection(db)
    .find({ enabled: true })
    .sort({ created_at: -1 })
    .toArray();
}

export async function getNotificationChannelById(
  db: Db,
  id: string | ObjectId,
): Promise<NotificationChannelDocument | null> {
  if (typeof id === "string" && !ObjectId.isValid(id)) return null;
  const objectId = typeof id === "string" ? new ObjectId(id) : id;
  return channelCollection(db).findOne({ _id: objectId });
}

export async function createNotificationChannel(
  db: Db,
  document: Omit<NotificationChannelDocument, "_id">,
): Promise<NotificationChannelDocument> {
  const result = await channelCollection(db).insertOne(
    document as NotificationChannelDocument,
  );
  return { ...document, _id: result.insertedId };
}

export async function updateNotificationChannel(
  db: Db,
  id: string,
  updates: Partial<Omit<NotificationChannelDocument, "_id" | "created_at">>,
): Promise<NotificationChannelDocument | null> {
  if (!ObjectId.isValid(id)) return null;
  const result = await channelCollection(db).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updates },
    { returnDocument: "after" },
  );
  return result;
}

export async function deleteNotificationChannel(
  db: Db,
  id: string,
): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await channelCollection(db).deleteOne({
    _id: new ObjectId(id),
  });
  return result.deletedCount === 1;
}

export interface MaterializeDeliveriesResult {
  created: number;
  deduplicated: number;
}

export async function materializeCandidateDeliveries(
  db: Db,
  candidate: NotificationCandidate,
  channels: NotificationChannelDocument[],
  now: Date,
): Promise<MaterializeDeliveriesResult> {
  if (channels.length === 0) return { created: 0, deduplicated: 0 };

  const nowIso = now.toISOString();
  const expireAt = new Date(
    now.getTime() + NOTIFICATION_DELIVERY_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
  const operations = channels.map((channel) => {
    const channelId = channel._id;
    if (!channelId) {
      throw new Error("Cannot materialize delivery for channel without _id");
    }

    const dedupeKey = buildDeliveryDedupeKey({
      module_type: candidate.source.module_type,
      document_id: candidate.source.document_id,
      event: candidate.source.event,
      event_date: candidate.source.event_date,
      offset_days: candidate.offset_days,
      channel_id: String(channelId),
    });

    const document: Omit<NotificationDeliveryDocument, "_id"> = {
      dedupe_key: dedupeKey,
      channel_id: channelId,
      channel_snapshot: {
        name: channel.name,
        adapter_type: channel.adapter_type,
      },
      source: candidate.source,
      scheduled_date: candidate.scheduled_date,
      offset_days: candidate.offset_days,
      message_snapshot: candidate.message,
      status: "pending",
      attempt_count: 0,
      created_at: nowIso,
      updated_at: nowIso,
      expire_at: expireAt,
    };

    return {
      updateOne: {
        filter: { dedupe_key: dedupeKey },
        update: { $setOnInsert: document },
        upsert: true,
      },
    };
  });

  const result = await deliveryCollection(db).bulkWrite(operations, {
    ordered: false,
  });
  const created = result.upsertedCount ?? 0;
  return { created, deduplicated: operations.length - created };
}

export async function claimNextNotificationDelivery(
  db: Db,
  now: Date,
): Promise<NotificationDeliveryDocument | null> {
  const nowIso = now.toISOString();
  const leaseExpiresAt = new Date(
    now.getTime() + NOTIFICATION_LEASE_MINUTES * 60 * 1000,
  ).toISOString();
  const filter: Filter<NotificationDeliveryDocument> = {
    $or: [
      { status: "pending" },
      { status: "failed", next_attempt_at: { $lte: nowIso } },
      { status: "processing", lease_expires_at: { $lte: nowIso } },
    ],
  };

  return deliveryCollection(db).findOneAndUpdate(
    filter,
    {
      $set: {
        status: "processing",
        lease_expires_at: leaseExpiresAt,
        updated_at: nowIso,
      },
      $inc: { attempt_count: 1 },
    },
    { sort: { created_at: 1 }, returnDocument: "after" },
  );
}

export async function markNotificationDeliverySent(
  db: Db,
  deliveryId: ObjectId,
  now: Date,
  externalMessageId?: string,
): Promise<void> {
  await deliveryCollection(db).updateOne(
    { _id: deliveryId },
    {
      $set: {
        status: "sent",
        sent_at: now.toISOString(),
        updated_at: now.toISOString(),
        ...(externalMessageId
          ? { external_message_id: externalMessageId }
          : {}),
      },
      $unset: {
        lease_expires_at: "",
        next_attempt_at: "",
        last_error: "",
      },
    },
  );
}

export function calculateNextAttemptAt(
  now: Date,
  attemptCount: number,
  retryAfterSeconds?: number,
): Date {
  const baseDelayMinutes = attemptCount <= 1 ? 5 : 30;
  const retryAfterMs = retryAfterSeconds
    ? Math.min(retryAfterSeconds * 1000, 6 * 60 * 60 * 1000)
    : 0;
  const delayMs = Math.max(baseDelayMinutes * 60 * 1000, retryAfterMs);
  return new Date(now.getTime() + delayMs);
}

export async function markNotificationDeliveryFailed(
  db: Db,
  delivery: NotificationDeliveryDocument,
  error: NotificationError,
  now: Date,
): Promise<NotificationDeliveryStatus> {
  const isDeadLetter = !error.retryable || delivery.attempt_count >= 3;
  const status: NotificationDeliveryStatus = isDeadLetter
    ? "dead_letter"
    : "failed";
  const update: Record<string, unknown> = {
    status,
    updated_at: now.toISOString(),
    last_error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    },
  };

  if (!isDeadLetter) {
    update.next_attempt_at = calculateNextAttemptAt(
      now,
      delivery.attempt_count,
      error.retryAfterSeconds,
    ).toISOString();
  }

  await deliveryCollection(db).updateOne(
    { _id: delivery._id },
    {
      $set: update,
      $unset: {
        lease_expires_at: "",
        ...(isDeadLetter ? { next_attempt_at: "" } : {}),
      },
    },
  );

  return status;
}

export async function markNotificationDeliveryDeadLetter(
  db: Db,
  delivery: NotificationDeliveryDocument,
  now: Date,
  code: string,
  message: string,
): Promise<void> {
  await deliveryCollection(db).updateOne(
    { _id: delivery._id },
    {
      $set: {
        status: "dead_letter",
        updated_at: now.toISOString(),
        last_error: {
          code,
          message,
          retryable: false,
        },
      },
      $unset: {
        lease_expires_at: "",
        next_attempt_at: "",
      },
    },
  );
}

export async function getRecentNotificationDeliveries(
  db: Db,
  limit: number,
): Promise<NotificationDeliveryDto[]> {
  const deliveries = await deliveryCollection(db)
    .find({})
    .sort({ created_at: -1 })
    .limit(Math.min(Math.max(limit, 1), 100))
    .toArray();
  return deliveries.map(toNotificationDeliveryDto);
}

export async function getNotificationDeliveryOverview(db: Db): Promise<{
  delivery_counts: { sent: number; failed: number; dead_letter: number };
  last_success_at?: string;
  last_failure_at?: string;
}> {
  const deliveries = deliveryCollection(db);
  const [sent, failed, deadLetter, lastSuccess, lastFailure] =
    await Promise.all([
      deliveries.countDocuments({ status: "sent" }),
      deliveries.countDocuments({ status: "failed" }),
      deliveries.countDocuments({ status: "dead_letter" }),
      deliveries
        .find({ status: "sent" })
        .sort({ sent_at: -1 })
        .limit(1)
        .toArray(),
      deliveries
        .find({ status: { $in: ["failed", "dead_letter"] } })
        .sort({ updated_at: -1 })
        .limit(1)
        .toArray(),
    ]);

  return {
    delivery_counts: { sent, failed, dead_letter: deadLetter },
    last_success_at: lastSuccess[0]?.sent_at,
    last_failure_at: lastFailure[0]?.updated_at,
  };
}
