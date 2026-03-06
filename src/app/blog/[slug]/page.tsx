import Link from "next/link";
import PublicHeader from "@/components/shell/PublicHeader";
import PublicFooter from "@/components/shell/PublicFooter";
import { ArrowLeft } from "lucide-react";
import { getDb } from "@/lib/mongodb";
import PostReader from "@/modules/blog/PostReader";
import { BlogPost } from "@/modules/blog/types";

interface RawBlogDoc {
    _id: unknown;
    created_at?: string;
    updated_at?: string;
    payload?: {
        title?: string;
        slug?: string;
        content?: string;
        status?: string;
        published_at?: string;
        tags?: string[];
        estimated_reading_time?: number;
        seo_description?: string;
        cover_image_url?: string;
    };
}

function toBlogPost(doc: RawBlogDoc): BlogPost {
    const status = doc.payload?.status;
    return {
        _id: String(doc._id),
        payload: {
            title: doc.payload?.title || "",
            slug: doc.payload?.slug || "",
            content: doc.payload?.content || "",
            status: status === "published" || status === "archived" ? status : "draft",
            published_at: doc.payload?.published_at,
            tags: Array.isArray(doc.payload?.tags) ? doc.payload.tags : [],
            estimated_reading_time: doc.payload?.estimated_reading_time,
            seo_description: doc.payload?.seo_description,
            cover_image_url: doc.payload?.cover_image_url,
        },
        created_at: doc.created_at || new Date().toISOString(),
        updated_at: doc.updated_at,
    };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const slug = (await params).slug;
    let post: BlogPost | null = null;
    let relatedPosts: BlogPost[] = [];
    let userName = "Life OS";

    try {
        const db = await getDb();
        const portfolio = await db.collection("content").findOne({ module_type: "portfolio_profile" });
        if (portfolio?.payload?.full_name) userName = portfolio.payload.full_name;

        const found = await db.collection("content").findOne({
            module_type: "blog_post",
            "payload.slug": slug,
            "payload.status": "published",
        });
        if (found) post = toBlogPost(found);

        if (post) {
            const related = await db.collection("content")
                .find({
                    module_type: "blog_post",
                    "payload.status": "published",
                    "payload.slug": { $ne: slug },
                })
                .sort({ "payload.published_at": -1, created_at: -1 })
                .limit(3)
                .toArray();
            relatedPosts = related.map((item) => toBlogPost(item));
        }
    } catch { }

    if (!post) {
        return (
            <div className="min-h-screen flex flex-col">
                <PublicHeader initialUserName={userName} />
                <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-6">
                    <h1 className="text-2xl font-bold text-zinc-50 mb-2">Post Not Found</h1>
                    <p className="text-zinc-500 text-sm mb-6">This blog post does not exist or is not published.</p>
                    <Link href="/blog" className="text-accent hover:underline text-sm flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" /> Back to blog
                    </Link>
                </div>
                <PublicFooter />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <PublicHeader initialUserName={userName} />
            <PostReader post={post} relatedPosts={relatedPosts} />
            <PublicFooter />
        </div>
    );
}
