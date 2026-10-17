import { describe, expect, it } from "vitest";

import { WarrantyItemInputSchema, WarrantyItemSchema } from "@/lib/schemas";

describe("warranty schemas", () => {
  it("accepts a name-only item and applies private workflow defaults", () => {
    expect(
      WarrantyItemInputSchema.parse({ name: "Kitchen mixer" }),
    ).toMatchObject({
      name: "Kitchen mixer",
      category: "other",
      currency: "INR",
      ownership_status: "owned",
      coverages: [],
      service_history: [],
      linked_bill_ids: [],
    });
  });

  it("rejects a coverage that ends before it starts", () => {
    expect(
      WarrantyItemSchema.safeParse({
        warranty_key: "11111111-1111-4111-8111-111111111111",
        revision: 1,
        name: "Kitchen mixer",
        coverages: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            label: "Manufacturer",
            start_date: "2026-06-01",
            end_date: "2026-05-31",
          },
        ],
      }).success,
    ).toBe(false);
  });
});
