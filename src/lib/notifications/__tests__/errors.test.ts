import { describe, expect, it } from "vitest";

import {
  NotificationError,
  sanitizeErrorMessage,
  toNotificationError,
} from "../errors";

describe("NotificationError", () => {
  it("defaults to non-retryable with no retry hint", () => {
    const error = new NotificationError("provider_rejected", "Bad request");

    expect(error.code).toBe("provider_rejected");
    expect(error.message).toBe("Bad request");
    expect(error.retryable).toBe(false);
    expect(error.retryAfterSeconds).toBeUndefined();
    expect(error.name).toBe("NotificationError");
  });

  it("accepts retryable flag and backoff hint", () => {
    const error = new NotificationError("rate_limited", "Too many requests", {
      retryable: true,
      retryAfterSeconds: 30,
    });

    expect(error.retryable).toBe(true);
    expect(error.retryAfterSeconds).toBe(30);
  });

  it("is a real Error usable in instanceof and try/catch", () => {
    const error = new NotificationError("send_failed", "Send failed");

    expect(error).toBeInstanceOf(Error);
    expect(() => {
      throw error;
    }).toThrow(NotificationError);
  });
});

describe("toNotificationError", () => {
  it("passes through an existing NotificationError untouched", () => {
    const original = new NotificationError("rate_limited", "Slow down", {
      retryable: true,
      retryAfterSeconds: 10,
    });

    expect(toNotificationError(original)).toBe(original);
  });

  it("wraps a plain Error as non-retryable unknown_error", () => {
    const wrapped = toNotificationError(new Error("ECONNRESET"));

    expect(wrapped).toBeInstanceOf(NotificationError);
    expect(wrapped.code).toBe("unknown_error");
    expect(wrapped.message).toBe("ECONNRESET");
    expect(wrapped.retryable).toBe(false);
    expect(wrapped.retryAfterSeconds).toBeUndefined();
  });

  it("normalizes non-Error thrown values into a generic message", () => {
    for (const thrown of ["boom", 42, null, undefined, { reason: "x" }]) {
      const wrapped = toNotificationError(thrown);

      expect(wrapped.code).toBe("unknown_error");
      expect(wrapped.message).toBe("Unknown notification error");
      expect(wrapped.retryable).toBe(false);
    }
  });
});

describe("sanitizeErrorMessage", () => {
  it("redacts bot tokens in 'bot<id>:<secret>' format", () => {
    const sanitized = sanitizeErrorMessage(
      "Telegram returned 401 for bot123456789:AAHdqTcvbXxO-O-qwErTyUiOp",
    );

    expect(sanitized).toBe("Telegram returned 401 for bot[redacted]");
    expect(sanitized).not.toContain("AAHdqTcvbXxO");
  });

  it("redacts every occurrence of a bot token", () => {
    const sanitized = sanitizeErrorMessage(
      "bot1:abc_-DEF failed and bot987654321:ZxYwVuTsRqOnMlKjIhGfEdCbA retried",
    );

    expect(sanitized).toBe("bot[redacted] failed and bot[redacted] retried");
  });

  it("leaves messages without bot tokens unchanged", () => {
    const message = "Delivery attempt 2 of 3 failed: connection reset";

    expect(sanitizeErrorMessage(message)).toBe(message);
  });

  it("does not redact bot-like strings missing the token separator", () => {
    const message = "bot123456789 is not a token pattern";

    expect(sanitizeErrorMessage(message)).toBe(message);
  });
});
