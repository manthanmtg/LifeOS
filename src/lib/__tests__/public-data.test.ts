import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import {
  getPublicModuleLinks,
  serializePublicContent,
  toBlogPost,
} from "../public-data";

describe("public data helpers", () => {
  it("applies visibility and custom ordering on the server", () => {
    const links = getPublicModuleLinks({
      moduleRegistry: {
        slides: { enabled: true, isPublic: true },
        blog: { enabled: true, isPublic: true },
        ideas: { enabled: false, isPublic: true },
        expenses: { enabled: true, isPublic: false },
      },
      moduleOrder: ["blog", "slides"],
    });

    expect(links.map((link) => link.slug)).toEqual(
      expect.arrayContaining(["blog", "slides"]),
    );
    expect(links.findIndex((link) => link.slug === "blog")).toBeLessThan(
      links.findIndex((link) => link.slug === "slides"),
    );
    expect(links).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: "ideas" }),
        expect.objectContaining({ slug: "expenses" }),
      ]),
    );
  });

  it("falls back to registry defaults when no system config is available", () => {
    const links = getPublicModuleLinks(null);

    expect(links).toEqual(
      expect.arrayContaining([expect.objectContaining({ slug: "blog" })]),
    );
  });

  it("serializes Mongo ids before crossing the server component boundary", () => {
    const id = new ObjectId();
    const item = serializePublicContent({
      _id: id,
      module_type: "slides_deck",
      is_public: true,
      created_at: "2026-08-20T00:00:00.000Z",
      updated_at: "2026-08-20T00:00:00.000Z",
      payload: { title: "Demo" },
    });

    expect(item._id).toBe(id.toHexString());
  });

  it("normalizes published blog data for the interactive view", () => {
    const post = toBlogPost({
      _id: new ObjectId(),
      created_at: "2026-08-20T00:00:00.000Z",
      payload: {
        title: "Server rendering",
        slug: "server-rendering",
        content: "Body",
        status: "published",
        tags: ["Next.js"],
      },
    });

    expect(post.payload.status).toBe("published");
    expect(post.payload.tags).toEqual(["Next.js"]);
    expect(typeof post._id).toBe("string");
  });
});
