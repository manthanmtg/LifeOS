import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminView from "../AdminView";
import { navigationState, routerMocks } from "@/test/mocks/navigation";

const spaceId = "507f1f77bcf86cd799439011";
const categoryId = "22222222-2222-4222-8222-222222222222";

const space = {
  _id: spaceId,
  module_type: "expense_space",
  is_public: false,
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-18T00:00:00.000Z",
  payload: {
    space_key: "11111111-1111-4111-8111-111111111111",
    name: "House Renovation",
    currency: "INR",
    number_format: "indian",
    status: "active",
    categories: [
      {
        id: categoryId,
        name: "Other",
        is_active: true,
        subcategories: [],
      },
    ],
  },
  summary: {
    entry_count: 3,
    total_spend: 500,
    this_month_spend: 200,
    last_entry_date: "2026-08-18",
  },
};

const response = (data: unknown, ok = true, status = ok ? 200 : 500) =>
  Promise.resolve({
    ok,
    status,
    json: () =>
      Promise.resolve(
        typeof data === "object" && data !== null
          ? { success: ok, ...data }
          : { success: ok, data },
      ),
  } as Response);

describe("Expense Spaces AdminView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    navigationState.searchParams = new URLSearchParams();
  });

  it("shows a rich skeleton until the space list resolves", () => {
    global.fetch = vi.fn(() => new Promise<Response>(() => {}));
    render(<AdminView />);

    expect(
      screen.getByRole("status", { name: /loading expense spaces/i }),
    ).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText(/create your first expense space/i)).toBeNull();
  });

  it("renders the overview and opens a selected space through URL state", async () => {
    global.fetch = vi.fn(() => response({ data: [space] }));
    render(<AdminView />);

    expect(await screen.findByText("House Renovation")).toBeInTheDocument();
    expect(screen.getByText("3 expenses")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /open house renovation/i }),
    );
    expect(routerMocks.push).toHaveBeenCalledWith(
      `/admin/expense-spaces?space=${spaceId}&tab=expenses`,
    );
  });

  it("recovers from an unknown selected space without a broken workspace", async () => {
    navigationState.searchParams = new URLSearchParams(
      "space=507f1f77bcf86cd799439099&tab=expenses",
    );
    global.fetch = vi.fn((url) => {
      if (String(url).includes("507f1f77bcf86cd799439099")) {
        return response(
          { success: false, error: "Expense space not found" },
          false,
          404,
        );
      }
      return response({ data: [space] });
    });

    render(<AdminView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /expense space not found/i,
    );
    expect(routerMocks.replace).toHaveBeenCalledWith("/admin/expense-spaces");
  });

  it("keeps archived workspaces readable and disables expense mutations", async () => {
    navigationState.searchParams = new URLSearchParams(
      `space=${spaceId}&tab=expenses`,
    );
    const archived = {
      ...space,
      payload: { ...space.payload, status: "archived" },
      entry_count: 3,
    };
    global.fetch = vi.fn((url) =>
      String(url).endsWith(`/${spaceId}`)
        ? response({ data: archived })
        : String(url).includes("/entries")
          ? response({
              data: {
                entries: [],
                page: 1,
                pageSize: 50,
                total: 0,
                totalPages: 0,
                facets: {
                  paid_to: [],
                  descriptions: [],
                  tags: [],
                  payment_methods: [],
                },
              },
            })
          : response({ data: [archived] }),
    );

    render(<AdminView />);

    expect(
      await screen.findByText(/archived space is read-only/i),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /add expense/i })).toBeDisabled();
  });

  it("writes tab navigation to the URL", async () => {
    navigationState.searchParams = new URLSearchParams(
      `space=${spaceId}&tab=expenses`,
    );
    global.fetch = vi.fn((url) =>
      String(url).endsWith(`/${spaceId}`)
        ? response({ data: { ...space, entry_count: 3 } })
        : String(url).includes("/entries")
          ? response({
              data: {
                entries: [],
                page: 1,
                pageSize: 50,
                total: 0,
                totalPages: 0,
                facets: {
                  paid_to: [],
                  descriptions: [],
                  tags: [],
                  payment_methods: [],
                },
              },
            })
          : response({ data: [space] }),
    );
    render(<AdminView />);

    fireEvent.click(await screen.findByRole("tab", { name: "Analytics" }));
    expect(routerMocks.push).toHaveBeenCalledWith(
      `/admin/expense-spaces?space=${spaceId}&tab=analytics`,
    );
  });

  it("shows an accessible settings skeleton while the tab navigation is pending", async () => {
    navigationState.searchParams = new URLSearchParams(
      `space=${spaceId}&tab=expenses`,
    );
    global.fetch = vi.fn((url) =>
      String(url).endsWith(`/${spaceId}`)
        ? response({ data: { ...space, entry_count: 3 } })
        : String(url).includes("/entries")
          ? response({
              data: {
                entries: [],
                page: 1,
                pageSize: 50,
                total: 0,
                totalPages: 0,
                facets: {
                  paid_to: [],
                  descriptions: [],
                  tags: [],
                  payment_methods: [],
                },
              },
            })
          : response({ data: [space] }),
    );
    render(<AdminView />);

    fireEvent.click(await screen.findByRole("tab", { name: "Settings" }));

    expect(
      screen.getByRole("status", { name: /loading settings/i }),
    ).toHaveAttribute("aria-busy", "true");
  });

  it("shows a retryable API error instead of an empty state", async () => {
    global.fetch = vi.fn(() =>
      response({ success: false, error: "Database unavailable" }, false, 500),
    );
    render(<AdminView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Database unavailable",
    );
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  });
});
