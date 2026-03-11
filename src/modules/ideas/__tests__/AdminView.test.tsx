import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import IdeasAdminView from "../AdminView";

const adminIdeas = [
    {
        _id: "idea-admin-1",
        created_at: "2026-03-01T09:00:00.000Z",
        updated_at: "2026-03-02T10:15:00.000Z",
        payload: {
            title: "Portfolio teaser video",
            description: "Short concept for a motion-heavy portfolio teaser.",
            notes: "Start with 9:16 framing and crop variants later.",
            category: "Creative",
            status: "raw",
            tags: ["video", "portfolio"],
            priority: "medium",
            promoted_to_portfolio: false,
            order: 0,
        },
    },
];

describe("IdeasAdminView", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        global.fetch = vi.fn().mockImplementation((url) => {
            if (url === "/api/system") {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ data: {} }),
                });
            }
            if (typeof url === "string" && url.includes("/api/content")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ data: adminIdeas }),
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });
    });

    it("renders the Ideas view", async () => {
        render(<IdeasAdminView />);
        await waitFor(() => {
            expect(screen.queryByText(/loading/i)).toBeNull();
        }, { timeout: 2000 });

        expect(screen.getByText(/idea dump/i)).toBeInTheDocument();
    });

    it("opens modal details from an admin idea card and closes on backdrop click", async () => {
        render(<IdeasAdminView />);

        await screen.findByText(/portfolio teaser video/i);

        fireEvent.click(screen.getByRole("button", { name: /open details for portfolio teaser video/i }));

        expect(screen.getByRole("dialog", { name: /portfolio teaser video/i })).toBeInTheDocument();
        expect(screen.getByText(/start with 9:16 framing/i)).toBeInTheDocument();
        expect(screen.getByText(/created/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /close idea details/i }));

        await waitFor(() => {
            expect(screen.queryByRole("dialog", { name: /portfolio teaser video/i })).not.toBeInTheDocument();
        });
    });
});
