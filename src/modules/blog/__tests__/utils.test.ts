import { describe, expect, it } from "vitest";
import type { BlogPayload, BlogPost } from "@/modules/blog/types";
import {
  buildBlogSummary,
  parseTagInput,
  sortPostsByNewest,
} from "@/modules/blog/utils";

function createPost(
  id: string,
  overrides: Omit<Partial<BlogPost>, "payload"> & {
    payload?: Partial<BlogPayload>;
  } = {},
): BlogPost {
  const payloadOverrides = overrides.payload || {};

  return {
    _id: id,
    created_at: overrides.created_at || "2026-01-01T00:00:00.000Z",
    payload: {
      title: `Post ${id}`,
      slug: `post-${id}`,
      content: "word ".repeat(220).trim(),
      status: "draft",
      tags: [],
      ...payloadOverrides,
    },
    updated_at: overrides.updated_at,
  };
}

describe("blog utils", () => {
  it("parses tag input without empty values", () => {
    expect(parseTagInput("react, nextjs, , life os")).toEqual([
      "react",
      "nextjs",
      "life os",
    ]);
  });

  it("sorts posts by published date before created date", () => {
    const posts = sortPostsByNewest([
      createPost("1", {
        created_at: "2026-01-01T00:00:00.000Z",
        payload: { published_at: "2026-01-05T00:00:00.000Z" },
      }),
      createPost("2", {
        created_at: "2026-01-10T00:00:00.000Z",
      }),
    ]);

    expect(posts.map((post) => post._id)).toEqual(["2", "1"]);
  });

  it("builds a widget summary with reading time and latest post", () => {
    const summary = buildBlogSummary([
      createPost("1", {
        payload: {
          status: "published",
          title: "Earlier",
          published_at: "2026-01-05T00:00:00.000Z",
        },
      }),
      createPost("2", {
        payload: {
          status: "published",
          title: "Latest",
          published_at: "2026-01-15T00:00:00.000Z",
          estimated_reading_time: 3,
        },
      }),
      createPost("3", {
        payload: { status: "archived" },
      }),
    ]);

    expect(summary).toMatchObject({
      total: 3,
      published: 2,
      archived: 1,
      drafts: 0,
      totalReadMinutes: 5,
      latestPublishedPost: {
        title: "Latest",
        readingTime: 3,
      },
    });
  });

});
