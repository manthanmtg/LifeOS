import nextConfig from "../../next.config";

describe("next security headers", () => {
  async function getConfiguredHeaders() {
    return typeof nextConfig.headers === "function"
      ? await nextConfig.headers()
      : [];
  }

  it("applies baseline browser hardening headers to all routes", async () => {
    const headers = await getConfiguredHeaders();

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
            { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          ]),
        }),
      ]),
    );
  });

  it("allows the public resume PDF to render in the same-origin viewer", async () => {
    const headers = await getConfiguredHeaders();
    const globalIndex = headers.findIndex((entry) => entry.source === "/(.*)");
    const resumeIndex = headers.findIndex(
      (entry) => entry.source === "/api/portfolio/resume",
    );

    expect(resumeIndex).toBeGreaterThan(globalIndex);
    expect(headers[resumeIndex]?.headers).toEqual(
      expect.arrayContaining([{ key: "X-Frame-Options", value: "SAMEORIGIN" }]),
    );
  });
});
