import { notFound } from "next/navigation";
import { moduleRegistry } from "@/registry";
import dynamic from "next/dynamic";
import { AdminModuleSkeleton } from "@/components/ui/Skeletons";

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
    const DynamicModuleAdminView = dynamic(
        () =>
            import(`@/modules/${moduleName}/AdminView`).catch(() => {
                return import(`@/modules/_template/AdminView`);
            }),
        { loading: () => <AdminModuleSkeleton /> }
    );

    return <DynamicModuleAdminView />;
}
