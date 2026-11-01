import { describe, expect, it } from "vitest";
import { createShareToken, hashShareToken, isShareToken } from "../share-token";

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
});
