import { describe, expect, it, vi } from "vitest";

import {
  createAppBuildInfo,
  formatBrowserDeploymentTime,
  formatDeployContext,
  getBrowserTimeZone,
  shortCommitSha,
} from "../build-info";

describe("build-info browser helpers", () => {
  it("normalizes empty public environment values into nullable fields", () => {
    const info = createAppBuildInfo({
      NEXT_PUBLIC_LIFEOS_VERSION: " 0.1.0 ",
      NEXT_PUBLIC_LIFEOS_COMMIT_SHA:
        " 1de80723d54938f3aef5a5e13ca989552f24325d ",
      NEXT_PUBLIC_LIFEOS_DEPLOYED_AT: " 2026-08-01T08:00:00.000Z ",
      NEXT_PUBLIC_LIFEOS_DEPLOY_PROVIDER: " netlify ",
      NEXT_PUBLIC_LIFEOS_DEPLOY_CONTEXT: " deploy-preview ",
      NEXT_PUBLIC_LIFEOS_BRANCH: "   ",
      NEXT_PUBLIC_LIFEOS_DEPLOY_ID: " deploy-123 ",
    });

    expect(info).toEqual({
      productName: "Life OS",
      version: "0.1.0",
      commitSha: "1de80723d54938f3aef5a5e13ca989552f24325d",
      deployedAt: "2026-08-01T08:00:00.000Z",
      provider: "netlify",
      context: "deploy-preview",
      branch: null,
      deployId: "deploy-123",
    });
  });

  it("formats short revisions and unavailable values consistently", () => {
    expect(shortCommitSha("1de80723d54938f3aef5a5e13ca989552f24325d")).toBe(
      "1de8072",
    );
    expect(shortCommitSha(null)).toBe("Unavailable");
    expect(shortCommitSha("")).toBe("Unavailable");
  });

  it("maps known deployment contexts and keeps custom contexts readable", () => {
    expect(formatDeployContext("deploy-preview")).toBe("Deploy preview");
    expect(formatDeployContext("branch-deploy")).toBe("Branch deploy");
    expect(formatDeployContext("production")).toBe("Production");
    expect(formatDeployContext("qa_stage")).toBe("Qa stage");
    expect(formatDeployContext("")).toBe("Unavailable");
  });

  it("formats deployment time in the requested browser timezone", () => {
    const formatted = formatBrowserDeploymentTime("2026-08-01T08:00:00.000Z", {
      locale: "en-US",
      timeZone: "Asia/Kolkata",
    });

    expect(formatted).toContain("2026");
    expect(formatted).toMatch(/GMT\+5:30|UTC\+5:30|IST/);
  });

  it("falls back to a short timezone name when shortOffset is unsupported", () => {
    const dateTimeFormat = vi.fn(
      (_locale?: string | string[], options?: Intl.DateTimeFormatOptions) => {
        if (options?.timeZoneName === "shortOffset") {
          throw new RangeError("unsupported");
        }

        return {
          format: () => "Aug 1, 2026, 1:30:00 PM IST",
        } as Intl.DateTimeFormat;
      },
    );

    expect(
      formatBrowserDeploymentTime("2026-08-01T08:00:00.000Z", {
        dateTimeFormat,
        locale: "en-US",
        timeZone: "Asia/Kolkata",
      }),
    ).toBe("Aug 1, 2026, 1:30:00 PM IST");
    expect(dateTimeFormat).toHaveBeenCalledTimes(2);
  });

  it("returns Unavailable for invalid dates and missing browser timezone", () => {
    expect(formatBrowserDeploymentTime("not-a-date")).toBe("Unavailable");
    expect(
      getBrowserTimeZone(() => ({
        resolvedOptions: () => ({}) as Intl.ResolvedDateTimeFormatOptions,
      })),
    ).toBe("Unavailable");
  });
});
