import { getDb } from "@/lib/mongodb";
import { SystemConfig } from "@/lib/types";
import { ApiSuccess, ApiError } from "@/lib/api-response";
import { getTieredVisits } from "@/lib/metrics-cache";
import { SystemUpdateSchema } from "@/lib/schemas";

export async function GET() {
  try {
    const db = await getDb();
    const systemColl = db.collection<SystemConfig>("system");
    const result = await systemColl.findOne({ _id: "global" });

    if (!result) return ApiError("Not initialized", 404);

    // Inject the dynamically aggregated memory-cached visits
    result.tieredVisits = await getTieredVisits();

    return ApiSuccess(result);
  } catch (err: unknown) {
    console.error("GET /api/system failed:", err);
    return ApiError("Internal engine error", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = SystemUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return ApiError("Invalid settings format", 400);
    }

    // Define allowed base fields
    const baseFields = [
      "active_theme",
      "color_mode",
      "site_title",
      "site_icon",
      "bio",
      "moduleRegistry",
      "widgetRegistry",
      "moduleOrder",
      "orderingStrategy",
      "visitSortScope",
    ];

    const updateData: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(parsed.data)) {
      if (baseFields.includes(key)) {
        updateData[key] = value;
      } else if (key.endsWith("Settings")) {
        // Enforce that module-specific settings must be objects
        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          updateData[key] = value;
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return ApiError("No valid fields to update", 400);
    }

    const db = await getDb();
    const systemColl = db.collection<SystemConfig>("system");

    await systemColl.updateOne({ _id: "global" }, { $set: updateData });

    return ApiSuccess({ success: true });
  } catch (err: unknown) {
    console.error("PUT /api/system failed:", err);
    return ApiError("Failed to update system settings", 500);
  }
}
