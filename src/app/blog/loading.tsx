import PublicHeader from "@/components/shell/PublicHeader";
import PublicFooter from "@/components/shell/PublicFooter";
import { BlogListSkeleton } from "@/components/ui/Skeletons";

export default function BlogLoading() {
    return (
        <div className="min-h-screen flex flex-col">
            <PublicHeader initialUserName="Loading..." />
            <BlogListSkeleton />
            <PublicFooter />
        </div>
    );
}
