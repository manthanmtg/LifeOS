import AdminSidebar from "@/components/shell/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-zinc-950 text-zinc-50 font-sans">
            <AdminSidebar />
            <main className="flex-1 overflow-y-auto bg-zinc-950">
                <div className="p-8 max-w-6xl mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
