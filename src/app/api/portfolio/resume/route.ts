import { getDb } from "@/lib/mongodb";
import { ContentDocument } from "@/lib/types";

export async function GET() {
    try {
        const db = await getDb();
        const contentColl = db.collection<ContentDocument>("content");

        // 1. Find the active resume
        const resumeDoc = await contentColl.findOne({
            module_type: "portfolio_resume",
            "payload.is_active": true
        });

        if (!resumeDoc || !resumeDoc.payload) {
            return new Response("Active resume not found", { status: 404 });
        }

        const resumePayload = resumeDoc.payload as { content: string; filename?: string };

        if (!resumePayload.content) {
            return new Response("Resume content missing", { status: 404 });
        }

        // 2. Try to find the profile to get the full name for the filename
        const profileDoc = await contentColl.findOne({
            module_type: "portfolio_profile"
        });

        let filename = "resume.pdf";
        if (profileDoc && profileDoc.payload) {
            const profilePayload = profileDoc.payload as { full_name?: string };
            if (profilePayload.full_name) {
                const cleanName = profilePayload.full_name
                    .toLowerCase()
                    .trim()
                    .replace(/\s+/g, "_")
                    .replace(/[^a-z0-9_]/g, ""); // Remove non-alphanumeric chars except underscore
                filename = `${cleanName}_resume.pdf`;
            }
        } else if (resumePayload.filename) {
            filename = resumePayload.filename;
        }

        // 3. Extract base64 data
        const base64Data = resumePayload.content.split(",")[1];
        if (!base64Data) {
            return new Response("Invalid resume content", { status: 500 });
        }

        const buffer = Buffer.from(base64Data, "base64");

        return new Response(buffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("GET /resume failed:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
