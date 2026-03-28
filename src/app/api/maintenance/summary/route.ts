import { getDb } from "@/lib/mongodb";
import { ApiSuccess, ApiError } from "@/lib/api-response";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("lifeos_token")?.value;
    const isAdmin = token ? !!(await verifyToken(token)) : false;

    if (!isAdmin) {
      return ApiError("Unauthorized", 401);
    }

    const db = await getDb();

    const now = new Date();
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const pipeline = [
      { $match: { module_type: "maintenance_task" } },
      {
        $project: {
          is_overdue: {
            $and: [
              { $ne: ["$payload.status", "completed"] },
              { $ne: ["$payload.status", "skipped"] },
              { $ne: ["$payload.next_due", null] },
              { $lt: [{ $toDate: "$payload.next_due" }, now] },
            ],
          },
          is_upcoming: {
            $and: [
              { $ne: ["$payload.status", "completed"] },
              { $ne: ["$payload.status", "skipped"] },
              { $ne: ["$payload.next_due", null] },
              { $gte: [{ $toDate: "$payload.next_due" }, now] },
              { $lte: [{ $toDate: "$payload.next_due" }, thirtyDaysLater] },
            ],
          },
          completionsThisMonth: {
            $size: {
              $filter: {
                input: { $ifNull: ["$payload.history", []] },
                as: "h",
                cond: { $gte: [{ $toDate: "$$h.completed_at" }, monthStart] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          overdue: { $sum: { $cond: ["$is_overdue", 1, 0] } },
          upcoming: { $sum: { $cond: ["$is_upcoming", 1, 0] } },
          completedThisMonth: { $sum: "$completionsThisMonth" },
        },
      },
    ];

    const result = await db.collection("content").aggregate(pipeline).toArray();

    const summary = result[0] || {
      total: 0,
      overdue: 0,
      upcoming: 0,
      completedThisMonth: 0,
    };
    delete summary._id;

    return ApiSuccess(summary);
  } catch (error) {
    console.error("GET /api/maintenance/summary failed:", error);
    return ApiError("Failed to fetch maintenance summary", 500);
  }
}
