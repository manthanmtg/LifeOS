import { NextResponse } from "next/server";

export async function POST() {
    const response = NextResponse.json({ success: true }, { status: 200 });

    // Clear the token cookie
    response.cookies.set("lifeos_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: new Date(0),
        path: "/",
    });

    return response;
}
