import { Metadata } from "next";
import { getDb } from "@/lib/mongodb";
import { SystemConfig, ContentDocument, BlogPostPayload } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const slug = (await params).slug;

    let siteTitle = "Life OS";
    let postNativeTitle = "Blog Post";
    let postDescription = "A post on Life OS.";
    let coverImage: string | undefined;

    try {
        const db = await getDb();

        // Fetch system config for site title
        // Use SystemConfig interface for type safety, _id is string
        const config = await db.collection<SystemConfig>("system").findOne({ _id: "global" });
        if (config?.site_title) {
            siteTitle = config.site_title;
        }

        // Fetch post payload
        // Use ContentDocument interface for type safety
        const post = await db.collection<ContentDocument<BlogPostPayload>>("content").findOne({
            module_type: "blog_post",
            "payload.slug": slug,
            "payload.status": "published"
        });

        if (post) {
            postNativeTitle = post.payload.title || postNativeTitle;
            postDescription = post.payload.seo_description || post.payload.description || postDescription;
            coverImage = post.payload.cover_image_url;
        }
    } catch {
        // Fallback silently
    }

    const title = `${postNativeTitle} | Blog | ${siteTitle}`;

    return {
        title,
        description: postDescription,
        openGraph: {
            title,
            description: postDescription,
            type: "article",
            images: coverImage ? [{ url: coverImage }] : undefined,
        },
    };
}

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
