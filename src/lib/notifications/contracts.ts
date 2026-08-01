import type { Db, ObjectId } from "mongodb";

import type { SystemConfig } from "@/lib/types";

export type NotificationAdapterType = "telegram";

export interface NotificationRule {
  event: string;
  offsets_days: number[];
  channel_ids?: string[];
}

export interface NotificationPreferences {
  enabled: boolean;
  rules: NotificationRule[];
}

export interface NotificationSettings {
  enabled: boolean;
  timezone: string;
  deliveryHour: number;
  catchUpHours: number;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  timezone: "UTC",
  deliveryHour: 9,
  catchUpHours: 36,
};

export const DEFAULT_RECURRING_NOTIFICATION_OFFSETS = [1];

export const NOTIFICATION_OFFSET_PRESETS = [0, 1, 2, 3, 7, 14, 30] as const;

export const NOTIFICATION_DELIVERY_TTL_DAYS = 90;
export const NOTIFICATION_MAX_ATTEMPTS = 3;
export const NOTIFICATION_LEASE_MINUTES = 5;
export const NOTIFICATION_BATCH_SIZE = 10;
export const NOTIFICATION_MAX_BATCH_SIZE = 10;
export const NOTIFICATION_SEND_CONCURRENCY = 5;

export interface NotificationMessage {
  title: string;
  body: string;
  url?: string;
}

export interface NotificationCandidate {
  source: {
    module_type: string;
    document_id: string;
    event: string;
    event_date: string;
  };
  scheduled_date: string;
  offset_days: number;
  channel_ids?: string[];
  message: NotificationMessage;
}

export interface NotificationSourceContext {
  db: Db;
  now: Date;
  systemConfig: SystemConfig;
  settings: NotificationSettings;
}

export interface NotificationSourceActivationSummary {
  module_type: string;
  label: string;
  eligible_count: number;
  explicit_count: number;
  inherited_count: number;
}

export interface NotificationSourceCollectionResult {
  candidates: NotificationCandidate[];
  items_skipped: number;
}

export interface NotificationSource {
  readonly moduleType: string;
  collectCandidates(
    context: NotificationSourceContext,
  ): Promise<NotificationSourceCollectionResult>;
  getActivationSummary(
    context: NotificationSourceContext,
  ): Promise<NotificationSourceActivationSummary>;
}

export interface AdapterTestResult {
  provider_account_label: string;
  destination_label: string;
}

export interface AdapterSendResult {
  external_message_id?: string;
}

export interface NotificationAdapter<RuntimeConfig = unknown> {
  readonly type: NotificationAdapterType;
  test(config: RuntimeConfig): Promise<AdapterTestResult>;
  send(
    config: RuntimeConfig,
    message: NotificationMessage,
  ): Promise<AdapterSendResult>;
}

export interface TelegramRuntimeConfig {
  botToken: string;
  chatId: string;
}

export interface EncryptedCredential {
  version: 1;
  algorithm: "aes-256-gcm";
  iv: string;
  auth_tag: string;
  ciphertext: string;
}

export interface TelegramChannelConfig {
  chat_id: string;
  bot_username: string;
  destination_label: string;
}

export interface NotificationChannelDocument {
  _id?: ObjectId;
  adapter_type: NotificationAdapterType;
  name: string;
  enabled: boolean;
  config: TelegramChannelConfig;
  credentials: EncryptedCredential;
  last_tested_at: string;
  last_test_status: "success" | "failed";
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationChannelDto {
  id: string;
  adapter_type: NotificationAdapterType;
  name: string;
  enabled: boolean;
  config: {
    bot_username: string;
    destination_label: string;
    chat_id_hint: string;
  };
  has_credentials: true;
  last_tested_at: string;
  last_test_status: "success" | "failed";
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export type NotificationDeliveryStatus =
  | "pending"
  | "processing"
  | "sent"
  | "failed"
  | "dead_letter";

export interface NotificationDeliveryDocument {
  _id?: ObjectId;
  dedupe_key: string;
  channel_id: ObjectId;
  channel_snapshot: {
    name: string;
    adapter_type: NotificationAdapterType;
  };
  source: NotificationCandidate["source"];
  scheduled_date: string;
  offset_days: number;
  message_snapshot: NotificationMessage;
  status: NotificationDeliveryStatus;
  attempt_count: number;
  next_attempt_at?: string;
  lease_expires_at?: string;
  external_message_id?: string;
  sent_at?: string;
  last_error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  created_at: string;
  updated_at: string;
  expire_at: Date;
}

export interface NotificationDeliveryDto {
  id: string;
  channel: {
    id: string;
    name: string;
    adapter_type: NotificationAdapterType;
  };
  source: NotificationCandidate["source"];
  scheduled_date: string;
  offset_days: number;
  message: {
    title: string;
    url?: string;
  };
  status: NotificationDeliveryStatus;
  attempt_count: number;
  next_attempt_at?: string;
  sent_at?: string;
  last_error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface NotificationDispatchSummary {
  sources_scanned: number;
  candidates_discovered: number;
  deliveries_created: number;
  deliveries_deduplicated: number;
  deliveries_sent: number;
  deliveries_failed: number;
  deliveries_dead_lettered: number;
  items_skipped: number;
}

export const ZERO_NOTIFICATION_DISPATCH_SUMMARY: NotificationDispatchSummary = {
  sources_scanned: 0,
  candidates_discovered: 0,
  deliveries_created: 0,
  deliveries_deduplicated: 0,
  deliveries_sent: 0,
  deliveries_failed: 0,
  deliveries_dead_lettered: 0,
  items_skipped: 0,
};

export interface NotificationOverview {
  settings: NotificationSettings;
  encryption_ready: boolean;
  encryption_key_source?: "environment" | "database" | null;
  channels: NotificationChannelDto[];
  sources: NotificationSourceActivationSummary[];
  delivery_counts: {
    sent: number;
    failed: number;
    dead_letter: number;
  };
  last_success_at?: string;
  last_failure_at?: string;
  recent_deliveries: NotificationDeliveryDto[];
}
