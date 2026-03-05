export default function AdminDashboard() {
    return (
        <div className="animate-in fade-in duration-500">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Command Center</h1>
                <p className="text-zinc-400">Welcome back. Here is your Life OS overview.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Placeholder for Bento-grid widgets */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-48 flex items-center justify-center text-zinc-500">
                    Widget Area (Phase 3)
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-48 flex items-center justify-center text-zinc-500">
                    Widget Area (Phase 3)
                </div>
            </div>
        </div>
    );
}
