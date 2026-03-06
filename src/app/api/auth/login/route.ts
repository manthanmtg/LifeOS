import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        if (!process.env.ADMIN_PASSWORD) {
            return NextResponse.json(
                { error: "Server misconfiguration: ADMIN_PASSWORD not set" },
                { status: 500 }
            );
        }

        if (password === process.env.ADMIN_PASSWORD) {
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

        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    } catch {
        return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
}
