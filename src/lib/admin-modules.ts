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
  tieredVisits?: Record<
    string,
    {
      admin: [number, number, number, number];
      public: [number, number, number, number];
    }
  >;
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

      const getTiers = (key: string): [number, number, number, number] => {
        const adminTiers = config?.tieredVisits?.[key]?.admin || [0, 0, 0, 0];
        const publicTiers = config?.tieredVisits?.[key]?.public || [0, 0, 0, 0];

        if (scope === "admin") return adminTiers;
        if (scope === "public") return publicTiers;
        return [
          adminTiers[0] + publicTiers[0],
          adminTiers[1] + publicTiers[1],
          adminTiers[2] + publicTiers[2],
          adminTiers[3] + publicTiers[3],
        ];
      };

      const tiersA = getTiers(a.key);
      const tiersB = getTiers(b.key);

      // Compare 7-day, then 30-day, then 60-day, then 90-day
      for (let i = 0; i < 4; i++) {
        const diff = tiersB[i] - tiersA[i];
        if (diff !== 0) return diff;
      }

      // Fallback to name if tie across all 90 days
      return a.name.localeCompare(b.name);
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
