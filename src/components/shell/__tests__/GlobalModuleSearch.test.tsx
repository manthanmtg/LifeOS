import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routerMocks, navigationState } from "@/test/mocks/navigation";
import GlobalModuleSearch from "@/components/shell/GlobalModuleSearch";

describe("GlobalModuleSearch", () => {
    beforeEach(() => {
        global.fetch = vi.fn().mockResolvedValue({
            json: async () => ({ data: {} }),
        } as Response);
        navigationState.pathname = "/admin";
    });

    it("renders fuzzy-matched modules and clears the query", async () => {
        render(<GlobalModuleSearch />);

        const input = screen.getByLabelText(/search modules/i);

        await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/system"));

        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "fin" } });

        expect(screen.getByRole("link", { name: /Calculators/i })).toBeInTheDocument();
        expect(screen.getAllByText("fin", { exact: false }).length).toBeGreaterThan(0);

        fireEvent.click(screen.getByRole("button", { name: /clear search/i }));

        expect(input).toHaveValue("");
    });

    it("routes to the selected module on enter", async () => {
        render(<GlobalModuleSearch />);

        const input = screen.getByLabelText(/search modules/i);
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "todo" } });
        await act(async () => {
            fireEvent.keyDown(input, { key: "Enter" });
        });

        expect(routerMocks.push).toHaveBeenCalledWith("/admin/todo");
    });

    it("hides disabled modules from results", async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce({
            json: async () => ({
                data: {
                    moduleRegistry: {
                        expenses: { enabled: false, isPublic: false },
                    },
                },
            }),
        } as Response);

        render(<GlobalModuleSearch />);

        const input = screen.getByLabelText(/search modules/i);
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "expenses" } });

        await waitFor(() => {
            expect(screen.queryByRole("link", { name: /^Expenses/i })).not.toBeInTheDocument();
        });
    });
});
