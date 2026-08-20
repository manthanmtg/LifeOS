"use client";

import AdminSidebar from "@/components/shell/AdminSidebar";
import AdminHeader from "@/components/shell/AdminHeader";
import CommandPalette from "@/components/ui/CommandPalette";
import ZenModeProvider from "@/components/ZenMode";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <ZenModeProvider>
      <div className="flex h-dvh bg-zinc-950 text-zinc-50 font-sans overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto bg-zinc-950 relative">
          <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full [padding-top:calc(3.5rem+env(safe-area-inset-top))] lg:pt-6 [padding-bottom:max(1.5rem,env(safe-area-inset-bottom))]">
            <AdminHeader />
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </div>
        </main>
        <CommandPalette />
      </div>
    </ZenModeProvider>
  );
}
