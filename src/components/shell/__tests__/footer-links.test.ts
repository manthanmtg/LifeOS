import { describe, expect, it } from "vitest";
import { getRenderableSocialLinks } from "@/components/shell/footer-links";

describe("getRenderableSocialLinks", () => {
  it("keeps only links with both platform and url", () => {
    expect(
      getRenderableSocialLinks([
        { platform: "github", url: "https://github.com" },
        { platform: "", url: "https://example.com" },
        { platform: "twitter", url: "" },
      ]),
    ).toEqual([{ platform: "github", url: "https://github.com" }]);
  });

  it("filters out multiple invalid links while preserving valid ones", () => {
    expect(
      getRenderableSocialLinks([
        { platform: "", url: "" },
        { platform: "linkedin", url: "https://linkedin.com" },
        { platform: "", url: "" },
        { platform: "mastodon", url: "https://mastodon.social" },
      ]),
    ).toEqual([
      { platform: "linkedin", url: "https://linkedin.com" },
      { platform: "mastodon", url: "https://mastodon.social" },
    ]);
  });

  it("returns an empty array when all links are incomplete", () => {
    expect(
      getRenderableSocialLinks([
        { platform: "", url: "https://example.com" },
        { platform: "twitter", url: "" },
      ]),
    ).toEqual([]);
  });

  it("returns the original list unchanged when all links are valid", () => {
    const links = [
      { platform: "github", url: "https://github.com" },
      { platform: "x", url: "https://x.com" },
    ];

    expect(getRenderableSocialLinks(links)).toEqual(links);
  });

  it("supports links with whitespace-only platform or URL as valid values", () => {
    expect(
      getRenderableSocialLinks([
        { platform: "   ", url: "   " },
        { platform: "github", url: "https://github.com" },
      ]),
    ).toEqual([
      { platform: "   ", url: "   " },
      { platform: "github", url: "https://github.com" },
    ]);
  });

  it("does not mutate the provided array", () => {
    const links = [
      { platform: "", url: "https://example.com" },
      { platform: "github", url: "https://github.com" },
    ];
    const copy = [...links];

    const result = getRenderableSocialLinks(links);

    expect(links).toEqual(copy);
    expect(result).toEqual([{ platform: "github", url: "https://github.com" }]);
  });
});
