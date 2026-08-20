import Link from "next/link";
import PublicHeader from "@/components/shell/PublicHeader";
import PublicFooter from "@/components/shell/PublicFooter";
import { ArrowLeft } from "lucide-react";
import PostReader from "@/modules/blog/PostReader";
import { getPublishedBlogPost, getPublicSiteData } from "@/lib/public-data";

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const [site, { post, relatedPosts }] = await Promise.all([
    getPublicSiteData(),
    getPublishedBlogPost(slug),
  ]);

  if (!post) {
    return (
      <div className="min-h-dvh flex flex-col">
        <PublicHeader
          initialUserName={site.userName}
          publicModules={site.publicModules}
        />
        <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-6">
          <h1 className="text-2xl font-bold text-zinc-50 mb-2">
            Post Not Found
          </h1>
          <p className="text-zinc-500 text-sm mb-6">
            This blog post does not exist or is not published.
          </p>
          <Link
            href="/blog"
            className="text-accent hover:underline text-sm flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to blog
          </Link>
        </div>
        <PublicFooter socialLinks={site.socialLinks} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <PublicHeader
        initialUserName={site.userName}
        publicModules={site.publicModules}
      />
      <PostReader post={post} relatedPosts={relatedPosts} />
      <PublicFooter socialLinks={site.socialLinks} />
    </div>
  );
}
