import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import BlogAdminView from "../AdminView";

// Mock the nested components if necessary, but testing them integratively is often better.
// We will test integratively since the child components render standard DOM elements.

describe("BlogAdminView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    
    // Default fetch mock returning empty data
    global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL | string) => {
      const url = input.toString();
      if (url.includes("/api/content?module_type=blog_post")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        } as unknown as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as unknown as Response);
    });

    // Mock localStorage
    const localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          store[key] = value.toString();
        }),
        removeItem: vi.fn((key: string) => {
          delete store[key];
        }),
        clear: vi.fn(() => {
          store = {};
        }),
      };
    })();
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
    });
    
    // Mock window.confirm
    vi.spyOn(window, "confirm").mockImplementation(() => true);
    // Mock window.alert
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockPosts = [
    {
      _id: "post1",
      payload: {
        title: "First Post",
        slug: "first-post",
        content: "Hello world",
        status: "published",
        tags: ["tech"],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      _id: "post2",
      payload: {
        title: "Draft Post",
        slug: "draft-post",
        content: "Still working on it",
        status: "draft",
        tags: ["life"],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ];

  it("renders loading state initially and then empty state", async () => {
    render(<BlogAdminView />);
    // The AdminModuleSkeleton isn't easily selected by text, but we can wait for fetch to complete
    await waitFor(() => {
      expect(screen.queryByText(/Start with a draft and build your first post here/i)).toBeInTheDocument();
    });
  });

  it("fetches and displays blog posts", async () => {
    vi.mocked(global.fetch).mockImplementation((input: RequestInfo | URL | string) => {
      const url = input.toString();
      if (url.includes("/api/content?module_type=blog_post")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockPosts }),
        } as unknown as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as unknown as Response);
    });

    render(<BlogAdminView />);
    
    await waitFor(() => {
      expect(screen.getByText("First Post")).toBeInTheDocument();
      expect(screen.getByText("Draft Post")).toBeInTheDocument();
    });
  });

  it("shows error if fetch fails", async () => {
    // Spy on console.error to keep test output clean
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(global.fetch).mockImplementation(() => Promise.reject(new Error("Network Error")));

    render(<BlogAdminView />);
    
    await waitFor(() => {
      // It should still render the page but the grid will be empty
      expect(screen.getByText(/Start with a draft/i)).toBeInTheDocument();
    });
  });

  it("opens the editor when 'New Post' button is clicked", async () => {
    render(<BlogAdminView />);
    await waitFor(() => {
      expect(screen.queryByText(/Start with a draft/i)).toBeInTheDocument();
    });

    // Wait, BlogAdminToolbar has "New Post" button. We need to find the button.
    const newPostButton = screen.getByRole("button", { name: /new post/i });
    fireEvent.click(newPostButton);

    // Editor should be open
    expect(screen.getByPlaceholderText(/A clear, specific title/i)).toBeInTheDocument();
  });

  it("filters posts by search text", async () => {
    vi.mocked(global.fetch).mockImplementation((input: RequestInfo | URL | string) => {
      const url = input.toString();
      if (url.includes("/api/content?module_type=blog_post")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockPosts }),
        } as unknown as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as unknown as Response);
    });

    render(<BlogAdminView />);
    await waitFor(() => {
      expect(screen.getByText("First Post")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search posts/i);
    fireEvent.change(searchInput, { target: { value: "First" } });

    expect(screen.getByText("First Post")).toBeInTheDocument();
    expect(screen.queryByText("Draft Post")).not.toBeInTheDocument();
  });

  it("filters posts by status", async () => {
    vi.mocked(global.fetch).mockImplementation((input: RequestInfo | URL | string) => {
      const url = input.toString();
      if (url.includes("/api/content?module_type=blog_post")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockPosts }),
        } as unknown as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as unknown as Response);
    });

    render(<BlogAdminView />);
    await waitFor(() => {
      expect(screen.getByText("First Post")).toBeInTheDocument();
    });

    const draftFilter = screen.getByRole("button", { name: /^draft$/i });
    fireEvent.click(draftFilter);

    expect(screen.queryByText("First Post")).not.toBeInTheDocument();
    expect(screen.getByText("Draft Post")).toBeInTheDocument();
  });

  it("validates empty draft and prevents saving", async () => {
    render(<BlogAdminView />);
    await waitFor(() => {
      expect(screen.queryByText(/Start with a draft/i)).toBeInTheDocument();
    });

    const newPostButton = screen.getByRole("button", { name: /new post/i });
    fireEvent.click(newPostButton);

    const saveButton = screen.getByRole("button", { name: /Publish new post/i });
    fireEvent.click(saveButton);

    // Title is required error should show up
    await waitFor(() => {
      expect(screen.getByText(/Title is required/i)).toBeInTheDocument();
    });
  });

  it("saves a new draft successfully", async () => {
    render(<BlogAdminView />);
    await waitFor(() => {
      expect(screen.queryByText(/Start with a draft/i)).toBeInTheDocument();
    });

    const newPostButton = screen.getByRole("button", { name: /new post/i });
    fireEvent.click(newPostButton);

    const titleInput = screen.getByPlaceholderText(/A clear, specific title/i);
    fireEvent.change(titleInput, { target: { value: "My New Post" } });
    
    // Content is needed for strict validation
    const contentTextarea = screen.getByPlaceholderText(/Write your post in Markdown/i);
    fireEvent.change(contentTextarea, { target: { value: "Some content" } });

    vi.mocked(global.fetch).mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { _id: "new-id" } }),
      } as unknown as Response)
    );

    const saveButton = screen.getByRole("button", { name: /Publish new post/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/content", expect.objectContaining({
        method: "POST",
      }));
    });
  });

  it("deletes a post successfully", async () => {
    vi.mocked(global.fetch).mockImplementation((input: RequestInfo | URL | string) => {
      const url = input.toString();
      if (url.includes("/api/content?module_type=blog_post")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [mockPosts[0]] }),
        } as unknown as Response);
      }
      if (url.includes("/api/content/post1")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as unknown as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as unknown as Response);
    });

    render(<BlogAdminView />);
    
    await waitFor(() => {
      expect(screen.getByText("First Post")).toBeInTheDocument();
    });

    // The BlogPostGrid component renders a delete button (trash icon). 
    // We can find it by aria-label or title if provided, or by closest match
    // Let's assume there's a button with an aria-label "Delete" or similar
    // Since we don't have BlogPostGrid code, let's search for buttons inside the card
    const deleteButton = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/content/post1", expect.objectContaining({
        method: "DELETE",
      }));
    });
  });

  it("handles delete failure gracefully", async () => {
    vi.mocked(global.fetch).mockImplementation((input: RequestInfo | URL | string) => {
      const url = input.toString();
      if (url.includes("/api/content?module_type=blog_post")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [mockPosts[0]] }),
        } as unknown as Response);
      }
      if (url.includes("/api/content/post1")) {
        return Promise.reject(new Error("Network failure"));
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as unknown as Response);
    });

    render(<BlogAdminView />);
    
    await waitFor(() => {
      expect(screen.getByText("First Post")).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Network failure");
    });
  });
});
