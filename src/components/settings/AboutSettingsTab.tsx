"use client";

import { useEffect, useState } from "react";
import { Clock3, GitCommit, Info, Package, Server } from "lucide-react";

import { SkeletonBlock } from "@/components/ui/Skeletons";
import {
  APP_BUILD_INFO,
  type AppBuildInfo,
  UNAVAILABLE,
  formatAppVersion,
  formatBrowserDeploymentTime,
  formatDeployContext,
  formatDeployProvider,
  getBrowserTimeZone,
  shortCommitSha,
} from "@/lib/build-info";

interface AboutSettingsTabProps {
  buildInfo?: AppBuildInfo;
  formatDeploymentTime?: typeof formatBrowserDeploymentTime;
  getTimeZone?: typeof getBrowserTimeZone;
}

interface PrimaryDetail {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title?: string;
  ariaLabel?: string;
  loading?: boolean;
}

export function AboutSettingsTab({
  buildInfo = APP_BUILD_INFO,
  formatDeploymentTime = formatBrowserDeploymentTime,
  getTimeZone = getBrowserTimeZone,
}: AboutSettingsTabProps) {
  const [localDeploymentTime, setLocalDeploymentTime] = useState<string | null>(
    null,
  );
  const [browserTimeZone, setBrowserTimeZone] = useState(UNAVAILABLE);

  useEffect(() => {
    let cancelled = false;
    const schedule =
      typeof queueMicrotask === "function"
        ? queueMicrotask
        : (callback: () => void) => Promise.resolve().then(callback);

    schedule(() => {
      if (cancelled) return;

      setLocalDeploymentTime(formatDeploymentTime(buildInfo.deployedAt));
      setBrowserTimeZone(getTimeZone());
    });

    return () => {
      cancelled = true;
    };
  }, [buildInfo.deployedAt, formatDeploymentTime, getTimeZone]);

  const shortRevision = shortCommitSha(buildInfo.commitSha);
  const primaryDetails: PrimaryDetail[] = [
    {
      label: "App version",
      value: formatAppVersion(buildInfo.version),
      icon: Package,
    },
    {
      label: "Revision",
      value: shortRevision,
      icon: GitCommit,
      title: buildInfo.commitSha ?? undefined,
      ariaLabel: buildInfo.commitSha
        ? `Revision ${shortRevision}, full SHA ${buildInfo.commitSha}`
        : undefined,
    },
    {
      label: "Deployed (build time)",
      value: localDeploymentTime ?? UNAVAILABLE,
      icon: Clock3,
      loading: localDeploymentTime === null,
    },
    {
      label: "Environment",
      value: formatDeployContext(buildInfo.context),
      icon: Server,
    },
  ];

  const secondaryDetails = [
    ["Provider", formatDeployProvider(buildInfo.provider)],
    ["Branch", buildInfo.branch ?? UNAVAILABLE],
    ["Deployment ID", buildInfo.deployId ?? UNAVAILABLE],
    ["Browser timezone", browserTimeZone],
    ["Source time (UTC)", buildInfo.deployedAt || UNAVAILABLE],
  ] satisfies Array<[string, string]>;

  return (
    <section className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-accent/20 bg-accent/10 p-2.5">
          <Info className="h-5 w-5 text-accent" aria-hidden />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-50">
            About Life OS
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Build and deployment details for this running instance.
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {primaryDetails.map((detail) => (
          <PrimaryDetailCard key={detail.label} detail={detail} />
        ))}
      </dl>

      <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-100">
          Build details
        </h3>
        <dl className="mt-4 divide-y divide-zinc-800/70">
          {secondaryDetails.map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-1 gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[180px_1fr] sm:gap-4"
            >
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {label}
              </dt>
              <dd className="min-w-0 break-words font-mono text-sm tabular-nums text-zinc-200">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </section>
  );
}

function PrimaryDetailCard({ detail }: { detail: PrimaryDetail }) {
  const Icon = detail.icon;

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5">
      <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        <Icon className="h-4 w-4 text-zinc-500" aria-hidden />
        {detail.label}
      </dt>
      <dd
        className="mt-3 min-h-8 break-all font-mono text-2xl font-semibold tabular-nums text-zinc-50"
        title={detail.title}
        aria-label={detail.ariaLabel}
      >
        {detail.loading ? (
          <span
            role="status"
            aria-label="Formatting deployment time"
            className="block pt-1"
          >
            <SkeletonBlock className="h-6 w-56 max-w-full rounded" />
          </span>
        ) : (
          detail.value
        )}
      </dd>
    </div>
  );
}
