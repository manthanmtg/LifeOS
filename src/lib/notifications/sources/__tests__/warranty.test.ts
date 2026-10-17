import { describe, expect, it, vi } from "vitest";

import { warrantyNotificationSource } from "../warranty";

describe("warrantyNotificationSource", () => {
  it("creates separate expiry candidates for each covered item entry", async () => {
    const result = await warrantyNotificationSource.collectCandidates({
      db: {
        collection: vi.fn().mockReturnValue({
          find: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([
              {
                _id: "item-id",
                payload: {
                  warranty_key: "11111111-1111-4111-8111-111111111111",
                  name: "Kitchen mixer",
                  ownership_status: "owned",
                  archived: false,
                  coverages: [
                    {
                      id: "coverage-a",
                      label: "Manufacturer",
                      start_date: "2025-01-01",
                      end_date: "2026-05-01",
                      reminder_enabled: true,
                      reminder_offsets_days: [30],
                    },
                  ],
                },
              },
            ]),
          }),
        }),
      } as never,
      now: new Date("2026-04-01T03:30:00.000Z"),
      settings: {
        enabled: true,
        timezone: "Asia/Kolkata",
        deliveryHour: 9,
        catchUpHours: 36,
      },
      systemConfig: {
        _id: "global",
        site_title: "Life OS",
        active_theme: "one-dark",
        bio: "",
        moduleRegistry: {},
      },
    });

    expect(result).toMatchObject({
      items_skipped: 0,
      candidates: [
        {
          source: {
            module_type: "warranty_item",
            document_id: "11111111-1111-4111-8111-111111111111",
            event: "warranty_expiry:coverage-a",
            event_date: "2026-05-01",
          },
          scheduled_date: "2026-04-01",
          offset_days: 30,
          message: {
            title: "Kitchen mixer warranty expires in 30 days",
            url: "/admin/warranty?item=item-id",
          },
        },
      ],
    });
  });
});
