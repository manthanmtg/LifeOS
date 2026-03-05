import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export default async function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Protect /admin and sensitive /api routes
    const isProtectedPath = path.startsWith('/admin') ||
        path.startsWith('/api/system') ||
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
    matcher: ['/admin/:path*', '/api/system/:path*', '/api/content/:path*'],
}
