import { createHash, createHmac, randomBytes } from "node:crypto";

export function createShareToken(nonce: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`expense-space-share:${nonce}`)
    .digest("base64url");
}
export function hashShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
export function isShareToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
export function newShareNonce(): string {
  return randomBytes(32).toString("hex");
}
