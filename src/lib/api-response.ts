import { NextResponse } from "next/server";

const sanitizeDetails = (details: unknown, status: number) => {
  if (status >= 500) {
    return undefined;
  }

  if (details instanceof Error) {
    return details.message;
  }

  return details;
};

/**
 * Success response helper
 */
export const ApiSuccess = <T>(data: T, status = 200) => {
  return NextResponse.json({ success: true, data }, { status });
};

/**
 * Error response helper
 */
export const ApiError = (message: string, status = 500, details?: unknown) => {
  const safeDetails = sanitizeDetails(details, status);
  const payload = { success: false, error: message };

  return NextResponse.json(
    safeDetails === undefined ? payload : { ...payload, details: safeDetails },
    { status },
  );
};

/**
 * Specific error helpers
 */
export const ApiValidationError = (details: unknown) => {
  return ApiError("Validation failed", 400, details);
};

export const ApiNotFound = (message = "Resource not found") => {
  return ApiError(message, 404);
};
