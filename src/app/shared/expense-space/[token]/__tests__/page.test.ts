import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateMetadata } from "../page";
import { resolveShare } from "@/lib/expense-spaces/public-share";

vi.mock("@/lib/expense-spaces/public-share", () => ({ resolveShare: vi.fn() }));

describe("shared expense space metadata", () => {
  beforeEach(() => vi.resetAllMocks());

  it("uses the current name of an active space in the browser title", async () => {
    vi.mocked(resolveShare).mockResolvedValue({
      space: { name: "Home renovation" },
    } as never);
    const metadata = await generateMetadata({
      params: Promise.resolve({ token: "share-token" }),
    });
    expect(metadata.title).toBe("Home renovation");
    expect(resolveShare).toHaveBeenCalledWith("share-token");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.referrer).toBe("no-referrer");
  });

  it("keeps the title generic when a link is unavailable", async () => {
    vi.mocked(resolveShare).mockResolvedValue(null);
    const metadata = await generateMetadata({
      params: Promise.resolve({ token: "invalid" }),
    });
    expect(metadata.title).toBe("Shared expense space");
  });

  it("keeps the title generic if the share cannot be loaded", async () => {
    vi.mocked(resolveShare).mockRejectedValue(
      new Error("database unavailable"),
    );
    const metadata = await generateMetadata({
      params: Promise.resolve({ token: "valid" }),
    });
    expect(metadata.title).toBe("Shared expense space");
  });
});
