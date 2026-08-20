import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import PublicView from "../PublicView";
import type { DeckItem } from "../types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

test("renders empty state", () => {
  render(<PublicView items={[] as unknown[]} />);
  expect(screen.getByText("No decks shared yet.")).toBeInTheDocument();
});

test("renders decks grid", () => {
  const items: DeckItem[] = [
    {
      _id: "1",
      created_at: "2026-01-01",
      is_public: true,
      payload: {
        title: "Test Deck",
        format: "url",
        visibility: "public",
        tags: [],
        embed_enabled: false,
      },
    },
  ];
  render(<PublicView items={items} />);
  expect(screen.getByText("Test Deck")).toBeInTheDocument();
  expect(screen.getByText("URL")).toBeInTheDocument();
  expect(screen.getByText("Public")).toBeInTheDocument();
});

test("deck card shows thumbnail", () => {
  const items: DeckItem[] = [
    {
      _id: "1",
      created_at: "2026-01-01",
      is_public: true,
      payload: {
        title: "Test Deck",
        thumbnail_url: "test.jpg",
        format: "url",
        visibility: "public",
        tags: [],
        embed_enabled: false,
      },
    },
  ];
  render(<PublicView items={items} />);
  const img = screen.getByRole("img");
  expect(img).toHaveAttribute("src", "test.jpg");
});

test("deck cards use sibling controls instead of nested interactive roles", () => {
  const items: DeckItem[] = [
    {
      _id: "1",
      created_at: "2026-01-01",
      is_public: true,
      payload: {
        title: "Keyboard Deck",
        deck_url: "https://example.com/deck",
        format: "url",
        visibility: "public",
        tags: [],
        embed_enabled: false,
      },
    },
  ];

  render(<PublicView items={items} />);

  const article = screen.getByRole("article");
  expect(article).not.toHaveAttribute("role", "button");
  expect(
    screen.getByRole("button", { name: "Open deck Keyboard Deck" }),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Present Keyboard Deck" }),
  ).toBeVisible();
  expect(article.querySelector("button button")).toBeNull();
});
