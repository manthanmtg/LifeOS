import { NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ApiSuccess, ApiError, ApiValidationError } from "@/lib/api-response";
import { createHash } from "crypto";
import { MetricEventSchema } from "@/lib/schemas";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const rawDays = parseInt(req.nextUrl.searchParams.get("days") || "30");
  const days = Math.min(Math.max(isNaN(rawDays) ? 30 : rawDays, 1), 365);
  const since = new Date(Date.now() - days * 86400000).toISOString();

  try {
    const db = await getDb();
    const metrics = await db
      .collection("metrics")
      .find({ timestamp: { $gte: since } })
      .sort({ timestamp: -1 })
      .limit(10000)
      .toArray();
    return ApiSuccess(metrics);
  } catch (err: unknown) {
    console.error("GET /api/metrics failed:", err);
    return ApiSuccess([]); // Graceful degradation for metrics
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = MetricEventSchema.safeParse(body);

    if (!parsed.success) {
      return ApiValidationError(parsed.error.format());
    }

    const db = await getDb();

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const ua = req.headers.get("user-agent") || "unknown";
    const sessionHash = createHash("sha256")
      .update(`${ip}-${ua}-${new Date().toISOString().slice(0, 10)}`)
      .digest("hex")
      .slice(0, 12);

    // Verify admin status to prevent spoofing of the is_admin flag
    const cookieStore = await cookies();
    const token = cookieStore.get("lifeos_token")?.value;
    const isActuallyAdmin = token ? !!(await verifyToken(token)) : false;

    const event = {
      ...parsed.data,
      is_admin: isActuallyAdmin,
      session_id: sessionHash,
      timestamp: new Date().toISOString(),
    };

    await db.collection("metrics").insertOne(event);
    return ApiSuccess({ success: true });
  } catch (err: unknown) {
    console.error("POST /api/metrics failed:", err);
    return ApiError("Failed to record metric", 500);
  }
}
