import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import IdeasPublicView from "../PublicView";

const publicIdeas = [
    {
        _id: "idea-public-1",
        created_at: "2026-02-10T10:00:00.000Z",
        updated_at: "2026-02-11T11:30:00.000Z",
        payload: {
            title: "Arabic-first onboarding",
            description: "Detailed rollout for the onboarding flow.",
            notes: "Validate copy in both RTL and LTR layouts.",
            category: "Product",
            status: "exploring",
            tags: ["rtl", "mobile", "onboarding"],
            priority: "high",
        },
    },
];

describe("IdeasPublicView", () => {
    it("opens and closes the idea details modal from a public card", () => {
        render(<IdeasPublicView items={publicIdeas} />);

        fireEvent.click(screen.getByRole("button", { name: /open details for arabic-first onboarding/i }));

        const dialog = screen.getByRole("dialog", { name: /arabic-first onboarding/i });

        expect(dialog).toBeInTheDocument();
        expect(screen.getByText(/validate copy in both rtl and ltr layouts/i)).toBeInTheDocument();
        expect(within(dialog).getByText("rtl")).toBeInTheDocument();

        fireEvent.keyDown(window, { key: "Escape" });

        expect(screen.queryByRole("dialog", { name: /arabic-first onboarding/i })).not.toBeInTheDocument();
    });
});
