import PublicHeader from "@/components/shell/PublicHeader";
import PublicFooter from "@/components/shell/PublicFooter";
import { BlogPostSkeleton } from "@/components/ui/Skeletons";

export default function BlogPostLoading() {
    return (
        <div className="min-h-screen flex flex-col">
            <PublicHeader initialUserName="Loading..." />
            <BlogPostSkeleton />
            <PublicFooter />
        </div>
    );
}
