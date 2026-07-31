import { describe, expect, it } from "vitest";

import { buildDeliveryDedupeKey } from "../delivery-key";

describe("buildDeliveryDedupeKey", () => {
  it("builds deterministic SHA-256 keys from canonical delivery identity", () => {
    const parts = {
      module_type: "recurring_expense",
      document_id: "64f0f0f0f0f0f0f0f0f0f0f0",
      event: "renewal",
      event_date: "2026-07-31",
      offset_days: 1,
      channel_id: "64f0f0f0f0f0f0f0f0f0f0f1",
    };

    expect(buildDeliveryDedupeKey(parts)).toBe(buildDeliveryDedupeKey(parts));
    expect(buildDeliveryDedupeKey(parts)).toHaveLength(64);
  });

  it("creates a different key per channel", () => {
    const base = {
      module_type: "recurring_expense",
      document_id: "64f0f0f0f0f0f0f0f0f0f0f0",
      event: "renewal",
      event_date: "2026-07-31",
      offset_days: 1,
    };

    expect(
      buildDeliveryDedupeKey({
        ...base,
        channel_id: "64f0f0f0f0f0f0f0f0f0f0f1",
      }),
    ).not.toBe(
      buildDeliveryDedupeKey({
        ...base,
        channel_id: "64f0f0f0f0f0f0f0f0f0f0f2",
      }),
    );
  });
});
