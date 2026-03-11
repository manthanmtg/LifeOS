import PublicHeader from "@/components/shell/PublicHeader";
import PublicFooter from "@/components/shell/PublicFooter";
import { PublicModuleSkeleton } from "@/components/ui/Skeletons";

export default function PublicModuleLoading() {
    return (
        <div className="min-h-screen flex flex-col">
            <PublicHeader initialUserName="Loading..." />
            <PublicModuleSkeleton />
            <PublicFooter />
        </div>
    );
}
