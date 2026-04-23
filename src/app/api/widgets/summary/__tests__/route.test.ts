/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { getDb } from "@/lib/mongodb";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/modules/ideas/insights", () => ({
  getIdeaMetrics: vi.fn(() => ({
    total: 10,
    promoted: 2,
    exploring: 3,
    reviewCount: 1,
  })),
  getIdeaSpotlight: vi.fn(() => ({
    payload: { title: "Test Idea", status: "exploring" },
  })),
}));

vi.mock("@/modules/people/insights", () => ({
  getPeopleSummary: vi.fn(() => ({ total: 5 })),
  toPersonDocument: vi.fn((doc) => doc),
}));

function createRequest(url: string) {
  return new Request(url, {
    method: "GET",
  });
}

describe("GET /api/widgets/summary", () => {
  let mockCollection: any;
  let mockDb: any;
  let mockFind: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFind = vi.fn().mockReturnThis();
    mockCollection = vi.fn().mockReturnValue({
      find: mockFind,
      toArray: vi.fn().mockResolvedValue([]),
    });
    mockDb = { collection: mockCollection };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    // Default mock for cookies and auth
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "valid-token" }),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue({ userId: "admin" } as any);
  });

  it("returns 400 if module_type is missing", async () => {
    const request = createRequest("http://localhost/api/widgets/summary");
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("module_type is required");
  });

  it("returns 401 if unauthorized", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);

    const request = createRequest(
      "http://localhost/api/widgets/summary?module_type=todo",
    );
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("returns summary for todo module", async () => {
    const mockTodos = [
      {
        _id: "1",
        payload: { title: "Todo 1", completed: false },
        created_at: new Date().toISOString(),
      },
      {
        _id: "2",
        payload: {
          title: "Todo 2",
          completed: true,
          completed_at: new Date().toISOString(),
        },
      },
    ];
    mockCollection().toArray.mockResolvedValue(mockTodos);

    const request = createRequest(
      "http://localhost/api/widgets/summary?module_type=todo",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.activeCount).toBe(1);
    expect(data.doneCount).toBe(1);
    expect(data.topActive).toHaveLength(1);
    expect(data.topActive[0].title).toBe("Todo 1");
  });

  it("returns summary for rain_entry module", async () => {
    const mockEntries = [
      { payload: { date: new Date().toISOString(), rainfall_amount: 10 } },
      { payload: { date: new Date().toISOString(), rainfall_amount: 5 } },
    ];
    mockCollection().toArray.mockResolvedValue(mockEntries);

    const request = createRequest(
      "http://localhost/api/widgets/summary?module_type=rain_entry",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.totalMm).toBe(15);
    expect(data.rainyDays).toBe(1);
  });

  it("returns summary for bill module", async () => {
    const mockBills = [
      {
        payload: { attachments: [{}, {}] },
        created_at: new Date().toISOString(),
      },
    ];
    const mockFolders = [{ _id: "f1" }];

    mockCollection()
      .toArray.mockResolvedValueOnce(mockBills) // for bills
      .mockResolvedValueOnce(mockFolders); // for bill_folders

    const request = createRequest(
      "http://localhost/api/widgets/summary?module_type=bill",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.total).toBe(1);
    expect(data.folderCount).toBe(1);
    expect(data.totalAttachments).toBe(2);
  });

  it("returns summary for book module", async () => {
    const mockBooks = [
      {
        created_at: "2026-01-01T00:00:00.000Z",
        payload: {
          title: "Current Book",
          author: "Ada",
          status: "reading",
          current_page: 50,
          total_pages: 200,
        },
      },
      {
        created_at: "2025-01-01T00:00:00.000Z",
        payload: {
          title: "Done Book",
          author: "Grace",
          status: "completed",
          total_pages: 300,
          rating: 4,
        },
      },
      {
        created_at: "2025-02-01T00:00:00.000Z",
        payload: {
          title: "Rated Book",
          author: "Linus",
          status: "completed",
          total_pages: 250,
          rating: 5,
        },
      },
    ];
    mockCollection().toArray.mockResolvedValue(mockBooks);

    const request = createRequest(
      "http://localhost/api/widgets/summary?module_type=book",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.total).toBe(3);
    expect(data.completedCount).toBe(2);
    expect(data.pagesRead).toBe(550);
    expect(data.avgRating).toBe(4.5);
    expect(data.current).toEqual({
      title: "Current Book",
      author: "Ada",
      progress: 25,
    });
  });

  it("returns basic summary for unknown module type", async () => {
    mockCollection().toArray.mockResolvedValue([{ _id: "1" }, { _id: "2" }]);

    const request = createRequest(
      "http://localhost/api/widgets/summary?module_type=unknown",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.total).toBe(2);
  });

  it("returns 500 if database fails", async () => {
    vi.mocked(getDb).mockRejectedValue(new Error("DB Connection failed"));

    const request = createRequest(
      "http://localhost/api/widgets/summary?module_type=todo",
    );
    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to fetch widget summary");
  });
});
