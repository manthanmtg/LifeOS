/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signToken, verifyToken } from '../auth';

describe('auth utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, JWT_SECRET: 'test-secret-key-at-least-32-chars-long' };
  });

  it('should sign and verify a token successfully', async () => {
    const payload = { userId: '123', role: 'admin' };
    const token = await signToken(payload);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const verifiedPayload = await verifyToken(token);
    expect(verifiedPayload).toMatchObject(payload);
    expect(verifiedPayload?.iss).toBe('lifeos');
    expect(verifiedPayload?.aud).toBe('lifeos-app');
    expect(verifiedPayload?.sub).toBe('admin');
  });

  it('should return null for an invalid token', async () => {
    const invalidToken = 'not.a.valid.token';
    const verifiedPayload = await verifyToken(invalidToken);
    expect(verifiedPayload).toBeNull();
  });

  it('should return null for a token signed with a different secret', async () => {
    const payload = { userId: '123' };
    const token = await signToken(payload);

    // Change secret
    process.env.JWT_SECRET = 'different-secret-key-very-long-and-secure';
    
    const verifiedPayload = await verifyToken(token);
    expect(verifiedPayload).toBeNull();
  });

  it('should throw an error if JWT_SECRET is missing during signing', async () => {
    delete process.env.JWT_SECRET;
    
    await expect(signToken({ foo: 'bar' })).rejects.toThrow('Missing JWT_SECRET environment variable');
  });

  it('should return null if JWT_SECRET is missing during verification', async () => {
    const token = await signToken({ foo: 'bar' });
    delete process.env.JWT_SECRET;
    
    // In current implementation, getSecretKey throws if secret is missing.
    // verifyToken catches all errors and returns null.
    const verifiedPayload = await verifyToken(token);
    expect(verifiedPayload).toBeNull();
  });
});
