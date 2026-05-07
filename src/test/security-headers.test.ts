import nextConfig from "../../next.config";

describe("next security headers", () => {
  it("applies baseline browser hardening headers to all routes", async () => {
    const headers =
      typeof nextConfig.headers === "function"
        ? await nextConfig.headers()
        : [];

    expect(headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "/(.*)",
          headers: expect.arrayContaining([
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "X-Frame-Options", value: "DENY" },
            {
              key: "Referrer-Policy",
              value: "strict-origin-when-cross-origin",
            },
            {
              key: "Permissions-Policy",
              value: "camera=(), microphone=(), geolocation=()",
            },
            { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
            { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          ]),
        }),
      ]),
    );
  });
});
