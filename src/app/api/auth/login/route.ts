import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { timingSafeEqual } from "crypto";

function safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
        timingSafeEqual(bufA, bufA);
        return false;
    }
    return timingSafeEqual(bufA, bufB);
}

// Simple in-memory rate limiting (Note: This will reset on server restart/HMR)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

export async function POST(request: Request) {
    try {
        const { password } = await request.json();
        const ip = request.headers.get("x-forwarded-for") || "unknown";

        // Check rate limit
        const attempt = loginAttempts.get(ip);
        if (attempt && attempt.count >= MAX_ATTEMPTS) {
            const now = Date.now();
            if (now - attempt.lastAttempt < LOCKOUT_TIME) {
                const remainingMinutes = Math.ceil((LOCKOUT_TIME - (now - attempt.lastAttempt)) / 60000);
                return NextResponse.json(
                    { error: `Too many login attempts. Please try again in ${remainingMinutes} minutes.` },
                    { status: 429 }
                );
            } else {
                // Reset after lockout period
                loginAttempts.delete(ip);
            }
        }

        if (!process.env.ADMIN_PASSWORD) {
            console.error("ADMIN_PASSWORD environment variable is not set");
            return NextResponse.json(
                { error: "Internal server error" },
                { status: 500 }
            );
        }

        if (typeof password === "string" && safeCompare(password, process.env.ADMIN_PASSWORD)) {
            // Success: clear attempts
            loginAttempts.delete(ip);
            
            const token = await signToken({ role: "admin" });

            const response = NextResponse.json({ success: true }, { status: 200 });

            // Set the token as a cookie
            response.cookies.set("lifeos_token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 24 * 7, // 7 days
                path: "/",
            });

            return response;
        }

        // Failure: increment attempts
        const currentAttempt = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
        loginAttempts.set(ip, {
            count: currentAttempt.count + 1,
            lastAttempt: Date.now(),
        });

        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    } catch {
        return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
}
