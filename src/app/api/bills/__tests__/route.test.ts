/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { getDb } from "@/lib/mongodb";

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

describe("GET /api/bills", () => {
  let mockFind: any;
  let mockSort: any;
  let mockProject: any;
  let mockToArray: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockToArray = vi.fn().mockResolvedValue([]);
    mockProject = vi.fn().mockReturnValue({ toArray: mockToArray });
    mockSort = vi.fn().mockReturnValue({
      project: mockProject,
      toArray: mockToArray,
    });
    mockFind = vi.fn().mockReturnValue({ sort: mockSort });

    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({ find: mockFind }),
    } as any);
  });

  it("omits base64 attachment data from compact bill list responses", async () => {
    await GET(new Request("http://localhost/api/bills?compact=true"));

    expect(mockFind).toHaveBeenCalledWith({ module_type: "bill" });
    expect(mockSort).toHaveBeenCalledWith({ created_at: -1 });
    expect(mockProject).toHaveBeenCalledWith({
      "payload.attachments.data": 0,
    });
    expect(mockToArray).toHaveBeenCalled();
  });

  it("keeps full bill payloads by default", async () => {
    await GET(new Request("http://localhost/api/bills"));

    expect(mockFind).toHaveBeenCalledWith({ module_type: "bill" });
    expect(mockSort).toHaveBeenCalledWith({ created_at: -1 });
    expect(mockProject).not.toHaveBeenCalled();
    expect(mockToArray).toHaveBeenCalled();
  });
});
