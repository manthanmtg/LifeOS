import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export default async function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // If logged in and visiting /, redirect to /admin dashboard
    // Unless ?public=1 is set (explicit public view request)
    if (path === '/') {
        const wantsPublic = request.nextUrl.searchParams.get('public') === '1';
        if (!wantsPublic) {
            const token = request.cookies.get('lifeos_token')?.value;
            if (token) {
                const verified = await verifyToken(token);
                if (verified) {
                    return NextResponse.redirect(new URL('/admin', request.url));
                }
            }
        }
        return NextResponse.next();
    }

    // If already logged in and visiting /admin/login, redirect to /admin
    if (path === '/admin/login') {
        const token = request.cookies.get('lifeos_token')?.value;
        if (token) {
            const verified = await verifyToken(token);
            if (verified) {
                return NextResponse.redirect(new URL('/admin', request.url));
            }
        }
        return NextResponse.next();
    }

    // Protect /admin and sensitive /api routes
    const isProtectedPath = path.startsWith('/admin') ||
        path.startsWith('/api/system') ||
        path.startsWith('/api/ai-usage') ||
        path.startsWith('/api/export') ||
        path.startsWith('/api/import') ||
        path.startsWith('/api/db-stats') ||
        (path.startsWith('/api/metrics') && request.method === 'GET') ||
        (path.startsWith('/api/content') && request.method !== 'GET');

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

    // CSRF protection: validate Origin header on state-mutating requests
    if (request.method !== 'GET' && request.method !== 'HEAD' && path.startsWith('/api/')) {
        const origin = request.headers.get('origin');
        const host = request.headers.get('host');
        if (origin && host) {
            try {
                const originHost = new URL(origin).host;
                if (originHost !== host) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                }
            } catch {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/', '/admin/login', '/admin/:path*', '/api/:path*'],
}
