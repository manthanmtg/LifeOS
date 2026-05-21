import { describe, expect, it, vi } from "vitest";

import type { DeckItem } from "../types";
import { getIframeSrc } from "../utils";

const buildDeckItem = (payload: Partial<DeckItem["payload"]>): DeckItem => {
  return {
    _id: "deck-1",
    created_at: "2026-05-20T00:00:00.000Z",
    is_public: true,
    payload: {
      title: "sample deck",
      format: "url",
      visibility: "public",
      tags: [],
      embed_enabled: false,
      ...payload,
    },
  };
};

describe("slides/utils", () => {
  it("returns null when deck_url is missing", () => {
    const deck = buildDeckItem({
      deck_url: undefined,
    });

    expect(getIframeSrc(deck)).toBeNull();
  });

  it("returns a plain src for non-html deck URLs", () => {
    const deck = buildDeckItem({
      format: "pdf",
      deck_url: "https://example.com/presentation.pdf",
    });

    expect(getIframeSrc(deck)).toEqual({
      type: "src",
      value: "https://example.com/presentation.pdf",
    });
  });

  it("returns a plain src for html format with a non-data URL", () => {
    const deck = buildDeckItem({
      format: "html",
      deck_url: "https://example.com/presentation.html",
    });

    expect(getIframeSrc(deck)).toEqual({
      type: "src",
      value: "https://example.com/presentation.html",
    });
  });

  it("decodes a data URL html payload to srcDoc", () => {
    const html = "<h1>Slides Preview</h1>";
    const base64Html = btoa(unescape(encodeURIComponent(html)));
    const deck = buildDeckItem({
      format: "html",
      deck_url: `data:text/html;base64,${base64Html}`,
    });

    expect(getIframeSrc(deck)).toEqual({
      type: "srcDoc",
      value: html,
    });
  });

  it("decodes non-ascii html safely in data URL form", () => {
    const html = "<p>unicode: café 世界</p>";
    const base64Html = btoa(unescape(encodeURIComponent(html)));
    const deck = buildDeckItem({
      format: "html",
      deck_url: `data:text/html;base64,${base64Html}`,
    });

    expect(getIframeSrc(deck)).toEqual({
      type: "srcDoc",
      value: html,
    });
  });

  it("returns null and logs when data URL decode fails", () => {
    const deck = buildDeckItem({
      format: "html",
      deck_url: "data:text/html;base64:not-valid-base64%%%",
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(getIframeSrc(deck)).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to decode base64 HTML",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it("returns srcDoc empty content for html data URLs with no payload segment", () => {
    const deck = buildDeckItem({
      format: "html",
      deck_url: "data:text/html;base64,",
    });

    expect(getIframeSrc(deck)).toEqual({
      type: "srcDoc",
      value: "",
    });
  });
});
