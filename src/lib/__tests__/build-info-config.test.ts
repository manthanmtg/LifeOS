import { describe, expect, it, vi } from "vitest";

import { resolveBuildInfo } from "../build-info-config";

const fixedNow = () => new Date("2026-08-01T08:00:00.000Z");
const fullSha = "1de80723d54938f3aef5a5e13ca989552f24325d";

describe("resolveBuildInfo", () => {
  it("uses explicit Life OS overrides before platform metadata", () => {
    const info = resolveBuildInfo({
      env: {
        LIFEOS_COMMIT_SHA: " 0123456789abcdef ",
        LIFEOS_DEPLOYED_AT: "2026-07-31T10:15:30.000Z",
        LIFEOS_DEPLOY_PROVIDER: "vercel",
        LIFEOS_DEPLOY_CONTEXT: "production",
        LIFEOS_BRANCH: "release/about",
        LIFEOS_DEPLOY_ID: "manual-deploy-42",
        COMMIT_REF: fullSha,
        CONTEXT: "deploy-preview",
      },
      now: fixedNow,
      readGit: () => null,
      version: "2.4.0",
    });

    expect(info).toEqual({
      version: "2.4.0",
      commitSha: "0123456789abcdef",
      deployedAt: "2026-07-31T10:15:30.000Z",
      provider: "vercel",
      context: "production",
      branch: "release/about",
      deployId: "manual-deploy-42",
    });
  });

  it("maps Netlify build metadata into the public contract", () => {
    const info = resolveBuildInfo({
      env: {
        NETLIFY: "true",
        COMMIT_REF: fullSha,
        CONTEXT: "deploy-preview",
        BRANCH: "preview/about",
        HEAD: "fallback-head",
        DEPLOY_ID: "netlify-deploy-id",
        BUILD_ID: "netlify-build-id",
      },
      now: fixedNow,
      readGit: () => null,
      version: "0.1.0",
    });

    expect(info.provider).toBe("netlify");
    expect(info.commitSha).toBe(fullSha);
    expect(info.context).toBe("deploy-preview");
    expect(info.branch).toBe("preview/about");
    expect(info.deployId).toBe("netlify-deploy-id");
    expect(info.deployedAt).toBe("2026-08-01T08:00:00.000Z");
  });

  it("maps Vercel and GitHub metadata without needing local Git", () => {
    const vercel = resolveBuildInfo({
      env: {
        VERCEL: "1",
        VERCEL_GIT_COMMIT_SHA: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_REF: "feature/about",
        VERCEL_DEPLOYMENT_ID: "vercel-deployment-id",
      },
      now: fixedNow,
      readGit: () => null,
      version: "0.1.0",
    });

    const github = resolveBuildInfo({
      env: {
        GITHUB_ACTIONS: "true",
        GITHUB_SHA: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        GITHUB_REF_TYPE: "branch",
        GITHUB_REF_NAME: "main",
        GITHUB_RUN_ID: "123456789",
      },
      now: fixedNow,
      readGit: () => null,
      version: "0.1.0",
    });

    expect(vercel).toMatchObject({
      provider: "vercel",
      commitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      context: "preview",
      branch: "feature/about",
      deployId: "vercel-deployment-id",
    });
    expect(github).toMatchObject({
      provider: "github-actions",
      commitSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      context: "branch",
      branch: "main",
      deployId: "123456789",
    });
  });

  it("falls back to local Git for generic builds and tolerates detached heads", () => {
    const readGit = vi.fn((args: readonly string[]) => {
      if (args.join(" ") === "rev-parse HEAD") return fullSha;
      if (args.join(" ") === "branch --show-current") return "";
      return null;
    });

    const info = resolveBuildInfo({
      env: { NODE_ENV: "production" },
      now: fixedNow,
      readGit,
      version: "0.1.0",
    });

    expect(info).toEqual({
      version: "0.1.0",
      commitSha: fullSha,
      deployedAt: "2026-08-01T08:00:00.000Z",
      provider: "local",
      context: "production",
      branch: null,
      deployId: null,
    });
    expect(readGit).toHaveBeenCalledWith(["rev-parse", "HEAD"]);
    expect(readGit).toHaveBeenCalledWith(["branch", "--show-current"]);
  });

  it("rejects invalid overrides and never throws when Git is unavailable", () => {
    const info = resolveBuildInfo({
      env: {
        LIFEOS_COMMIT_SHA: "not-a-sha",
        LIFEOS_DEPLOYED_AT: "not-a-date",
        COMMIT_REF: "also-not-a-sha",
      },
      now: fixedNow,
      readGit: () => {
        throw new Error("git missing");
      },
      version: "0.1.0",
    });

    expect(info.commitSha).toBeNull();
    expect(info.deployedAt).toBe("2026-08-01T08:00:00.000Z");
    expect(info.branch).toBeNull();
    expect(info.deployId).toBeNull();
  });
});
