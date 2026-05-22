import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TemplateAdminView from "../AdminView";

interface TemplateItem {
  _id: string;
  created_at: string;
  payload: {
    name: string;
    description?: string;
    category: string;
    is_active: boolean;
  };
}

type RequestMethod = "GET" | "POST" | "PUT" | "DELETE";

const buildTemplateItem = (id: string, name: string): TemplateItem => ({
  _id: id,
  created_at: new Date("2026-05-21T00:00:00.000Z").toISOString(),
  payload: {
    name,
    category: "General",
    is_active: true,
  },
});

const jsonResponse = (body: unknown, ok = true) => {
  const status = ok ? 200 : 500;
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
};

const createFetchMock = (
  initialItems: TemplateItem[],
  options?: {
    postShouldFail?: boolean;
    deleteShouldFail?: boolean;
  },
) => {
  let items = [...initialItems];

  return vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input.toString() : `${input}`;
    const method = ((init?.method ?? "GET").toUpperCase() as RequestMethod) || "GET";

    if (url === "/api/system") {
      return jsonResponse({ data: {} });
    }

    if (url === "/api/content?module_type=template" || url === "/api/content") {
      if (method === "GET") {
        return jsonResponse({ data: items });
      }

      if (method === "POST") {
        if (options?.postShouldFail) {
          return jsonResponse({ error: "failed to save" }, false);
        }

        const rawBody = init?.body ? JSON.parse(init.body.toString()) : null;
        const payload = rawBody?.payload;
        const nextId = String(items.length + 1);
        const newItem: TemplateItem = buildTemplateItem(
          nextId,
          typeof payload?.name === "string" ? payload.name : "New Template",
        );

        items = [...items, newItem];
        return jsonResponse({ data: newItem });
      }
    }

    if (url.startsWith("/api/content/")) {
      if (method === "DELETE") {
        if (options?.deleteShouldFail) {
          return jsonResponse({ error: "delete failed" }, false);
        }

        const id = url.split("/").pop();
        items = items.filter((item) => item._id !== id);
        return jsonResponse({ data: { deleted: true } });
      }
    }

    return jsonResponse({});
  });
};

const waitForLoadingToClear = () =>
  waitFor(() => expect(screen.queryByText(/Loading/i)).toBeNull(), {
    timeout: 2000,
  });

describe("TemplateAdminView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(window, "alert").mockImplementation(() => undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders an empty state when no templates exist", async () => {
    const fetchMock = createFetchMock([]);
    global.fetch = fetchMock;

    render(<TemplateAdminView />);
    await waitForLoadingToClear();

    expect(
      await screen.findByText(/No records found matching your filters./i),
    ).toBeInTheDocument();
  });

  it("filters templates by search query", async () => {
    const fetchMock = createFetchMock([
      buildTemplateItem("1", "Alpha Template"),
      buildTemplateItem("2", "Beta Template"),
    ]);
    global.fetch = fetchMock;

    render(<TemplateAdminView />);
    await waitFor(() => expect(screen.getByText("Alpha Template")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Beta Template")).toBeInTheDocument());

    const searchInput = screen.getByLabelText("Search items");
    fireEvent.change(searchInput, { target: { value: "beta" } });

    expect(screen.queryByText("Alpha Template")).not.toBeInTheDocument();
    expect(screen.getByText("Beta Template")).toBeInTheDocument();
  });

  it("prevents saving when name is missing", async () => {
    const fetchMock = createFetchMock([]);
    global.fetch = fetchMock;

    render(<TemplateAdminView />);
    await waitForLoadingToClear();

    fireEvent.click(screen.getByRole("button", { name: /New Item/i }));
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    expect(await screen.findByText(/Name requested/i)).toBeInTheDocument();

    const postAttempt = fetchMock.mock.calls.some(
      ([calledUrl, init]) =>
        calledUrl === "/api/content" &&
        (init?.method ?? "GET").toUpperCase() === "POST",
    );
    expect(postAttempt).toBe(false);
  });

  it("creates a template item and refreshes the list", async () => {
    const fetchMock = createFetchMock([]);
    global.fetch = fetchMock;

    render(<TemplateAdminView />);
    await waitForLoadingToClear();

    fireEvent.click(screen.getByRole("button", { name: /New Item/i }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Template Draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      const postCalled = fetchMock.mock.calls.some(
        ([calledUrl, init]) =>
          calledUrl === "/api/content" &&
          (init?.method ?? "GET").toUpperCase() === "POST",
      );
      expect(postCalled).toBe(true);
    });
    expect(
      screen.queryByRole("button", { name: /Close form/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Template Draft")).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.filter(
        ([calledUrl, init]) =>
          calledUrl === "/api/content" &&
          (init?.method ?? "GET").toUpperCase() === "POST",
      ),
    ).toHaveLength(1);
  });

  it("surfaces an error message when create fails", async () => {
    const fetchMock = createFetchMock([], { postShouldFail: true });
    global.fetch = fetchMock;

    render(<TemplateAdminView />);
    await waitForLoadingToClear();

    fireEvent.click(screen.getByRole("button", { name: /New Item/i }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Broken" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    expect(await screen.findByText(/failed to save/i)).toBeInTheDocument();
  });

  it("skips delete when confirmation is declined", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = createFetchMock([buildTemplateItem("1", "Keep me")]);
    global.fetch = fetchMock;

    render(<TemplateAdminView />);
    await waitFor(() => expect(screen.getByText("Keep me")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Delete item/i }));

    expect(screen.getByText("Keep me")).toBeInTheDocument();
    const deleteAttempt = fetchMock.mock.calls.some(
      ([calledUrl, init]) =>
        String(calledUrl).startsWith("/api/content/") &&
        (init?.method ?? "GET").toUpperCase() === "DELETE",
    );
    expect(deleteAttempt).toBe(false);
    confirmSpy.mockRestore();
  });

  it("deletes a template item after confirmation", async () => {
    const fetchMock = createFetchMock([buildTemplateItem("1", "Delete Me")]);
    global.fetch = fetchMock;

    render(<TemplateAdminView />);
    await waitFor(() => expect(screen.getByText("Delete Me")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Delete item/i }));

    await waitFor(() => expect(screen.queryByText("Delete Me")).not.toBeInTheDocument());
    const deleteAttempt = fetchMock.mock.calls.some(
      ([calledUrl, init]) =>
        calledUrl === "/api/content/1" &&
        (init?.method ?? "GET").toUpperCase() === "DELETE",
    );
    expect(deleteAttempt).toBe(true);
  });
});
