import { execFileSync } from "node:child_process";

export type BuildInfoProvider =
  | "netlify"
  | "vercel"
  | "github-actions"
  | "local"
  | "unknown";

export interface ResolvedBuildInfo {
  version: string;
  commitSha: string | null;
  deployedAt: string;
  provider: BuildInfoProvider;
  context: string;
  branch: string | null;
  deployId: string | null;
}

export type BuildInfoEnv = Record<string, string | undefined>;
export type GitReader = (args: readonly string[]) => string | null | undefined;

interface ResolveBuildInfoOptions {
  env?: BuildInfoEnv;
  version: string;
  now?: () => Date;
  readGit?: GitReader;
}

const validProviders = new Set<BuildInfoProvider>([
  "netlify",
  "vercel",
  "github-actions",
  "local",
  "unknown",
]);

export function resolveBuildInfo({
  env = process.env,
  version,
  now = () => new Date(),
  readGit = readLocalGit,
}: ResolveBuildInfoOptions): ResolvedBuildInfo {
  const provider = resolveProvider(env);

  return {
    version: trimOrFallback(version, "0.0.0"),
    commitSha: resolveCommitSha(env, provider, readGit),
    deployedAt: resolveDeployedAt(env, now),
    provider,
    context: resolveContext(env, provider),
    branch: resolveBranch(env, provider, readGit),
    deployId: resolveDeployId(env, provider),
  };
}

function resolveProvider(env: BuildInfoEnv): BuildInfoProvider {
  const explicit = normalizeProvider(env.LIFEOS_DEPLOY_PROVIDER);
  if (explicit) return explicit;

  if (env.NETLIFY || env.COMMIT_REF || env.DEPLOY_ID || env.BUILD_ID) {
    return "netlify";
  }

  if (env.VERCEL || env.VERCEL_GIT_COMMIT_SHA || env.VERCEL_DEPLOYMENT_ID) {
    return "vercel";
  }

  if (env.GITHUB_ACTIONS || env.GITHUB_SHA || env.GITHUB_RUN_ID) {
    return "github-actions";
  }

  return "local";
}

function resolveCommitSha(
  env: BuildInfoEnv,
  provider: BuildInfoProvider,
  readGit: GitReader,
): string | null {
  const platformCommit =
    provider === "netlify"
      ? env.COMMIT_REF
      : provider === "vercel"
        ? env.VERCEL_GIT_COMMIT_SHA
        : provider === "github-actions"
          ? env.GITHUB_SHA
          : null;

  return (
    normalizeGitSha(env.LIFEOS_COMMIT_SHA) ||
    normalizeGitSha(platformCommit) ||
    normalizeGitSha(readGitValue(readGit, ["rev-parse", "HEAD"]))
  );
}

function resolveDeployedAt(env: BuildInfoEnv, now: () => Date): string {
  const explicit = normalizeIsoDate(env.LIFEOS_DEPLOYED_AT);
  if (explicit) return explicit;

  const current = now();
  if (!Number.isNaN(current.getTime())) {
    return current.toISOString();
  }

  return new Date(0).toISOString();
}

function resolveContext(
  env: BuildInfoEnv,
  provider: BuildInfoProvider,
): string {
  const platformContext =
    provider === "netlify"
      ? env.CONTEXT
      : provider === "vercel"
        ? env.VERCEL_ENV
        : provider === "github-actions"
          ? firstNonEmpty(env.GITHUB_REF_TYPE, env.NODE_ENV)
          : env.NODE_ENV;

  return firstNonEmpty(
    env.LIFEOS_DEPLOY_CONTEXT,
    platformContext,
    env.NODE_ENV,
    "development",
  ) as string;
}

function resolveBranch(
  env: BuildInfoEnv,
  provider: BuildInfoProvider,
  readGit: GitReader,
): string | null {
  const platformBranch =
    provider === "netlify"
      ? firstNonEmpty(env.BRANCH, env.HEAD)
      : provider === "vercel"
        ? env.VERCEL_GIT_COMMIT_REF
        : provider === "github-actions"
          ? env.GITHUB_REF_NAME
          : null;

  return firstNonEmpty(
    env.LIFEOS_BRANCH,
    platformBranch,
    readGitValue(readGit, ["branch", "--show-current"]),
  );
}

function resolveDeployId(
  env: BuildInfoEnv,
  provider: BuildInfoProvider,
): string | null {
  const platformDeployId =
    provider === "netlify"
      ? firstNonEmpty(env.DEPLOY_ID, env.BUILD_ID)
      : provider === "vercel"
        ? env.VERCEL_DEPLOYMENT_ID
        : provider === "github-actions"
          ? env.GITHUB_RUN_ID
          : null;

  return firstNonEmpty(env.LIFEOS_DEPLOY_ID, platformDeployId);
}

function normalizeProvider(
  value: string | undefined,
): BuildInfoProvider | null {
  const normalized = trimOrNull(value)?.toLowerCase();
  if (!normalized) return null;

  return validProviders.has(normalized as BuildInfoProvider)
    ? (normalized as BuildInfoProvider)
    : null;
}

function normalizeGitSha(value: string | null | undefined): string | null {
  const normalized = trimOrNull(value)?.toLowerCase();
  if (!normalized) return null;

  return /^[0-9a-f]{7,64}$/.test(normalized) ? normalized : null;
}

function normalizeIsoDate(value: string | undefined): string | null {
  const normalized = trimOrNull(value);
  if (!normalized) return null;

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

function firstNonEmpty(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    const normalized = trimOrNull(value);
    if (normalized) return normalized;
  }

  return null;
}

function trimOrNull(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function trimOrFallback(value: string, fallback: string): string {
  return value.trim() || fallback;
}

function readGitValue(
  readGit: GitReader,
  args: readonly string[],
): string | null {
  try {
    return trimOrNull(readGit(args));
  } catch {
    return null;
  }
}

function readLocalGit(args: readonly string[]): string | null {
  try {
    return execFileSync("git", [...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}
