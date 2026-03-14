import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export default async function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname;
    const hostname = request.headers.get("host") || "";
    const adminDomain = process.env.ADMIN_DOMAIN || "";
    const isAdminHost = adminDomain && hostname.includes(adminDomain);

    // Debug log for host-based routing
    if (isAdminHost) {
        console.log(`[Proxy] Host: ${hostname}, Path: ${path}`);
    }

    // Determine if the path is /login or /admin/login (both should be public)
    const isLoginPath = path === '/admin/login' || path === '/login';

    // If already logged in and visiting login page, redirect to dashboard
    if (isLoginPath) {
        const token = request.cookies.get('lifeos_token')?.value;
        if (token) {
            const verified = await verifyToken(token);
            if (verified) {
                // On admin host, "/" is the dashboard. On others, it's "/admin"
                const dashboardUrl = isAdminHost ? '/' : '/admin';
                return NextResponse.redirect(new URL(dashboardUrl, request.url));
            }
        }
        return NextResponse.next();
    }

    // Protect paths:
    // 1. Any path starting with /admin
    // 2. Sensitive /api routes
    // 3. ANY path on the ADMIN_DOMAIN (the "shell" itself)
    const isProtectedPath = 
        path.startsWith('/admin') ||
        path.startsWith('/api/system') ||
        path.startsWith('/api/ai-usage') ||
        path.startsWith('/api/export') ||
        path.startsWith('/api/import') ||
        (path.startsWith('/api/content') && request.method !== 'GET') ||
        (isAdminHost && !path.startsWith('/api') && !path.startsWith('/_next') && !path.startsWith('/static'));

    if (isProtectedPath) {
        const token = request.cookies.get('lifeos_token')?.value;

        if (!token) {
            if (path.startsWith('/api')) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            // Redirect to admin login
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }

        const verifiedToken = await verifyToken(token);
        if (!verifiedToken) {
            if (path.startsWith('/api')) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
