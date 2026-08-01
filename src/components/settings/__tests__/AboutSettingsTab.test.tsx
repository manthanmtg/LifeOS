import { render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AppBuildInfo } from "@/lib/build-info";
import { AboutSettingsTab } from "../AboutSettingsTab";

const fullSha = "1de80723d54938f3aef5a5e13ca989552f24325d";

const buildInfo: AppBuildInfo = {
  productName: "Life OS",
  version: "0.1.0",
  commitSha: fullSha,
  deployedAt: "2026-08-01T08:00:00.000Z",
  provider: "netlify",
  context: "production",
  branch: "main",
  deployId: "netlify-deploy-id",
};

describe("AboutSettingsTab", () => {
  it("renders build identity and local deployment diagnostics", async () => {
    render(
      <AboutSettingsTab
        buildInfo={buildInfo}
        formatDeploymentTime={() => "Aug 1, 2026, 1:30:00 PM GMT+5:30"}
        getTimeZone={() => "Asia/Kolkata"}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "About Life OS" }),
    ).toBeVisible();

    expect(await screen.findByText("v0.1.0")).toBeVisible();
    expect(screen.getByLabelText(new RegExp(fullSha))).toHaveTextContent(
      "1de8072",
    );
    expect(
      await screen.findByText("Aug 1, 2026, 1:30:00 PM GMT+5:30"),
    ).toBeVisible();
    expect(screen.getByText("Production")).toBeVisible();

    expect(screen.getByText("Provider")).toBeVisible();
    expect(screen.getByText("Netlify")).toBeVisible();
    expect(screen.getByText("Branch")).toBeVisible();
    expect(screen.getByText("main")).toBeVisible();
    expect(screen.getByText("Deployment ID")).toBeVisible();
    expect(screen.getByText("netlify-deploy-id")).toBeVisible();
    expect(screen.getByText("Browser timezone")).toBeVisible();
    expect(screen.getByText("Asia/Kolkata")).toBeVisible();
    expect(screen.getByText("Source time (UTC)")).toBeVisible();
    expect(screen.getByText("2026-08-01T08:00:00.000Z")).toBeVisible();
  });

  it("renders a deployment-time skeleton before browser formatting runs", () => {
    const html = renderToString(
      <AboutSettingsTab
        buildInfo={buildInfo}
        formatDeploymentTime={() => "Aug 1, 2026, 1:30:00 PM GMT+5:30"}
        getTimeZone={() => "Asia/Kolkata"}
      />,
    );

    expect(html).toContain("Formatting deployment time");
  });

  it("uses explicit unavailable values for missing metadata", async () => {
    render(
      <AboutSettingsTab
        buildInfo={{
          productName: "Life OS",
          version: "",
          commitSha: null,
          deployedAt: "",
          provider: "unknown",
          context: "",
          branch: null,
          deployId: null,
        }}
        formatDeploymentTime={() => "Unavailable"}
        getTimeZone={() => "Unavailable"}
      />,
    );

    await waitFor(() =>
      expect(screen.queryByRole("status")).not.toBeInTheDocument(),
    );

    expect(screen.getAllByText("Unavailable").length).toBeGreaterThanOrEqual(6);
  });
});
