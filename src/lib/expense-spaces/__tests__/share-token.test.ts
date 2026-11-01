import { describe, expect, it } from "vitest";
import {
  createShareToken,
  createShortShareToken,
  hashShareToken,
  isShareToken,
} from "../share-token";

describe("expense space share tokens", () => {
  it("derives stable, secret-dependent, unguessable tokens and hashes them", () => {
    const nonce = "a".repeat(64);
    const token = createShareToken(nonce, "secret-one");
    expect(token).toBe(createShareToken(nonce, "secret-one"));
    expect(token).not.toBe(createShareToken(nonce, "secret-two"));
    expect(isShareToken(token)).toBe(true);
    expect(isShareToken("short")).toBe(false);
    expect(hashShareToken(token)).not.toBe(token);
    expect(hashShareToken(token)).toHaveLength(64);
  });
  it("generates six-character tokens while accepting existing links", () => {
    const nonce = "b".repeat(64);
    const token = createShortShareToken(nonce, "secret");
    expect(token).toHaveLength(6);
    expect(token).toBe(createShortShareToken(nonce, "secret"));
    expect(token).not.toBe(createShortShareToken(nonce, "other-secret"));
    expect(isShareToken(token)).toBe(true);
    expect(isShareToken(createShareToken(nonce, "secret"))).toBe(true);
    expect(isShareToken("abcd")).toBe(false);
  });
});
