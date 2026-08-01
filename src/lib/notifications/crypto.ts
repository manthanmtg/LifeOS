import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import type { EncryptedCredential } from "./contracts";
import { NotificationError } from "./errors";
import type { SystemConfig } from "@/lib/types";

const KEY_ENV = "NOTIFICATION_ENCRYPTION_KEY";
type EncryptionKeySource = "environment" | "database";

function decodeEncryptionKey(raw: string, keyName: string): Buffer {
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32 || key.toString("base64") !== raw) {
    throw new NotificationError(
      "notification_encryption_key_invalid",
      `${keyName} must be a base64-encoded 32-byte key`,
    );
  }

  return key;
}

function readEncryptionKey(
  systemConfig?: Pick<SystemConfig, "notificationEncryptionKey"> | null,
): { key: Buffer; source: EncryptionKeySource } {
  const envKey = process.env[KEY_ENV];
  if (envKey) {
    try {
      return {
        key: decodeEncryptionKey(envKey, KEY_ENV),
        source: "environment",
      };
    } catch (error) {
      if (!systemConfig?.notificationEncryptionKey) throw error;
    }
  }

  if (systemConfig?.notificationEncryptionKey) {
    return {
      key: decodeEncryptionKey(
        systemConfig.notificationEncryptionKey,
        "notificationEncryptionKey",
      ),
      source: "database",
    };
  }

  throw new NotificationError(
    "notification_encryption_key_missing",
    `${KEY_ENV} is required to use notification channels`,
  );
}

export function generateNotificationEncryptionKey(): string {
  return randomBytes(32).toString("base64");
}

export function getNotificationEncryptionStatus(
  systemConfig?: Pick<SystemConfig, "notificationEncryptionKey"> | null,
): {
  ready: boolean;
  source: EncryptionKeySource | null;
} {
  try {
    const { source } = readEncryptionKey(systemConfig);
    return { ready: true, source };
  } catch {
    return { ready: false, source: null };
  }
}

export function isNotificationEncryptionReady(
  systemConfig?: Pick<SystemConfig, "notificationEncryptionKey"> | null,
): boolean {
  return getNotificationEncryptionStatus(systemConfig).ready;
}

export function encryptCredential(
  plaintext: string,
  systemConfig?: Pick<SystemConfig, "notificationEncryptionKey"> | null,
): EncryptedCredential {
  const { key } = readEncryptionKey(systemConfig);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    auth_tag: authTag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptCredential(
  envelope: EncryptedCredential,
  systemConfig?: Pick<SystemConfig, "notificationEncryptionKey"> | null,
): string {
  if (envelope.version !== 1 || envelope.algorithm !== "aes-256-gcm") {
    throw new NotificationError(
      "notification_credential_envelope_unsupported",
      "Unsupported notification credential envelope",
    );
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      readEncryptionKey(systemConfig).key,
      Buffer.from(envelope.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(envelope.auth_tag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64")),
      decipher.final(),
    ]);

    return plaintext.toString("utf8");
  } catch {
    throw new NotificationError(
      "notification_credential_decrypt_failed",
      "Failed to decrypt notification credential",
    );
  }
}
