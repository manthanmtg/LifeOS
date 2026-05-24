/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/lib/mongodb";

describe("GET /api/portfolio/resume", () => {
  let mockFindOne: any;
  let mockCollection: any;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOne = vi.fn();
    mockCollection = vi.fn().mockReturnValue({ findOne: mockFindOne });
    mockDb = { collection: mockCollection };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);
  });

  it("returns 200 and the resume buffer for the happy path", async () => {
    const mockResume = {
      module_type: "portfolio_resume",
      payload: {
        is_active: true,
        content: "data:application/pdf;base64,SGVsbG8gV29ybGQ=", // "Hello World" in base64
      },
    };
    const mockProfile = {
      module_type: "portfolio_profile",
      payload: {
        full_name: "John Doe",
      },
    };

    mockFindOne
      .mockResolvedValueOnce(mockResume) // First call for resume
      .mockResolvedValueOnce(mockProfile); // Second call for profile

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toBe(
      'inline; filename="john_doe_resume.pdf"',
    );
    expect(mockFindOne).toHaveBeenNthCalledWith(
      2,
      {
        module_type: "portfolio_profile",
        is_public: true,
      },
      { projection: { "payload.full_name": 1 } },
    );

    const buffer = await response.arrayBuffer();
    expect(Buffer.from(buffer).toString()).toBe("Hello World");
  });

  it("returns 404 if active resume is not found", async () => {
    mockFindOne.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(404);
    const text = await response.text();
    expect(text).toBe("Active resume not found");
  });

  it("only looks up active resumes marked public", async () => {
    mockFindOne.mockResolvedValue(null);

    await GET();

    expect(mockFindOne).toHaveBeenCalledWith(
      {
        module_type: "portfolio_resume",
        "payload.is_active": true,
        is_public: true,
      },
      { projection: { "payload.content": 1, "payload.filename": 1 } },
    );
  });

  it("returns 404 if resume content is missing", async () => {
    const mockResume = {
      module_type: "portfolio_resume",
      payload: {
        is_active: true,
        content: "",
      },
    };
    mockFindOne.mockResolvedValue(mockResume);

    const response = await GET();

    expect(response.status).toBe(404);
    const text = await response.text();
    expect(text).toBe("Resume content missing");
  });

  it("uses default filename if profile is not found", async () => {
    const mockResume = {
      module_type: "portfolio_resume",
      payload: {
        is_active: true,
        content: "data:application/pdf;base64,SGVsbG8gV29ybGQ=",
      },
    };
    mockFindOne.mockResolvedValueOnce(mockResume).mockResolvedValueOnce(null); // Profile not found

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toBe(
      'inline; filename="resume.pdf"',
    );
  });

  it("uses filename from resume payload if profile is not found but filename exists in resume", async () => {
    const mockResume = {
      module_type: "portfolio_resume",
      payload: {
        is_active: true,
        content: "data:application/pdf;base64,SGVsbG8gV29ybGQ=",
        filename: "custom_resume.pdf",
      },
    };
    mockFindOne.mockResolvedValueOnce(mockResume).mockResolvedValueOnce(null); // Profile not found

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toBe(
      'inline; filename="custom_resume.pdf"',
    );
  });

  it("sanitizes the fallback resume filename before writing response headers", async () => {
    const mockResume = {
      module_type: "portfolio_resume",
      payload: {
        is_active: true,
        content: "data:application/pdf;base64,SGVsbG8gV29ybGQ=",
        filename: 'custom"\r\nX-Injected: yes.pdf',
      },
    };
    mockFindOne.mockResolvedValueOnce(mockResume).mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toBe(
      'inline; filename="custom_x-injected_yes.pdf"',
    );
  });

  it("returns 500 if resume content is invalid (missing comma)", async () => {
    const mockResume = {
      module_type: "portfolio_resume",
      payload: {
        is_active: true,
        content: "SGVsbG8gV29ybGQ=", // No "data:...," prefix
      },
    };
    mockFindOne.mockResolvedValue(mockResume);

    const response = await GET();

    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toBe("Invalid resume content");
  });

  it("returns 500 if database operation fails", async () => {
    mockFindOne.mockRejectedValue(new Error("DB error"));

    const response = await GET();

    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toBe("Internal Server Error");
  });
});
