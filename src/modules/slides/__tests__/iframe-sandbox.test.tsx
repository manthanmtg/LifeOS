import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeckPreview } from "../DeckPreview";
import { SlideViewer } from "../Viewer";
import type { DeckItem } from "../types";

const uploadedHtmlDeck: DeckItem = {
  _id: "uploaded-html-deck",
  created_at: "2026-08-28T00:00:00.000Z",
  is_public: false,
  payload: {
    title: "Uploaded HTML deck",
    format: "html",
    visibility: "private",
    tags: [],
    deck_url: "data:text/html;base64,PGgxPkhlbGxvPC9oMT4=",
    embed_enabled: false,
  },
};

const externalDeck: DeckItem = {
  ...uploadedHtmlDeck,
  _id: "external-deck",
  payload: {
    ...uploadedHtmlDeck.payload,
    title: "External deck",
    format: "google_slides",
    deck_url: "https://docs.google.com/presentation/d/example/embed",
  },
};

describe("slide iframe isolation", () => {
  it("renders uploaded HTML previews in an inert sandbox", () => {
    render(<DeckPreview deck={uploadedHtmlDeck} />);

    expect(screen.getByTitle("Preview for Uploaded HTML deck")).toHaveAttribute(
      "sandbox",
      "",
    );
  });

  it("preserves external preview capabilities", () => {
    render(<DeckPreview deck={externalDeck} />);

    expect(screen.getByTitle("Preview for External deck")).not.toHaveAttribute(
      "sandbox",
    );
  });

  it("keeps uploaded HTML opaque while allowing its presentation scripts", () => {
    render(
      <SlideViewer
        decks={[uploadedHtmlDeck]}
        startIndex={0}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByTitle("Uploaded HTML deck")).toHaveAttribute(
      "sandbox",
      "allow-scripts",
    );
  });
});
