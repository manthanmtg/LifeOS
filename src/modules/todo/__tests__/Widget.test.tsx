import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TodoWidget from "../Widget";

describe("TodoWidget", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("distinguishes an unavailable summary from an empty task list", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Service unavailable" }),
    });

    render(<TodoWidget />);

    expect(
      await screen.findByText("Unable to load task summary"),
    ).toBeInTheDocument();
    expect(screen.getByText("task summary unavailable")).toBeInTheDocument();
    expect(screen.queryByText("No tasks available")).not.toBeInTheDocument();
  });

  it("keeps the empty-task presentation for an available summary", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { activeCount: 0, doneCount: 0, topActive: [] },
        }),
    });

    render(<TodoWidget />);

    expect(await screen.findByText("No pending tasks")).toBeInTheDocument();
    expect(screen.getByText("all clear")).toBeInTheDocument();
    expect(
      screen.queryByText("Unable to load task summary"),
    ).not.toBeInTheDocument();
  });
});
