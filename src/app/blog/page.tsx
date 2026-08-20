import PublicHeader from "@/components/shell/PublicHeader";
import PublicFooter from "@/components/shell/PublicFooter";
import BlogView from "@/modules/blog/View";
import { getPublishedBlogPosts, getPublicSiteData } from "@/lib/public-data";

export default async function BlogPage() {
  const [site, posts] = await Promise.all([
    getPublicSiteData(),
    getPublishedBlogPosts(),
  ]);

  return (
    <div className="min-h-dvh flex flex-col">
      <PublicHeader
        initialUserName={site.userName}
        publicModules={site.publicModules}
      />
      <main className="flex-1">
        <BlogView initialPosts={posts} />
      </main>
      <PublicFooter socialLinks={site.socialLinks} />
    </div>
  );
}
