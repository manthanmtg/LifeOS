import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BillsAdminView from "../AdminView";
import React from "react";

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
      if (url === "/api/bills") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockBills }),
        });
      }
      if (url === "/api/bills/folders") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockFolders }),
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
    expect(screen.getByText("Bills")).toBeDefined();
  });

  it("displays bill count summary", async () => {
    render(<BillsAdminView />);
    await waitFor(() => {
      expect(screen.getByText(/2 bills/i)).toBeDefined();
    });
  });

  it("renders bill names after loading", async () => {
    render(<BillsAdminView />);
    await waitFor(() => {
      expect(screen.getByText("Electricity Bill January")).toBeDefined();
    });
    expect(screen.getByText("Internet Bill February")).toBeDefined();
  });

  it("renders folder names in the sidebar", async () => {
    render(<BillsAdminView />);
    await waitFor(() => {
      expect(screen.getAllByText("Utilities").length).toBeGreaterThan(0);
    });
  });

  it("shows All Bills option", async () => {
    render(<BillsAdminView />);
    await waitFor(() => {
      expect(screen.getAllByText("All Bills").length).toBeGreaterThan(0);
    });
  });

  it("shows attachment count on bill with attachments", async () => {
    render(<BillsAdminView />);
    await waitFor(() => {
      expect(screen.getAllByText("1").length).toBeGreaterThan(0);
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

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
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
      expect(screen.getByText("No bills yet")).toBeDefined();
    });
  });

  it("filters bills by search query", async () => {
    render(<BillsAdminView />);
    await waitFor(() => {
      expect(screen.getByText("Electricity Bill January")).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText("Search bills...");
    fireEvent.change(searchInput, { target: { value: "Electricity" } });

    await waitFor(() => {
      expect(screen.getByText("Electricity Bill January")).toBeDefined();
      expect(screen.queryByText("Internet Bill February")).toBeNull();
    });
  });

  it("shows new folder input when New Folder is clicked", async () => {
    render(<BillsAdminView />);
    await waitFor(() => {
      // Desktop sidebar has "New Folder" button; find any instance
      const newFolderButtons = screen.getAllByText("New Folder");
      expect(newFolderButtons.length).toBeGreaterThan(0);
    });

    // Click the first visible "New Folder" button
    const newFolderButtons = screen.getAllByText("New Folder");
    fireEvent.click(newFolderButtons[0]);
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Folder name")).toBeDefined();
    });
  });
});
