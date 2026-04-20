import { SignJWT } from "jose";

const getSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET environment variable");
  }
  return new TextEncoder().encode(secret);
};

const JWT_ISSUER = "lifeos";
const JWT_AUDIENCE = "lifeos-app";

export async function signToken(payload) {
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

async function main() {
  const token = await signToken({ role: "admin" });
  console.log(token);
}

main();
