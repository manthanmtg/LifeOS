import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  decryptCredential,
  encryptCredential,
  isNotificationEncryptionReady,
} from "../crypto";

const VALID_KEY = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";

describe("notification credential crypto", () => {
  const originalKey = process.env.NOTIFICATION_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.NOTIFICATION_ENCRYPTION_KEY = VALID_KEY;
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.NOTIFICATION_ENCRYPTION_KEY;
    } else {
      process.env.NOTIFICATION_ENCRYPTION_KEY = originalKey;
    }
  });

  it("round-trips encrypted credentials", () => {
    const envelope = encryptCredential("telegram-token");

    expect(decryptCredential(envelope)).toBe("telegram-token");
  });

  it("uses a fresh IV for repeated encryptions", () => {
    const first = encryptCredential("telegram-token");
    const second = encryptCredential("telegram-token");

    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it("rejects tampered ciphertext", () => {
    const envelope = encryptCredential("telegram-token");

    expect(() =>
      decryptCredential({ ...envelope, ciphertext: "AAAA" }),
    ).toThrow(/decrypt/i);
  });

  it("reports missing and malformed encryption keys as not ready", () => {
    delete process.env.NOTIFICATION_ENCRYPTION_KEY;
    expect(isNotificationEncryptionReady()).toBe(false);

    process.env.NOTIFICATION_ENCRYPTION_KEY = "not-base64";
    expect(isNotificationEncryptionReady()).toBe(false);
  });

  it("uses a persisted system key when the environment key is missing", () => {
    delete process.env.NOTIFICATION_ENCRYPTION_KEY;
    const systemConfig = { notificationEncryptionKey: VALID_KEY };

    expect(isNotificationEncryptionReady(systemConfig)).toBe(true);

    const envelope = encryptCredential("telegram-token", systemConfig);

    expect(decryptCredential(envelope, systemConfig)).toBe("telegram-token");
  });

  it("falls back to a persisted system key when the environment key is malformed", () => {
    process.env.NOTIFICATION_ENCRYPTION_KEY = "not-base64";
    const systemConfig = { notificationEncryptionKey: VALID_KEY };

    expect(isNotificationEncryptionReady(systemConfig)).toBe(true);

    const envelope = encryptCredential("telegram-token", systemConfig);

    expect(decryptCredential(envelope, systemConfig)).toBe("telegram-token");
  });
});
