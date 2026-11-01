import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, signToken } from "@/lib/auth";

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/shared/expense-space/")) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  const isDevBypass =
    process.env.NODE_ENV === "development" &&
    (process.env.DEV_BYPASS_AUTH === "true" ||
      process.env.DEV_BYPASS_AUTH === "1");

  let bypassToken: string | null = null;
  const rawToken = request.cookies.get("lifeos_token")?.value;
  let verified = rawToken ? await verifyToken(rawToken) : null;

  if (!verified && isDevBypass && process.env.JWT_SECRET) {
    try {
      bypassToken = await signToken({ role: "admin" });
      verified = { role: "admin", sub: "admin" };
    } catch (err) {
      console.error("Failed to generate dev bypass token:", err);
    }
  }

  // If logged in and visiting /, redirect to /admin dashboard
  // Unless ?public=1 is set (explicit public view request)
  if (path === "/") {
    const wantsPublic = request.nextUrl.searchParams.get("public") === "1";
    if (!wantsPublic && verified) {
      const response = NextResponse.redirect(new URL("/admin", request.url));
      if (bypassToken) {
        response.cookies.set("lifeos_token", bypassToken, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        });
      }
      return response;
    }
    return NextResponse.next();
  }

  // If already logged in and visiting /admin/login, redirect to /admin
  if (path === "/admin/login") {
    if (verified) {
      const response = NextResponse.redirect(new URL("/admin", request.url));
      if (bypassToken) {
        response.cookies.set("lifeos_token", bypassToken, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        });
      }
      return response;
    }
    return NextResponse.next();
  }

  // Protect /admin and sensitive /api routes
  const isProtectedPath =
    path.startsWith("/admin") ||
    path.startsWith("/api/system") ||
    path.startsWith("/api/ai-usage") ||
    path.startsWith("/api/export") ||
    path.startsWith("/api/import") ||
    path.startsWith("/api/db-stats") ||
    path.startsWith("/api/widgets") ||
    path.startsWith("/api/notifications") ||
    path.startsWith("/api/maintenance") ||
    path.startsWith("/api/module-info") ||
    (path.startsWith("/api/metrics") && request.method === "GET") ||
    (path.startsWith("/api/content") && request.method !== "GET") ||
    path.startsWith("/api/bills") ||
    path.startsWith("/api/warranty") ||
    path.startsWith("/api/expense-spaces");

  if (isProtectedPath && !verified) {
    if (path.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Redirect to admin login
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // CSRF protection: validate Origin header on state-mutating requests
  if (
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    path.startsWith("/api/")
  ) {
    const host = request.headers.get("host") || request.nextUrl.host;
    const csrfSource =
      request.headers.get("origin") || request.headers.get("referer");

    if (!host || !csrfSource) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      const sourceHost = new URL(csrfSource).host;
      if (sourceHost !== host) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (bypassToken) {
    const requestHeaders = new Headers(request.headers);
    const existingCookie = request.headers.get("cookie");
    const cookiePart = `lifeos_token=${bypassToken}`;
    requestHeaders.set(
      "cookie",
      existingCookie ? `${existingCookie}; ${cookiePart}` : cookiePart,
    );

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    response.cookies.set("lifeos_token", bypassToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/admin/login",
    "/admin/:path*",
    "/api/:path*",
    "/shared/expense-space/:path*",
  ],
};
