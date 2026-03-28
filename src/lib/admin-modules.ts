import { moduleRegistry } from "@/registry";

export interface ModuleVisibility {
  enabled: boolean;
  isPublic: boolean;
}

export interface SystemConfig {
  site_title?: string;
  site_icon?: string;
  moduleOrder?: string[];
  moduleRegistry?: Record<string, ModuleVisibility>;
  orderingStrategy?: "custom" | "name" | "visits";
  visitSortScope?: "admin" | "public" | "all";
  pageVisits?: Record<string, number>;
  publicPageVisits?: Record<string, number>;
}

export interface AdminModuleItem {
  key: string;
  href: string;
  name: string;
  description: string;
  tags: string[];
  icon: string;
}

export function getDisabledModules(config: SystemConfig | null | undefined) {
  const disabled = new Set<string>();

  for (const [key, visibility] of Object.entries(
    config?.moduleRegistry || {},
  )) {
    if (!visibility.enabled) {
      disabled.add(key);
    }
  }

  return disabled;
}

export function getOrderedAdminModules(
  config: SystemConfig | null | undefined,
) {
  const disabledModules = getDisabledModules(config);
  const modules: AdminModuleItem[] = Object.entries(moduleRegistry)
    .filter(([key]) => !disabledModules.has(key))
    .map(([key, module]) => ({
      key,
      href: `/admin/${key}`,
      name: module.name,
      description: module.description,
      tags: module.tags,
      icon: module.icon,
    }));

  const strategy = config?.orderingStrategy || "custom";

  return modules.sort((a, b) => {
    if (strategy === "name") {
      return a.name.localeCompare(b.name);
    }

    if (strategy === "visits") {
      const scope = config?.visitSortScope || "admin";
      const getVisits = (key: string) => {
        const adminVisits = config?.pageVisits?.[key] || 0;
        const publicVisits = config?.publicPageVisits?.[key] || 0;
        if (scope === "admin") return adminVisits;
        if (scope === "public") return publicVisits;
        return adminVisits + publicVisits;
      };
      return getVisits(b.key) - getVisits(a.key);
    }

    const order = config?.moduleOrder || [];
    if (order.length === 0) {
      return 0;
    }

    const indexA = order.indexOf(a.key);
    const indexB = order.indexOf(b.key);

    if (indexA === -1 && indexB === -1) {
      return 0;
    }

    if (indexA === -1) {
      return 1;
    }

    if (indexB === -1) {
      return -1;
    }

    return indexA - indexB;
  });
}
