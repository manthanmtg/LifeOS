import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import WarrantyAdminView from "../AdminView";

describe("WarrantyAdminView", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { items: [], total: 0 } }),
      }),
    );
  });

  it("shows an empty private warranty workspace with a clear add action", async () => {
    render(<WarrantyAdminView />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Warranty" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: "Add warranty item" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("No warranty items yet")).toBeInTheDocument(),
    );
  });

  it("edits an existing item's details and coverage", async () => {
    const item = {
      _id: "warranty-1",
      payload: {
        name: "Laptop",
        category: "electronics",
        brand: "Acme",
        model: "Pro 13",
        location: "Study",
        purchase_date: "2026-01-10",
        currency: "INR",
        ownership_status: "owned",
        archived: false,
        revision: 1,
        coverages: [
          {
            id: "coverage-1",
            label: "Manufacturer warranty",
            start_date: "2026-01-10",
            end_date: "2027-01-10",
          },
        ],
        service_history: [],
      },
    };
    const updated = {
      ...item,
      payload: {
        ...item.payload,
        name: "Work laptop",
        revision: 2,
        coverages: [
          {
            ...item.payload.coverages[0],
            end_date: "2028-01-10",
          },
        ],
      },
    };
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/documents")) {
        return { ok: true, json: async () => ({ data: { documents: [] } }) };
      }
      if (init?.method === "PUT") {
        return { ok: true, json: async () => ({ data: updated }) };
      }
      return { ok: true, json: async () => ({ data: { items: [item] } }) };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<WarrantyAdminView />);

    fireEvent.click(
      (await screen.findByText("Laptop")).closest(
        "button",
      ) as HTMLButtonElement,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Edit details" }),
    );
    fireEvent.change(screen.getByLabelText("Item name"), {
      target: { value: "Work laptop" },
    });
    fireEvent.change(screen.getByLabelText("Coverage 1 end"), {
      target: { value: "2028-01-10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Work laptop" }),
      ).toBeInTheDocument(),
    );
    const updateCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        url === "/api/warranty/warranty-1" &&
        (init as RequestInit | undefined)?.method === "PUT",
    );
    expect(
      JSON.parse((updateCall?.[1] as RequestInit).body as string),
    ).toMatchObject({
      revision: 1,
      payload: {
        name: "Work laptop",
        coverages: [{ end_date: "2028-01-10" }],
      },
    });
  });

  it("shows a readable status for active, expiring, and expired coverage", async () => {
    const dateFromToday = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/documents")) {
        return { ok: true, json: async () => ({ data: { documents: [] } }) };
      }

      return {
        ok: true,
        json: async () => ({
          data: {
            items: [
              {
                _id: "warranty-coverage-status",
                payload: {
                  name: "Dishwasher",
                  category: "appliance",
                  currency: "INR",
                  ownership_status: "owned",
                  archived: false,
                  revision: 1,
                  warranty_key: "dishwasher",
                  coverages: [
                    {
                      id: "active",
                      label: "Extended cover",
                      end_date: dateFromToday(15),
                    },
                    {
                      id: "expired",
                      label: "Brand warranty",
                      end_date: dateFromToday(-10),
                    },
                    {
                      id: "unknown",
                      label: "Parts cover",
                    },
                  ],
                  service_history: [],
                },
              },
            ],
          },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<WarrantyAdminView />);
    fireEvent.click((await screen.findByText("Dishwasher")).closest("button")!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(screen.getByText("Expires in 15 days")).toBeInTheDocument();
    expect(screen.getByText("Expired 10 days ago")).toBeInTheDocument();
    expect(screen.getByText("No expiry date")).toBeInTheDocument();
  });

  it("opens a loading preview immediately while the document is downloading", async () => {
    const item = {
      _id: "warranty-preview",
      payload: {
        name: "Dishwasher",
        category: "appliance",
        currency: "INR",
        ownership_status: "owned",
        archived: false,
        revision: 1,
        warranty_key: "dishwasher",
        coverages: [],
        service_history: [],
      },
    };
    const document = {
      _id: "document-preview",
      payload: {
        filename: "receipt.pdf",
        content_type: "application/pdf",
        size: 2048,
        kind: "receipt",
      },
    };
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith("/documents")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { documents: [document] } }),
        });
      }
      if (url.endsWith(`/documents/${document._id}`)) {
        return new Promise(() => undefined);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: { items: [item] } }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<WarrantyAdminView />);
    fireEvent.click((await screen.findByText("Dishwasher")).closest("button")!);
    await screen.findByRole("button", { name: "View receipt.pdf" });

    fireEvent.click(screen.getByRole("button", { name: "View receipt.pdf" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "Loading receipt.pdf" }),
    ).toBeInTheDocument();
  });
});
