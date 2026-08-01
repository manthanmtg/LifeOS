export const UNAVAILABLE = "Unavailable";

export type BuildInfoProvider =
  | "netlify"
  | "vercel"
  | "github-actions"
  | "local"
  | "unknown";

export interface AppBuildInfo {
  productName: "Life OS";
  version: string;
  commitSha: string | null;
  deployedAt: string;
  provider: BuildInfoProvider;
  context: string;
  branch: string | null;
  deployId: string | null;
}

type PublicBuildInfoEnv = Record<string, string | undefined>;
type DateTimeFormatFactory = (
  locales?: string | string[],
  options?: Intl.DateTimeFormatOptions,
) => Pick<Intl.DateTimeFormat, "format">;
type TimeZoneFormatterFactory = () => {
  resolvedOptions: () => { timeZone?: string };
};

const providerLabels: Record<BuildInfoProvider, string> = {
  netlify: "Netlify",
  vercel: "Vercel",
  "github-actions": "GitHub Actions",
  local: "Local/self-hosted",
  unknown: UNAVAILABLE,
};

const contextLabels: Record<string, string> = {
  production: "Production",
  prod: "Production",
  preview: "Preview",
  development: "Development",
  dev: "Development",
  test: "Test",
  "deploy-preview": "Deploy preview",
  "branch-deploy": "Branch deploy",
  branch: "Branch",
  tag: "Tag",
};

export const APP_BUILD_INFO = createAppBuildInfo({
  NEXT_PUBLIC_LIFEOS_VERSION: process.env.NEXT_PUBLIC_LIFEOS_VERSION,
  NEXT_PUBLIC_LIFEOS_COMMIT_SHA: process.env.NEXT_PUBLIC_LIFEOS_COMMIT_SHA,
  NEXT_PUBLIC_LIFEOS_DEPLOYED_AT: process.env.NEXT_PUBLIC_LIFEOS_DEPLOYED_AT,
  NEXT_PUBLIC_LIFEOS_DEPLOY_PROVIDER:
    process.env.NEXT_PUBLIC_LIFEOS_DEPLOY_PROVIDER,
  NEXT_PUBLIC_LIFEOS_DEPLOY_CONTEXT:
    process.env.NEXT_PUBLIC_LIFEOS_DEPLOY_CONTEXT,
  NEXT_PUBLIC_LIFEOS_BRANCH: process.env.NEXT_PUBLIC_LIFEOS_BRANCH,
  NEXT_PUBLIC_LIFEOS_DEPLOY_ID: process.env.NEXT_PUBLIC_LIFEOS_DEPLOY_ID,
});

export function createAppBuildInfo(env: PublicBuildInfoEnv): AppBuildInfo {
  return {
    productName: "Life OS",
    version: trimOrFallback(env.NEXT_PUBLIC_LIFEOS_VERSION, ""),
    commitSha: trimOrNull(env.NEXT_PUBLIC_LIFEOS_COMMIT_SHA),
    deployedAt: trimOrFallback(env.NEXT_PUBLIC_LIFEOS_DEPLOYED_AT, ""),
    provider: normalizeProvider(env.NEXT_PUBLIC_LIFEOS_DEPLOY_PROVIDER),
    context: trimOrFallback(env.NEXT_PUBLIC_LIFEOS_DEPLOY_CONTEXT, ""),
    branch: trimOrNull(env.NEXT_PUBLIC_LIFEOS_BRANCH),
    deployId: trimOrNull(env.NEXT_PUBLIC_LIFEOS_DEPLOY_ID),
  };
}

export function formatAppVersion(version: string): string {
  const normalized = trimOrNull(version);
  return normalized ? `v${normalized}` : UNAVAILABLE;
}

export function shortCommitSha(commitSha: string | null): string {
  const normalized = trimOrNull(commitSha);
  return normalized ? normalized.slice(0, 7) : UNAVAILABLE;
}

export function formatDeployProvider(provider: BuildInfoProvider): string {
  return providerLabels[provider] ?? UNAVAILABLE;
}

export function formatDeployContext(context: string): string {
  const normalized = trimOrNull(context);
  if (!normalized) return UNAVAILABLE;

  const key = normalized.toLowerCase();
  return contextLabels[key] ?? humanizeContext(normalized);
}

export function formatBrowserDeploymentTime(
  isoValue: string,
  options: {
    locale?: string | string[];
    timeZone?: string;
    dateTimeFormat?: DateTimeFormatFactory;
  } = {},
): string {
  const normalized = trimOrNull(isoValue);
  if (!normalized) return UNAVAILABLE;

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return UNAVAILABLE;

  const dateTimeFormat = options.dateTimeFormat ?? Intl.DateTimeFormat;
  const baseOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  };

  if (options.timeZone) {
    baseOptions.timeZone = options.timeZone;
  }

  try {
    return dateTimeFormat(options.locale, {
      ...baseOptions,
      timeZoneName: "shortOffset",
    }).format(date);
  } catch {
    try {
      return dateTimeFormat(options.locale, {
        ...baseOptions,
        timeZoneName: "short",
      }).format(date);
    } catch {
      return UNAVAILABLE;
    }
  }
}

export function getBrowserTimeZone(
  createFormatter: TimeZoneFormatterFactory = () => Intl.DateTimeFormat(),
): string {
  try {
    return (
      trimOrNull(createFormatter().resolvedOptions().timeZone) ?? UNAVAILABLE
    );
  } catch {
    return UNAVAILABLE;
  }
}

function normalizeProvider(value: string | undefined): BuildInfoProvider {
  const normalized = trimOrNull(value)?.toLowerCase();

  if (
    normalized === "netlify" ||
    normalized === "vercel" ||
    normalized === "github-actions" ||
    normalized === "local" ||
    normalized === "unknown"
  ) {
    return normalized;
  }

  return "unknown";
}

function humanizeContext(value: string): string {
  const normalized = value.replace(/[-_]+/g, " ").trim();
  if (!normalized) return UNAVAILABLE;

  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

function trimOrNull(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function trimOrFallback(
  value: string | null | undefined,
  fallback: string,
): string {
  return trimOrNull(value) ?? fallback;
}
