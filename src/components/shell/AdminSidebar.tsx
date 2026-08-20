"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo, useLayoutEffect } from "react";
import { getOrderedAdminModules, type AdminModuleItem, type SystemConfig } from "@/lib/admin-modules";
import {
  LayoutDashboard,
  Settings,
  User,
  FileText,
  DollarSign,
  LogOut,
  CreditCard,
  X,
  BookOpen,
  Library,
  Lightbulb,
  Code,
  Target,
  BarChart3,
  Calculator,
  Wheat,
  CloudRain,
  CheckSquare,
  ExternalLink,
  Bot,
  Users,
  Car,
  Wrench,
  Home,
  Map,
  ShoppingBag,
  HeartPulse,
  PenLine,
  Tv,
  Presentation,
  Receipt,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import GlobalModuleSearch from "@/components/shell/GlobalModuleSearch";
import { moduleRegistry } from "@/registry";

interface LinkItem {
  href: string;
  name: string;
  icon: LucideIcon;
}

function renderNavLinks(
  links: LinkItem[],
  pathname: string,
  setMobileOpen: (v: boolean) => void,
  label: string,
) {
  return (
    <nav className="space-y-1" aria-label={label}>
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMobileOpen(false)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 text-zinc-400 hover:text-zinc-200",
              isActive
                ? "text-accent font-medium"
                : "hover:bg-zinc-900 hover:text-zinc-300",
            )}
          >
            {isActive && (
              <motion.div
                layoutId="sidebar-active-pill"
                className="absolute inset-0 rounded-md bg-zinc-800/50 border-l-2 border-accent shadow-[inset_3px_0_8px_-4px_var(--accent)]"
                transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              />
            )}
            <Icon
              className={cn(
                "w-4 h-4 relative z-10",
                isActive ? "text-accent" : "text-zinc-400",
              )}
              aria-hidden="true"
            />
            <span className="relative z-10">{link.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const IconMap: Record<string, LucideIcon> = {
  User,
  FileText,
  DollarSign,
  LayoutDashboard,
  Settings,
  CreditCard,
  BookOpen,
  Library,
  Lightbulb,
  Code,
  Target,
  BarChart3,
  Calculator,
  Wheat,
  CloudRain,
  CheckSquare,
  Bot,
  Users,
  Car,
  Wrench,
  Home,
  Map,
  ShoppingBag,
  HeartPulse,
  PenLine,
  Tv,
  Presentation,
  Receipt,
  WalletCards,
};

export const ADMIN_SIDEBAR_CACHE_KEY = "lifeos-admin-sidebar-order-v1";

const registryModules: AdminModuleItem[] = Object.entries(moduleRegistry).map(
  ([key, module]) => ({
    key,
    href: `/admin/${key}`,
    name: module.name,
    description: module.description,
    tags: module.tags,
    icon: module.icon,
  }),
);

const registryModuleMap = new Map(registryModules.map((module) => [module.key, module]));

function readCachedModuleOrder(): string[] | null {
  try {
    const raw = window.localStorage.getItem(ADMIN_SIDEBAR_CACHE_KEY);
    if (raw === null) return null;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    const normalized = Array.from(
      new Set(
        parsed.filter((value): value is string => typeof value === "string"),
      ),
    );

    return normalized;
  } catch {
    return null;
  }
}

function writeCachedModuleOrder(order: string[]) {
  try {
    window.localStorage.setItem(
      ADMIN_SIDEBAR_CACHE_KEY,
      JSON.stringify(order),
    );
  } catch {
    // localStorage unavailable or quota issue; fail silently
  }
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [siteTitle, setSiteTitle] = useState("Life OS");
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [cachedModuleOrder, setCachedModuleOrder] = useState<string[] | null>(
    null,
  );

  useLayoutEffect(() => {
    const cached = readCachedModuleOrder();
    if (cached !== null) {
      setCachedModuleOrder(cached);
    }
  }, []);

  useEffect(() => {
    async function loadConfig() {
      const cached = readCachedModuleOrder();
      try {
        const r = await fetch("/api/system");
        const d = await r.json();
        const cfg = d.data as SystemConfig | undefined;
        if (cfg?.site_title) {
          setSiteTitle(cfg.site_title);
        }
        setConfig(cfg || null);

        const orderedModules = getOrderedAdminModules(cfg || null);
        const orderedKeys = orderedModules.map((module) => module.key);
        writeCachedModuleOrder(orderedKeys);

        if (cached === null) {
          setCachedModuleOrder(orderedKeys);
        }
      } catch {
        if (cached === null) {
          const orderedModules = getOrderedAdminModules(null);
          const fallbackKeys = orderedModules.map((module) => module.key);
          setCachedModuleOrder(fallbackKeys);
        }
        // silently fail
      }
    }
    loadConfig();
  }, []);

  useEffect(() => {
    if (!config?.site_icon) return;
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) link.href = config.site_icon;
    const apple = document.querySelector<HTMLLinkElement>(
      'link[rel="apple-touch-icon"]',
    );
    if (apple) apple.href = config.site_icon;
  }, [config?.site_icon]);

  const sortedModules = useMemo(() => {
    const moduleOrder = cachedModuleOrder
      ? cachedModuleOrder
          .map((moduleKey) => registryModuleMap.get(moduleKey))
          .filter((module): module is AdminModuleItem => Boolean(module))
          .map((module) => ({
            href: module.href,
            name: module.name,
            icon: IconMap[module.icon] || User,
          }))
      : getOrderedAdminModules(config).map((module) => ({
        href: module.href,
        name: module.name,
        icon: IconMap[module.icon] || User,
      }));

    return moduleOrder;
  }, [cachedModuleOrder, config]);

  const links = useMemo(
    () => [
      { href: "/admin", name: "Dashboard", icon: LayoutDashboard },
      ...sortedModules,
      { href: "/admin/settings", name: "System Settings", icon: Settings },
    ],
    [sortedModules],
  );

  useEffect(() => {
    const handler = () => setMobileOpen(true);
    window.addEventListener("open-mobile-sidebar", handler);
    return () => window.removeEventListener("open-mobile-sidebar", handler);
  }, []);

  return (
    <>
      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 h-screen w-[85vw] max-w-[280px] bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 border-r border-zinc-800/80 flex flex-col text-sm text-zinc-400 z-[70] shadow-lg shadow-zinc-950/40"
            >
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-3 min-w-0">
                  {config?.site_icon ? (
                    <Image
                      src={config.site_icon}
                      alt=""
                      width={32}
                      height={32}
                      unoptimized
                      className="w-8 h-8 rounded-lg object-contain shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                      <LayoutDashboard className="w-4 h-4 text-accent" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-zinc-50 font-semibold tracking-tight text-lg leading-tight truncate">
                      {siteTitle}
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Admin Command Center
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-2 -mr-2 flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300 shrink-0 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-4 space-y-1 pb-2">
                {renderNavLinks(
                  links.slice(0, 1),
                  pathname,
                  setMobileOpen,
                  "Main navigation",
                )}
                <GlobalModuleSearch variant="sidebar" />
              </div>
              <div className="flex-1 px-4 space-y-1 overflow-y-auto min-h-0">
                {renderNavLinks(
                  links.slice(1),
                  pathname,
                  setMobileOpen,
                  "Modules",
                )}
              </div>
              <div className="p-4 border-t border-zinc-800 space-y-1">
                <Link
                  href="/?public=1"
                  onClick={() => setMobileOpen(false)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
                >
                  <ExternalLink className="w-4 h-4" /> Public View
                </Link>
                <button
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    window.location.href = "/";
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-zinc-400 hover:bg-zinc-900 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full w-64 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 border-r border-zinc-800/80 flex-col text-sm text-zinc-400 shrink-0 shadow-xl shadow-zinc-950/25">
        <div className="p-6">
          <div className="flex items-center gap-3 min-w-0">
            {config?.site_icon ? (
              <Image
                src={config.site_icon}
                alt=""
                width={32}
                height={32}
                unoptimized
                className="w-8 h-8 rounded-lg object-contain shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                <LayoutDashboard className="w-4 h-4 text-accent" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-zinc-50 font-semibold tracking-tight text-lg leading-tight truncate">
                {siteTitle}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Admin Command Center
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 space-y-1 pb-2">
          {renderNavLinks(
            links.slice(0, 1),
            pathname,
            setMobileOpen,
            "Main navigation",
          )}
          <GlobalModuleSearch variant="sidebar" />
        </div>
        <div className="flex-1 px-4 space-y-1 overflow-y-auto min-h-0">
          {renderNavLinks(links.slice(1), pathname, setMobileOpen, "Modules")}
        </div>
        <div className="p-4 border-t border-zinc-800 mt-auto space-y-1">
          <Link
            href="/?public=1"
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
          >
            <ExternalLink className="w-4 h-4" /> Public View
          </Link>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/";
            }}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-zinc-400 hover:bg-zinc-900 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>
    </>
  );
}
