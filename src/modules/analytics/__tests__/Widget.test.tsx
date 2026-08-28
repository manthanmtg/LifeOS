import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AnalyticsWidget from "../Widget";

describe("AnalyticsWidget", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("distinguishes an unavailable summary from zero engagement", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Service unavailable" }),
    });

    render(<AnalyticsWidget />);

    expect(
      await screen.findByText("Unable to load analytics summary"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("analytics summary unavailable"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Steady as she goes")).not.toBeInTheDocument();
  });

  it("surfaces a network failure instead of zero engagement", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network unavailable"));

    render(<AnalyticsWidget />);

    expect(
      await screen.findByText("Unable to load analytics summary"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Steady as she goes")).not.toBeInTheDocument();
  });

  it("keeps a genuine zero-activity summary distinct from an unavailable one", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { todayCount: 0, yesterdayCount: 0 },
        }),
    });

    render(<AnalyticsWidget />);

    expect(await screen.findByText("Steady as she goes")).toBeInTheDocument();
    expect(screen.getByText("engagements today")).toBeInTheDocument();
    expect(
      screen.queryByText("Unable to load analytics summary"),
    ).not.toBeInTheDocument();
  });
});
