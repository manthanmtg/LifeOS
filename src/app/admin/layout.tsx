import AdminSidebar from "@/components/shell/AdminSidebar";
import AdminHeader from "@/components/shell/AdminHeader";
import GlobalModuleSearch from "@/components/shell/GlobalModuleSearch";
import CommandPalette from "@/components/ui/CommandPalette";
import ZenModeProvider from "@/components/ZenMode";
import PageVisitTracker from "@/components/shell/PageVisitTracker";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <ZenModeProvider>
            <div className="flex h-screen bg-zinc-950 text-zinc-50 font-sans overflow-hidden">
                <AdminSidebar />
                <PageVisitTracker />
                <main className="flex-1 overflow-y-auto bg-zinc-950 relative">
                    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full pt-16 lg:pt-8">
                        <AdminHeader />
                        <GlobalModuleSearch />
                        {children}
                    </div>
                </main>
                <CommandPalette />
            </div>
        </ZenModeProvider>
    );
}
