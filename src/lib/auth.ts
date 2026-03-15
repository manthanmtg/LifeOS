import { SignJWT, jwtVerify } from "jose";

const getSecretKey = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("Missing JWT_SECRET environment variable");
    }
    return new TextEncoder().encode(secret);
};

const JWT_ISSUER = "lifeos";
const JWT_AUDIENCE = "lifeos-app";

export async function signToken(payload: Record<string, unknown>) {
    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer(JWT_ISSUER)
        .setAudience(JWT_AUDIENCE)
        .setSubject("admin")
        .setExpirationTime("7d")
        .sign(getSecretKey());
    return token;
}

export async function verifyToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, getSecretKey(), {
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
        });
        return payload;
    } catch {
        return null;
    }
}
