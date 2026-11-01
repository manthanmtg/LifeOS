// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { GET } from "../attachment/[kind]/[id]/route";
import { resolveShare } from "@/lib/expense-spaces/public-share";
vi.mock("@/lib/expense-spaces/public-share", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/lib/expense-spaces/public-share")
  >()),
  resolveShare: vi.fn(),
}));
const id = new ObjectId();
const params = {
  params: Promise.resolve({
    token: "a".repeat(43),
    kind: "document",
    id: String(id),
  }),
};
const findOne = vi.fn();
describe("shared attachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveShare).mockResolvedValue({
      db: { collection: () => ({ findOne }) },
      space: { space_key: "space-one" },
    } as never);
  });
  it("scopes a document lookup to the shared space and denies missing documents", async () => {
    findOne.mockResolvedValue(null);
    const result = await GET(new Request("http://localhost"), params);
    expect(result.status).toBe(404);
    expect(findOne.mock.calls[0][0]).toMatchObject({
      _id: id,
      module_type: "expense_space_document",
      "payload.space_key": "space-one",
    });
  });
  it("delivers attachments safely without caching", async () => {
    findOne.mockResolvedValue({
      payload: {
        filename: "report.html",
        data: Buffer.from("<script>bad()</script>").toString("base64"),
      },
    });
    const result = await GET(new Request("http://localhost"), params);
    expect(result.status).toBe(200);
    expect(result.headers.get("content-disposition")).toContain("attachment");
    expect(result.headers.get("content-type")).toBe("application/octet-stream");
    expect(result.headers.get("cache-control")).toContain("no-store");
  });
  it("allows safe PDF documents to open in the browser", async () => {
    findOne.mockResolvedValue({
      payload: {
        filename: "report.pdf",
        content_type: "application/pdf",
        data: Buffer.from("%PDF-1.4").toString("base64"),
      },
    });
    const result = await GET(new Request("http://localhost"), params);
    expect(result.headers.get("content-disposition")).toContain("inline");
    expect(result.headers.get("content-type")).toBe("application/pdf");
    expect(result.headers.get("content-security-policy")).toContain("sandbox");
  });
  it("denies downloads when the share is paused or deleted", async () => {
    vi.mocked(resolveShare).mockResolvedValue(null);
    expect((await GET(new Request("http://localhost"), params)).status).toBe(
      404,
    );
    expect(findOne).not.toHaveBeenCalled();
  });
});
