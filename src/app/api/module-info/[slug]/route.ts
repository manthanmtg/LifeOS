import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { ApiSuccess, ApiNotFound } from "@/lib/api-response";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const safeSlug = slug.replace(/[^a-z0-9-]/g, "");
        const filePath = path.join(process.cwd(), "src", "modules", safeSlug, "info.md");
        const content = await fs.readFile(filePath, "utf-8");
        return ApiSuccess({ content });
    } catch {
        return ApiNotFound("Module info not found");
    }
}
