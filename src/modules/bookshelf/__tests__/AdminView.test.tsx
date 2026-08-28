import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BookshelfAdminView from "../AdminView";

const mockBook = {
  _id: "book-1",
  created_at: "2026-08-28T00:00:00.000Z",
  payload: {
    title: "The Left Hand of Darkness",
    author: "Ursula K. Le Guin",
    status: "want_to_read",
    tags: [],
  },
};

vi.mock("@/hooks/useModuleSettings", () => ({
  useModuleSettings: () => ({
    settings: { defaultStatus: "want_to_read", yearlyGoal: 0 },
    updateSettings: vi.fn(),
    saving: false,
  }),
}));

vi.mock("../components/BookshelfMetrics", () => ({
  default: () => <div data-testid="bookshelf-metrics" />,
}));

vi.mock("../components/BookshelfFilters", () => ({
  default: () => <div data-testid="bookshelf-filters" />,
}));

vi.mock("../components/BookCard", () => ({
  default: ({ book }: { book: typeof mockBook }) => (
    <div>{book.payload.title}</div>
  ),
}));

vi.mock("../components/BookSkeleton", () => ({
  default: () => <div data-testid="book-skeleton" />,
}));

describe("BookshelfAdminView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows a retryable error instead of an empty library when loading fails", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Service unavailable" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockBook] }),
      });

    render(<BookshelfAdminView />);

    expect(
      await screen.findByRole("alert", {
        name: /couldn't load your library/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No books found for current filters."),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Retry loading library" }),
    );

    expect(await screen.findByText(mockBook.payload.title)).toBeInTheDocument();
  });
});
