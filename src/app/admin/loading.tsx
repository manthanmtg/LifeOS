import { DashboardSkeleton } from "@/components/ui/Skeletons";

export default function AdminDashboardLoading() {
    return (
        <div className="animate-fade-in-up">
            <header className="mb-8">
                <div className="h-8 w-56 bg-zinc-800/50 rounded-lg animate-pulse mb-2" />
                <div className="h-4 w-80 bg-zinc-800/30 rounded-lg animate-pulse" />
            </header>
            <DashboardSkeleton />
        </div>
    );
}
