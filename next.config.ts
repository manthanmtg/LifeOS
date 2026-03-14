import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    async rewrites() {
        return {
            beforeFiles: [
                {
                    source: "/:path((?!api|admin|_next|static|favicon.ico).*)",
                    has: [
                        {
                            type: "host",
                            value: process.env.ADMIN_DOMAIN || "localhost",
                        },
                    ],
                    destination: "/admin/:path*",
                },
            ],
        };
    },
};

export default nextConfig;
