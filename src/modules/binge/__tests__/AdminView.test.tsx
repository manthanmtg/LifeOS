import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import BingeAdminView from "../AdminView";

const mockItems = [
  {
    _id: "1",
    module_type: "binge_item",
    created_at: new Date("2024-01-01T12:00:00Z").toISOString(),
    payload: {
      title: "Stranger Things",
      type: "series",
      status: "completed",
      genre: "Sci-Fi",
      platform: "Netflix",
      rating: 9,
    },
  },
  {
    _id: "2",
    module_type: "binge_item",
    created_at: new Date("2024-02-01T12:00:00Z").toISOString(),
    payload: {
      title: "Inception",
      type: "movie",
      status: "backlog",
      genre: "Sci-Fi",
      platform: "Amazon",
    },
  },
];

// Mock components
vi.mock("../components/BingeMetrics", () => ({
  default: () => <div data-testid="binge-metrics" />
}));

vi.mock("../components/BingeForm", () => ({
  default: ({ onClose, onSave }: { onClose: () => void, onSave: () => void }) => (
    <div data-testid="binge-form">
      <button onClick={onClose} data-testid="close-form">Close</button>
      <button onClick={onSave} data-testid="save-form">Save</button>
    </div>
  )
}));

vi.mock("../components/BingeCard", () => ({
  default: ({ item, onEdit, onDelete }: { item: { _id: string, payload: { title: string } }, onEdit: (i: unknown) => void, onDelete: (id: string) => void }) => (
    <div data-testid={`binge-card-${item._id}`}>
      <span>{item.payload.title}</span>
      <button onClick={() => onEdit(item)} data-testid={`edit-${item._id}`}>Edit</button>
      <button onClick={() => onDelete(item._id)} data-testid={`delete-${item._id}`}>Delete</button>
    </div>
  )
}));

describe("BingeAdminView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockItems }),
    });
    window.scrollTo = vi.fn();
    window.confirm = vi.fn().mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly and fetches items", async () => {
    render(<BingeAdminView />);
    
    // Check header
    expect(screen.getByText("Binge")).toBeDefined();
    
    // Wait for items to be fetched and rendered
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/content?module_type=binge_item");
    });
    
    // Items should be visible
    expect(await screen.findByText("Stranger Things")).toBeDefined();
    expect(screen.getByText("Inception")).toBeDefined();
  });
  
  it("opens and closes the Add Item form", async () => {
    render(<BingeAdminView />);
    
    // Form should not be visible initially
    expect(screen.queryByTestId("binge-form")).toBeNull();
    
    fireEvent.click(screen.getByText("Add Item"));
    
    expect(await screen.findByTestId("binge-form")).toBeDefined();
    
    // Close the form
    fireEvent.click(screen.getByTestId("close-form"));
    
    expect(screen.queryByTestId("binge-form")).toBeNull();
  });

  it("handles delete flow", async () => {
    render(<BingeAdminView />);
    
    await waitFor(() => {
      expect(screen.getByText("Stranger Things")).toBeDefined();
    });
    
    // Inception delete button
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    
    const deleteButton = screen.getByTestId("delete-1");
    fireEvent.click(deleteButton);
    
    expect(window.confirm).toHaveBeenCalled();
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/content/1", expect.objectContaining({ method: "DELETE" }));
    });
  });

  it("handles filtering by type", async () => {
    render(<BingeAdminView />);
    
    await waitFor(() => {
      expect(screen.getByText("Stranger Things")).toBeDefined();
      expect(screen.getByText("Inception")).toBeDefined();
    });

    const seriesButton = screen.getByText("Series");
    fireEvent.click(seriesButton);
    
    expect(screen.getByText("Stranger Things")).toBeDefined();
    expect(screen.queryByText("Inception")).toBeNull();
  });

  it("handles edit flow", async () => {
    render(<BingeAdminView />);
    
    await waitFor(() => {
      expect(screen.getByText("Stranger Things")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("edit-1"));

    expect(await screen.findByTestId("binge-form")).toBeDefined();
  });
});
