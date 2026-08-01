import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationSettingsTab } from "../NotificationSettingsTab";

const overview = {
  settings: {
    enabled: false,
    timezone: "UTC",
    deliveryHour: 9,
    catchUpHours: 36,
  },
  encryption_ready: false,
  channels: [],
  sources: [
    {
      module_type: "recurring_expense",
      label: "Recurring Expenses",
      eligible_count: 12,
      explicit_count: 3,
      inherited_count: 9,
    },
  ],
  delivery_counts: { sent: 0, failed: 0, dead_letter: 0 },
  recent_deliveries: [],
};

const response = (data: unknown, ok = true, status = 200) =>
  ({
    ok,
    status,
    json: () => Promise.resolve(data),
  }) as Response;

describe("NotificationSettingsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue(response({ data: overview }));
  });

  it("shows encryption guidance and recurring activation preview", async () => {
    render(<NotificationSettingsTab />);

    expect(
      await screen.findByText(/NOTIFICATION_ENCRYPTION_KEY/i),
    ).toBeVisible();
    expect(screen.getByText(/9 inherited/i)).toBeVisible();
  });

  it("sets up persisted encryption from the warning state", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(response({ data: overview }))
      .mockResolvedValueOnce(
        response({
          data: {
            encryption_ready: true,
            generated: true,
            source: "database",
          },
        }),
      )
      .mockResolvedValueOnce(
        response({ data: { ...overview, encryption_ready: true } }),
      );

    render(<NotificationSettingsTab />);

    fireEvent.click(
      await screen.findByRole("button", { name: /set up encryption/i }),
    );

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/notifications/encryption-key",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(await screen.findByLabelText(/connection name/i)).toBeEnabled();
  });

  it("connects Telegram and clears the token field after success", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        response({ data: { ...overview, encryption_ready: true } }),
      )
      .mockResolvedValueOnce(
        response({
          data: {
            id: "channel-id",
            adapter_type: "telegram",
            name: "Personal",
            enabled: true,
            config: {
              bot_username: "lifeos_bot",
              destination_label: "Chat ****7890",
              chat_id_hint: "****7890",
            },
            has_credentials: true,
            last_tested_at: "2026-07-31T00:00:00.000Z",
            last_test_status: "success",
            created_at: "2026-07-31T00:00:00.000Z",
            updated_at: "2026-07-31T00:00:00.000Z",
          },
        }),
      )
      .mockResolvedValueOnce(
        response({
          data: {
            ...overview,
            encryption_ready: true,
            channels: [
              {
                id: "channel-id",
                adapter_type: "telegram",
                name: "Personal",
                enabled: true,
                config: {
                  bot_username: "lifeos_bot",
                  destination_label: "Chat ****7890",
                  chat_id_hint: "****7890",
                },
                has_credentials: true,
                last_tested_at: "2026-07-31T00:00:00.000Z",
                last_test_status: "success",
                created_at: "2026-07-31T00:00:00.000Z",
                updated_at: "2026-07-31T00:00:00.000Z",
              },
            ],
          },
        }),
      );

    render(<NotificationSettingsTab />);

    fireEvent.change(await screen.findByLabelText(/connection name/i), {
      target: { value: "Personal" },
    });
    const token = screen.getByLabelText(/bot token/i);
    fireEvent.change(token, { target: { value: "123456:secret" } });
    fireEvent.change(screen.getByLabelText(/chat id/i), {
      target: { value: "-1001234567890" },
    });
    fireEvent.click(screen.getByRole("button", { name: /connect telegram/i }));

    await waitFor(() => expect(token).toHaveValue(""));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/notifications/channels",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
