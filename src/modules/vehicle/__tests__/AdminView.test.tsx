import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import VehicleAdminView from "../AdminView";

vi.mock("@/components/ui/Skeletons", async () => {
  const React = await import("react");

  return {
    SkeletonBlock: ({ className }: { className?: string }) =>
      React.createElement("div", {
        "data-testid": "vehicle-skeleton-block",
        className,
      }),
  };
});

describe("VehicleAdminView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders shared skeleton blocks while vehicles load", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    render(<VehicleAdminView />);

    expect(
      screen.getAllByTestId("vehicle-skeleton-block").length,
    ).toBeGreaterThan(3);
  });

  it("renders and interacts with vehicle tabs", async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === "/api/system") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        });
      }
      if (url.includes("/api/content")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                {
                  _id: "v1",
                  _collection: "vehicle",
                  payload: {
                    name: "Tesla Model 3",
                    nickname: "Sparky",
                    make: "Tesla",
                    model: "3",
                    year: 2022,
                    type: "car",
                    fuel_type: "electric",
                    odometer_reading: 15000,
                    odometer_unit: "km",
                    status: "active",
                    service_records: [],
                    fuel_logs: [],
                    documents: [],
                  },
                },
              ],
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const { queryByText, findByText } = render(<VehicleAdminView />);

    await waitFor(
      () => {
        expect(queryByText(/Loading/i)).toBeNull();
      },
      { timeout: 2000 },
    );

    expect(await findByText(/Tesla Model 3/i)).toBeTruthy();

    // Find vehicle card
    const card = await findByText(/Tesla Model 3/i);
    fireEvent.click(card);

    // Interact with tabs
    const tabs = ["Overview", "Service History", "Fuel Log", "Documents"];
    for (const tabName of tabs) {
      const tab = await screen.findByRole("button", {
        name: new RegExp(tabName, "i"),
      });
      if (tab) {
        fireEvent.click(tab);
      }
    }
  });

  it("marks vehicle cards with expiring document alerts", async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("/api/content")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                {
                  _id: "v1",
                  created_at: "2026-04-01T00:00:00.000Z",
                  updated_at: "2026-04-01T00:00:00.000Z",
                  payload: {
                    name: "Civic",
                    make: "Honda",
                    model: "Civic",
                    year: 2021,
                    fuel_type: "petrol",
                    odometer_reading: 18000,
                    odometer_unit: "km",
                    service_records: [],
                    fuel_logs: [],
                    documents: [
                      {
                        id: "doc1",
                        type: "registration",
                        title: "Registration renewal",
                        expiry_date: new Date().toISOString(),
                      },
                    ],
                  },
                },
              ],
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<VehicleAdminView />);

    const cardMeta = await screen.findByText("Honda Civic 2021");
    const card = cardMeta.closest(".cursor-pointer");

    expect(card).toHaveClass("border-warning/20");
  });
});
