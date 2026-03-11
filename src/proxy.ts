import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export default async function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // If already logged in and visiting /login, redirect to /admin
    if (path === '/login') {
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
        (path.startsWith('/api/system') && request.method !== 'GET') ||
        path.startsWith('/api/ai-usage') ||
        (path.startsWith('/api/content') && request.method !== 'GET'); // GET /api/content might be public for some modules

    if (isProtectedPath) {
        const token = request.cookies.get('lifeos_token')?.value;

        if (!token) {
            if (path.startsWith('/api')) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            return NextResponse.redirect(new URL('/login', request.url));
        }

        const verifiedToken = await verifyToken(token);
        if (!verifiedToken) {
            if (path.startsWith('/api')) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/login', '/admin/:path*', '/api/system/:path*', '/api/content/:path*', '/api/ai-usage/:path*'],
}
