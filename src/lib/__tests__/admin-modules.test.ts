import { describe, it, expect, vi } from "vitest";
import {
  getDisabledModules,
  getOrderedAdminModules,
  SystemConfig,
} from "../admin-modules";

vi.mock("@/registry", () => ({
  moduleRegistry: {
    m1: {
      name: "Module B",
      icon: "icon1",
      description: "desc1",
      tags: ["tag1"],
    },
    m2: {
      name: "Module A",
      icon: "icon2",
      description: "desc2",
      tags: ["tag2"],
    },
    m3: {
      name: "Module C",
      icon: "icon3",
      description: "desc3",
      tags: ["tag3"],
    },
  },
}));

describe("admin-modules", () => {
  describe("getDisabledModules", () => {
    it("returns empty set when config is null", () => {
      expect(getDisabledModules(null)).toEqual(new Set());
    });

    it("returns empty set when moduleRegistry is missing", () => {
      expect(getDisabledModules({})).toEqual(new Set());
    });

    it("correctly identifies disabled modules", () => {
      const config: SystemConfig = {
        moduleRegistry: {
          m1: { enabled: true, isPublic: true },
          m2: { enabled: false, isPublic: false },
        },
      };
      const disabled = getDisabledModules(config);
      expect(disabled.has("m2")).toBe(true);
      expect(disabled.has("m1")).toBe(false);
      expect(disabled.size).toBe(1);
    });
  });

  describe("getOrderedAdminModules", () => {
    it("filters out disabled modules", () => {
      const config: SystemConfig = {
        moduleRegistry: {
          m1: { enabled: false, isPublic: true },
        },
      };
      const modules = getOrderedAdminModules(config);
      expect(modules.find((m) => m.key === "m1")).toBeUndefined();
      expect(modules.length).toBe(2); // m2 and m3 should be there
    });

    it("sorts by name when strategy is 'name'", () => {
      const config: SystemConfig = {
        orderingStrategy: "name",
      };
      const modules = getOrderedAdminModules(config);
      expect(modules[0].name).toBe("Module A");
      expect(modules[1].name).toBe("Module B");
      expect(modules[2].name).toBe("Module C");
    });

    it("sorts by custom order when strategy is 'custom'", () => {
      const config: SystemConfig = {
        orderingStrategy: "custom",
        moduleOrder: ["m3", "m1", "m2"],
      };
      const modules = getOrderedAdminModules(config);
      expect(modules[0].key).toBe("m3");
      expect(modules[1].key).toBe("m1");
      expect(modules[2].key).toBe("m2");
    });

    it("puts unlisted modules at the end in 'custom' strategy", () => {
      const config: SystemConfig = {
        orderingStrategy: "custom",
        moduleOrder: ["m3"],
      };
      const modules = getOrderedAdminModules(config);
      expect(modules[0].key).toBe("m3");
      // order of m1 and m2 is not guaranteed to be stable by the sort function return 0,
      // but they should be after m3.
      expect(modules.slice(1).map((m) => m.key)).toContain("m1");
      expect(modules.slice(1).map((m) => m.key)).toContain("m2");
    });

    it("sorts by visits (admin scope) when strategy is 'visits'", () => {
      const config: SystemConfig = {
        orderingStrategy: "visits",
        visitSortScope: "admin",
        tieredVisits: {
          m1: { admin: [10, 0, 0, 0], public: [0, 0, 0, 0] },
          m2: { admin: [5, 0, 0, 0], public: [0, 0, 0, 0] },
          m3: { admin: [20, 0, 0, 0], public: [0, 0, 0, 0] },
        },
      };
      const modules = getOrderedAdminModules(config);
      expect(modules[0].key).toBe("m3"); // 20
      expect(modules[1].key).toBe("m1"); // 10
      expect(modules[2].key).toBe("m2"); // 5
    });

    it("sorts by visits (public scope) when strategy is 'visits'", () => {
      const config: SystemConfig = {
        orderingStrategy: "visits",
        visitSortScope: "public",
        tieredVisits: {
          m1: { admin: [0, 0, 0, 0], public: [10, 0, 0, 0] },
          m2: { admin: [0, 0, 0, 0], public: [20, 0, 0, 0] },
          m3: { admin: [0, 0, 0, 0], public: [5, 0, 0, 0] },
        },
      };
      const modules = getOrderedAdminModules(config);
      expect(modules[0].key).toBe("m2"); // 20
      expect(modules[1].key).toBe("m1"); // 10
      expect(modules[2].key).toBe("m3"); // 5
    });

    it("sorts by visits (all scope) when strategy is 'visits'", () => {
      const config: SystemConfig = {
        orderingStrategy: "visits",
        visitSortScope: "all",
        tieredVisits: {
          m1: { admin: [5, 0, 0, 0], public: [5, 0, 0, 0] }, // 10
          m2: { admin: [2, 0, 0, 0], public: [1, 0, 0, 0] }, // 3
          m3: { admin: [10, 0, 0, 0], public: [10, 0, 0, 0] }, // 20
        },
      };
      const modules = getOrderedAdminModules(config);
      expect(modules[0].key).toBe("m3");
      expect(modules[1].key).toBe("m1");
      expect(modules[2].key).toBe("m2");
    });

    it("compares subsequent tiers if first tier is tied in 'visits'", () => {
      const config: SystemConfig = {
        orderingStrategy: "visits",
        visitSortScope: "admin",
        tieredVisits: {
          m1: { admin: [10, 5, 0, 0], public: [0, 0, 0, 0] },
          m2: { admin: [10, 10, 0, 0], public: [0, 0, 0, 0] },
          m3: { admin: [5, 0, 0, 0], public: [0, 0, 0, 0] },
        },
      };
      const modules = getOrderedAdminModules(config);
      expect(modules[0].key).toBe("m2"); // 10, 10
      expect(modules[1].key).toBe("m1"); // 10, 5
      expect(modules[2].key).toBe("m3"); // 5
    });

    it("falls back to name when all visit tiers are tied", () => {
      const config: SystemConfig = {
        orderingStrategy: "visits",
        visitSortScope: "admin",
        tieredVisits: {
          m1: { admin: [10, 10, 10, 10], public: [0, 0, 0, 0] }, // Module B
          m2: { admin: [10, 10, 10, 10], public: [0, 0, 0, 0] }, // Module A
        },
      };
      const modules = getOrderedAdminModules(config);
      expect(modules[0].key).toBe("m2"); // Module A comes before Module B
      expect(modules[1].key).toBe("m1");
    });
  });
});
