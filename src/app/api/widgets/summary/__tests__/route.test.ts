/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
  let mockSort: any;
  let mockCountDocuments: any;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T12:00:00.000Z"));
    vi.clearAllMocks();
    mockFind = vi.fn().mockReturnThis();
    mockSort = vi.fn().mockReturnThis();
    mockCountDocuments = vi.fn().mockResolvedValue(0);
    mockCollection = vi.fn().mockReturnValue({
      find: mockFind,
      sort: mockSort,
      countDocuments: mockCountDocuments,
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

  afterEach(() => {
    vi.useRealTimers();
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

  it("returns summary for compass_task module", async () => {
    mockCollection().toArray.mockResolvedValue([
      { payload: { status: "in_progress", priority: "p1" } },
      { payload: { status: "in_progress", priority: "p2" } },
      { payload: { status: "review", priority: "p1" } },
      { payload: { status: "done", priority: "p1" } },
    ]);

    const request = createRequest(
      "http://localhost/api/widgets/summary?module_type=compass_task",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data).toEqual({
      total: 4,
      inProgressCount: 2,
      criticalCount: 1,
      reviewCount: 1,
    });
  });

  it("returns summary for maintenance_task module", async () => {
    mockCollection().toArray.mockResolvedValue([
      {
        payload: {
          status: "pending",
          next_due: "2026-04-10T00:00:00.000Z",
          history: [{ completed_at: "2026-04-02T10:00:00.000Z" }],
        },
      },
      {
        payload: {
          status: "in_progress",
          next_due: "2026-05-05T00:00:00.000Z",
          history: [{ completed_at: "2026-03-20T10:00:00.000Z" }],
        },
      },
      {
        payload: {
          status: "completed",
          next_due: "2026-04-01T00:00:00.000Z",
          history: [{ completed_at: "2026-04-15T10:00:00.000Z" }],
        },
      },
    ]);
    const request = createRequest(
      "http://localhost/api/widgets/summary?module_type=maintenance_task",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.total).toBe(3);
    expect(data.overdue).toBe(1);
    expect(data.upcoming).toBe(1);
    expect(data.completedThisMonth).toBe(2);
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

  it("returns summary for habit module", async () => {
    mockCollection().toArray.mockResolvedValue([
      {
        payload: {
          name: "Read",
          frequency: "daily",
          target_count: 1,
          color: "#10b981",
          completions: [
            { date: "2026-04-22", count: 1 },
            { date: "2026-04-23", count: 1 },
          ],
        },
      },
      {
        payload: {
          name: "Exercise",
          frequency: "daily",
          target_count: 1,
          color: "#3b82f6",
          completions: [{ date: "2026-04-21", count: 1 }],
        },
      },
    ]);

    const request = createRequest(
      "http://localhost/api/widgets/summary?module_type=habit",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data).toMatchObject({
      totalHabits: 2,
      completedToday: 1,
      bestCurrentStreak: 2,
      weeklyCompletionRate: 21,
      weeklyTrend: 100,
    });
    expect(data.last7Days).toEqual([0, 0, 0, 0, 50, 50, 50]);
  });

  it("returns compact summary for reading_item module", async () => {
    mockCollection().toArray.mockResolvedValue([
      {
        payload: {
          title: "Priority article",
          type: "article",
          priority: "high",
          is_read: false,
        },
      },
      {
        payload: {
          title: "Queued paper",
          type: "paper",
          priority: "medium",
          is_read: false,
        },
      },
      {
        payload: {
          title: "Finished video",
          type: "video",
          priority: "low",
          is_read: true,
        },
      },
    ]);

    const request = createRequest(
      "http://localhost/api/widgets/summary?module_type=reading_item",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data).toEqual({
      unreadCount: 2,
      readCount: 1,
      highPriorityCount: 1,
      typeCount: 3,
      topPriority: { title: "Priority article" },
    });
  });

  it("returns projected summary for snippet module", async () => {
    mockCollection().toArray.mockResolvedValue([
      { payload: { is_favorite: true, language: "typescript" } },
      { payload: { is_favorite: false, language: "typescript" } },
      { payload: { is_favorite: true, language: "bash" } },
    ]);

    const request = createRequest(
      "http://localhost/api/widgets/summary?module_type=snippet",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data).toEqual({
      total: 3,
      favorites: 2,
      languageCount: 2,
    });
    expect(mockFind).toHaveBeenCalledWith(
      { module_type: "snippet" },
      { projection: { "payload.is_favorite": 1, "payload.language": 1 } },
    );
  });

  it("returns compact summary for binge_item module", async () => {
    mockCollection().toArray.mockResolvedValue([
      {
        payload: {
          title: "Severance",
          status: "watching",
          rating: 5,
          current_season: 2,
          current_episode: 3,
        },
      },
      {
        payload: {
          title: "Planet Earth",
          status: "completed",
          rating: 4,
        },
      },
      {
        payload: {
          title: "Queued Film",
          status: "to_watch",
        },
      },
    ]);

    const request = createRequest(
      "http://localhost/api/widgets/summary?module_type=binge_item",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data).toEqual({
      total: 3,
      watchingCount: 1,
      avgRating: 4.5,
      latest: {
        title: "Severance",
        current_season: 2,
        current_episode: 3,
      },
    });
    expect(mockFind).toHaveBeenCalledWith(
      { module_type: "binge_item" },
      {
        projection: {
          "payload.title": 1,
          "payload.status": 1,
          "payload.rating": 1,
          "payload.current_season": 1,
          "payload.current_episode": 1,
        },
      },
    );
    expect(mockSort).toHaveBeenCalledWith({ created_at: -1 });
  });

  it("returns summary for bill module", async () => {
    const mockBills = [
      {
        payload: { attachments: [{}, {}] },
        created_at: new Date().toISOString(),
      },
    ];

    mockCollection().toArray.mockResolvedValueOnce(mockBills);
    mockCountDocuments.mockResolvedValueOnce(1);

    const request = createRequest(
      "http://localhost/api/widgets/summary?module_type=bill",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.total).toBe(1);
    expect(data.folderCount).toBe(1);
    expect(data.totalAttachments).toBe(2);
    expect(mockCountDocuments).toHaveBeenCalledWith({
      module_type: "bill_folder",
    });
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

  it("returns request-weighted summary for ai_usage module", async () => {
    mockCollection().toArray.mockResolvedValue([
      {
        payload: {
          provider: "openai",
          input_tokens: 100,
          output_tokens: 50,
          num_requests: 4,
          cost: 1.5,
          date: "2026-04-12T00:00:00.000Z",
        },
      },
      {
        payload: {
          provider: "anthropic",
          input_tokens: 200,
          output_tokens: 25,
          num_requests: 2,
          cost: 0.5,
          date: "2026-04-20T00:00:00.000Z",
        },
      },
      {
        payload: {
          provider: "anthropic",
          input_tokens: 50,
          output_tokens: 10,
          num_requests: 7,
          cost: 4,
          date: "2026-03-18T00:00:00.000Z",
        },
      },
    ]);

    const request = createRequest(
      "http://localhost/api/widgets/summary?module_type=ai_usage",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data).toEqual({
      totalCount: 3,
      totalThisMonth: 2,
      trend: -50,
      topProvider: ["openai", 4],
      totalTokens: 375,
      thisMonthLength: 6,
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

  it("returns summary for deck module and includes public content", async () => {
    const mockDecks = [
      {
        created_at: "2026-05-10T10:00:00.000Z",
        is_public: true,
        payload: {
          title: "Public Deck",
          visibility: "public",
          format: "pdf",
          topic: "Tech",
        },
      },
      {
        created_at: "2026-05-11T10:00:00.000Z",
        is_public: false,
        payload: {
          title: "Private Deck",
          visibility: "private",
          format: "html",
          topic: "Personal",
        },
      },
    ];
    mockCollection().toArray.mockResolvedValue(mockDecks);

    const request = createRequest(
      "http://localhost/api/widgets/summary?module_type=deck",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.total).toBe(2);
    expect(data.publicDecks).toBe(1);
    expect(data.latest.payload.title).toBe("Private Deck");
    expect(mockFind).toHaveBeenCalledWith({ module_type: "deck" }, expect.any(Object));
  });

  it("returns summary for blog_post module and includes public content", async () => {
    const mockPosts = [
      {
        created_at: "2026-05-10T10:00:00.000Z",
        is_public: true,
        payload: {
          title: "Public Post",
          status: "published",
          content: "Hello world",
        },
      },
      {
        created_at: "2026-05-11T10:00:00.000Z",
        is_public: false,
        payload: {
          title: "Draft Post",
          status: "draft",
          content: "Coming soon",
        },
      },
    ];
    mockCollection().toArray.mockResolvedValue(mockPosts);

    const request = createRequest(
      "http://localhost/api/widgets/summary?module_type=blog_post",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.total).toBe(2);
    expect(data.published).toBe(1);
    expect(mockFind).toHaveBeenCalledWith(
      { module_type: "blog_post" },
      expect.any(Object),
    );
  });

  it("returns 500 if database fails", async () => {
    vi.mocked(getDb).mockRejectedValue(new Error("DB Connection failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = createRequest(
      "http://localhost/api/widgets/summary?module_type=todo",
    );
    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to fetch widget summary");
    consoleSpy.mockRestore();
  });
});
