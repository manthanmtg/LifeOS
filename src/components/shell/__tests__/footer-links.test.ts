import { describe, expect, it } from "vitest";
import { getRenderableSocialLinks } from "../footer-links";

describe("getRenderableSocialLinks", () => {
  it("returns only social links that can be rendered", () => {
    expect(
      getRenderableSocialLinks([
        { platform: "GitHub", url: "https://github.com/example" },
        { platform: "X", url: "" },
        { platform: "", url: "https://example.com" },
      ]),
    ).toEqual([{ platform: "GitHub", url: "https://github.com/example" }]);
  });
});
