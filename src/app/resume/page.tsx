import { getDb } from "@/lib/mongodb";
import { Metadata } from "next";
import ResumeViewer from "./ResumeViewer";

export async function generateMetadata(): Promise<Metadata> {
    try {
        const db = await getDb();
        const profile = await db.collection("content").findOne({ module_type: "portfolio_profile" });

        let title = "Resume";
        if (profile?.payload?.full_name) {
            title = `${profile.payload.full_name} Resume`;
        }

        return {
            title: title,
        };
    } catch {
        return { title: "Resume" };
    }
}

export default function ResumePage() {
    return <ResumeViewer />;
}
