import PublicHeader from "@/components/shell/PublicHeader";
import PublicFooter from "@/components/shell/PublicFooter";
import { BlogPostSkeleton } from "@/components/ui/Skeletons";

export default function BlogPostLoading() {
  return (
    <div className="min-h-dvh flex flex-col">
      <PublicHeader />
      <BlogPostSkeleton />
      <PublicFooter />
    </div>
  );
}
