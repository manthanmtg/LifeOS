import { NextResponse } from "next/server";

/**
 * Standard API response format for Life OS
 */
export type ApiResponse<T = unknown> = {
    success: boolean;
    data?: T;
    error?: string;
    details?: unknown;
};

/**
 * Success response helper
 */
export const ApiSuccess = <T>(data: T, status = 200) => {
    return NextResponse.json(
        { success: true, data },
        { status }
    );
};

/**
 * Error response helper
 */
export const ApiError = (message: string, status = 500, details?: unknown) => {
    return NextResponse.json(
        { success: false, error: message, details },
        { status }
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

export const ApiUnauthorized = (message = "Unauthorized") => {
    return ApiError(message, 401);
};

export const ApiForbidden = (message = "Forbidden") => {
    return ApiError(message, 403);
};
