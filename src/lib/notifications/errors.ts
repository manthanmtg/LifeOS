export class NotificationError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfterSeconds?: number;

  constructor(
    code: string,
    message: string,
    options?: { retryable?: boolean; retryAfterSeconds?: number },
  ) {
    super(message);
    this.name = "NotificationError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

export function toNotificationError(error: unknown): NotificationError {
  if (error instanceof NotificationError) return error;
  if (error instanceof Error) {
    return new NotificationError("unknown_error", error.message, {
      retryable: false,
    });
  }
  return new NotificationError("unknown_error", "Unknown notification error", {
    retryable: false,
  });
}

export function sanitizeErrorMessage(message: string): string {
  return message.replace(/bot\d+:[A-Za-z0-9_-]+/g, "bot[redacted]");
}
