export interface ModuleConfig {
    name: string;
    icon: string;
    defaultPublic: boolean;
}

export const moduleRegistry: Record<string, ModuleConfig> = {
    portfolio: { name: "Portfolio", icon: "User", defaultPublic: true },
    blog: { name: "Blog", icon: "FileText", defaultPublic: true },
    expenses: { name: "Expenses", icon: "DollarSign", defaultPublic: false },
};
