import type { NextConfig } from "next";
import packageJson from "./package.json";
import { resolveBuildInfo } from "./src/lib/build-info-config";

const buildInfo = resolveBuildInfo({
  version: packageJson.version,
});

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_LIFEOS_VERSION: buildInfo.version,
    NEXT_PUBLIC_LIFEOS_COMMIT_SHA: buildInfo.commitSha ?? "",
    NEXT_PUBLIC_LIFEOS_DEPLOYED_AT: buildInfo.deployedAt,
    NEXT_PUBLIC_LIFEOS_DEPLOY_PROVIDER: buildInfo.provider,
    NEXT_PUBLIC_LIFEOS_DEPLOY_CONTEXT: buildInfo.context,
    NEXT_PUBLIC_LIFEOS_BRANCH: buildInfo.branch ?? "",
    NEXT_PUBLIC_LIFEOS_DEPLOY_ID: buildInfo.deployId ?? "",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
