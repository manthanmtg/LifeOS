import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BillsAdminView from "../AdminView";
import React from "react";

// Mock pdf.js to prevent "DOMMatrix is not defined" in Node environment
vi.mock("react-pdf", () => ({
  Document: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pdf-mock">{children}</div>
  ),
  Page: () => <div data-testid="page-mock">PDF Page Mock</div>,
  pdfjs: { GlobalWorkerOptions: {} },
}));

const mockBills = [
  {
    _id: "bill-1",
    module_type: "bill",
    is_public: false,
    payload: {
      name: "Electricity Bill January",
      bill_date: "2026-01-15T00:00:00.000Z",
      description: "Monthly electricity charge",
      notes: "",
      folder_id: "folder-1",
      tags: ["utilities"],
      attachments: [],
    },
    created_at: "2026-01-15T10:00:00.000Z",
    updated_at: "2026-01-15T10:00:00.000Z",
  },
  {
    _id: "bill-2",
    module_type: "bill",
    is_public: false,
    payload: {
      name: "Internet Bill February",
      bill_date: "2026-02-01T00:00:00.000Z",
      description: "Broadband subscription",
      attachments: [
        {
          id: "att-1",
          filename: "invoice.pdf",
          content_type: "application/pdf",
          data: "dGVzdA==",
          size: 1024,
          uploaded_at: "2026-02-01T10:00:00.000Z",
        },
      ],
    },
    created_at: "2026-02-01T10:00:00.000Z",
    updated_at: "2026-02-01T10:00:00.000Z",
  },
];

const mockCompactBills = mockBills.map((bill) => ({
  ...bill,
  payload: {
    ...bill.payload,
    attachments: bill.payload.attachments.map(
      ({ id, filename, content_type, size, uploaded_at }) => ({
        id,
        filename,
        content_type,
        size,
        uploaded_at,
      }),
    ),
  },
}));

const mockFolders = [
  {
    _id: "folder-1",
    module_type: "bill_folder",
    is_public: false,
    payload: { name: "Utilities", parent_id: undefined },
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

describe("BillsAdminView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/bills?compact=true") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockCompactBills }),
        });
      }
      if (url === "/api/bills/folders") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockFolders }),
        });
      }
      if (url.startsWith("/api/bills/")) {
        const id = url.split("/").at(-1);
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: mockBills.find((bill) => bill._id === id),
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it("renders the Bills admin view heading", async () => {
    render(<BillsAdminView />);
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeNull();
    });
    expect(screen.getAllByText("All Bills").length).toBeGreaterThan(0);
  });

  it("renders bill names after loading", async () => {
    render(<BillsAdminView />);
    await waitFor(() => {
      expect(screen.getByText("Electricity Bill January")).toBeDefined();
    });
    expect(screen.getByText("Internet Bill February")).toBeDefined();
  });

  it("renders folder names in content area", async () => {
    render(<BillsAdminView />);
    await waitFor(() => {
      expect(screen.getAllByText("Utilities").length).toBeGreaterThan(0);
    });
  });

  it("shows All Bills in breadcrumb", async () => {
    render(<BillsAdminView />);
    await waitFor(() => {
      expect(screen.getByText("All Bills")).toBeDefined();
    });
  });

  it("shows attachment count on bill", async () => {
    render(<BillsAdminView />);
    await waitFor(() => {
      // Internet Bill February has 1 attachment
      expect(screen.getByText("1")).toBeDefined();
    });
  });

  it("fetches full bill data before opening bill details", async () => {
    render(<BillsAdminView />);

    const billName = await screen.findByText("Internet Bill February");
    fireEvent.click(billName);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/bills/bill-2");
    });
  });

  it("opens add bill modal when Add Bill button is clicked", async () => {
    render(<BillsAdminView />);
    await waitFor(() => {
      expect(screen.getByText("Electricity Bill January")).toBeDefined();
    });

    const addButton = screen.getByRole("button", { name: /add bill/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("New Bill")).toBeDefined();
    });
  });

  it("closes add bill modal when Cancel is clicked", async () => {
    render(<BillsAdminView />);
    await waitFor(() => {
      expect(screen.getByText("Electricity Bill January")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: /add bill/i }));
    await waitFor(() => {
      expect(screen.getByText("New Bill")).toBeDefined();
    });

    fireEvent.click(screen.getAllByRole("button", { name: /cancel/i })[0]);
    await waitFor(() => {
      expect(screen.queryByText("New Bill")).toBeNull();
    });
  });

  it("shows empty state when no bills exist", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/bills") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      if (url === "/api/bills/folders") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<BillsAdminView />);
    await waitFor(() => {
      expect(screen.getByText(/No Bills Yet/i)).toBeDefined();
    });
  });

  it("filters bills by search query", async () => {
    render(<BillsAdminView />);
    await waitFor(() => {
      expect(screen.getByText("Electricity Bill January")).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Search bills by name/i);
    fireEvent.change(searchInput, { target: { value: "Electricity" } });

    await waitFor(() => {
      expect(screen.getByText("Electricity Bill January")).toBeDefined();
      expect(screen.queryByText("Internet Bill February")).toBeNull();
    });
  });

  it("filters bills by tag", async () => {
    render(<BillsAdminView />);
    await waitFor(() => {
      expect(screen.getByText("Electricity Bill January")).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Search bills by name/i);
    fireEvent.change(searchInput, { target: { value: "utilities" } });

    await waitFor(() => {
      expect(screen.getByText("Electricity Bill January")).toBeDefined();
      expect(screen.queryByText("Internet Bill February")).toBeNull();
    });
  });

  it("shows inline folder creation when New Folder is clicked", async () => {
    render(<BillsAdminView />);
    await waitFor(() => {
      expect(screen.getByText("Electricity Bill January")).toBeDefined();
    });

    const newFolderButton = screen.getByRole("button", { name: /new folder/i });
    fireEvent.click(newFolderButton);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Folder name/i)).toBeDefined();
    });
  });
});
