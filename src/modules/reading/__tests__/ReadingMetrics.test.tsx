/** @jsxImportSource react */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ReadingMetrics } from "../components/ReadingMetrics";
import React from "react";

import { ReadingItem, ReadingPayload } from "../types";

describe("ReadingMetrics", () => {
  it("renders metrics correctly", () => {
    const mockItems: ReadingItem[] = [
      { _id: "1", created_at: new Date().toISOString(), payload: { url: "", title: "", is_read: false, priority: "high", type: "article" } },
      { _id: "2", created_at: new Date().toISOString(), payload: { url: "", title: "", is_read: true, priority: "medium", type: "article" } },
    ];
    render(React.createElement(ReadingMetrics, { items: mockItems }));
    expect(screen.getByText("Total")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("Unread")).toBeDefined();
    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getByText("Completed")).toBeDefined();
    expect(screen.getByText("1")).toBeDefined();
  });
});
