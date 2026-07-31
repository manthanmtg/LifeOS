import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import type { EncryptedCredential } from "./contracts";
import { NotificationError } from "./errors";

const KEY_ENV = "NOTIFICATION_ENCRYPTION_KEY";

function readEncryptionKey(): Buffer {
  const raw = process.env[KEY_ENV];
  if (!raw) {
    throw new NotificationError(
      "notification_encryption_key_missing",
      `${KEY_ENV} is required to use notification channels`,
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32 || key.toString("base64") !== raw) {
    throw new NotificationError(
      "notification_encryption_key_invalid",
      `${KEY_ENV} must be a base64-encoded 32-byte key`,
    );
  }

  return key;
}

export function isNotificationEncryptionReady(): boolean {
  try {
    readEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptCredential(plaintext: string): EncryptedCredential {
  const key = readEncryptionKey();
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

export function decryptCredential(envelope: EncryptedCredential): string {
  if (envelope.version !== 1 || envelope.algorithm !== "aes-256-gcm") {
    throw new NotificationError(
      "notification_credential_envelope_unsupported",
      "Unsupported notification credential envelope",
    );
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      readEncryptionKey(),
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
