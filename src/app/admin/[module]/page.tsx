import { notFound } from "next/navigation";
import { moduleRegistry } from "@/registry";
import dynamic from "next/dynamic";

export default async function AdminModulePage({
    params,
}: {
    params: Promise<{ module: string }>;
}) {
    const moduleName = (await params).module;

    const config = moduleRegistry[moduleName];
    if (!config) {
        notFound();
    }

    // Dynamically import the AdminView of the requested module.
    let DynamicModuleAdminView;
    try {
        DynamicModuleAdminView = dynamic(() =>
            import(`@/modules/${moduleName}/AdminView`).catch(() => {
                // Fallback to template if specific module doesn't exist yet
                return import(`@/modules/_template/AdminView`);
            })
        );
    } catch (err) {
        notFound();
    }

    return (
        <div className="animate-in fade-in duration-500">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                    {config.name} Management
                </h1>
                <p className="text-zinc-400">Manage data and configuration for the {config.name} module.</p>
            </header>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
                <DynamicModuleAdminView />
            </div>
        </div>
    );
}
