import { describe, it, expect } from 'vitest';
import { ApiSuccess, ApiError, ApiValidationError, ApiNotFound, ApiUnauthorized, ApiForbidden } from '../api-response';

describe('api-response', () => {
    describe('ApiSuccess', () => {
        it('creates a success response with data', async () => {
            const data = { foo: 'bar' };
            const response = ApiSuccess(data);
            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body).toEqual({ success: true, data });
        });

        it('creates a success response with custom status', () => {
            const response = ApiSuccess({}, 201);
            expect(response.status).toBe(201);
        });
    });

    describe('ApiError', () => {
        it('creates an error response with message', async () => {
            const message = 'Internal Error';
            const response = ApiError(message);
            expect(response.status).toBe(500);
            const body = await response.json();
            expect(body).toEqual({ success: false, error: message, details: undefined });
        });

        it('creates an error response with details', async () => {
            const details = { code: 'ERR_123' };
            const response = ApiError('Error', 400, details);
            const body = await response.json();
            expect(body.details).toEqual(details);
        });
    });

    describe('Specific Error Helpers', () => {
        it('ApiValidationError returns 400', () => {
            const response = ApiValidationError({ field: 'required' });
            expect(response.status).toBe(400);
        });

        it('ApiNotFound returns 404', () => {
            const response = ApiNotFound();
            expect(response.status).toBe(404);
        });

        it('ApiUnauthorized returns 401', () => {
            const response = ApiUnauthorized();
            expect(response.status).toBe(401);
        });

        it('ApiForbidden returns 403', () => {
            const response = ApiForbidden();
            expect(response.status).toBe(403);
        });
    });
});
