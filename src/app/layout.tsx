import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import ThemeProvider from "@/components/ThemeProvider";
import MetricsTracker from "@/components/analytics/MetricsTracker";
import { ensureSystemConfig } from "@/lib/seed";
import { getDb } from "@/lib/mongodb";
import { SystemConfig } from "@/lib/types";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export async function generateMetadata(): Promise<Metadata> {
  let title = "Life OS";
  let icon = "/favicon.ico";

  try {
    const db = await getDb();
    const portfolio = await db.collection("content").findOne({ module_type: "portfolio_profile" });
    const config = await db.collection<SystemConfig>("system").findOne({ _id: "global" });

    if (portfolio?.payload?.full_name) {
      title = portfolio.payload.full_name;
    } else if (config?.site_title) {
      title = config.site_title;
    }

    if (config?.site_icon) {
      icon = config.site_icon;
    }
  } catch {
    // Fallback
  }

  return {
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description: "A high-fidelity, open-source template framework for personal portfolio and life management.",
    icons: {
      icon: icon,
      apple: icon,
    },
    manifest: "/manifest.webmanifest",
    themeColor: "#000000",
    viewport: {
      width: "device-width",
      initialScale: 1,
      maximumScale: 1,
      userScalable: false,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await ensureSystemConfig();

  // Fetch the active theme and branding from the database
  let activeTheme = "one-dark";
  let colorMode = "dark";

  try {
    const db = await getDb();
    const config = await db.collection<SystemConfig>("system").findOne({ _id: "global" });
    if (config?.active_theme) {
      activeTheme = config.active_theme;
    }
    if (config?.color_mode) {
      colorMode = config.color_mode;
    }

    await db.collection("content").findOne({ module_type: "portfolio_profile" });
  } catch {
    // Fallback to default on error
  }

  return (
    <html lang="en" className={colorMode} data-theme={activeTheme} suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider defaultTheme={activeTheme}>
          <Suspense fallback={null}>
            <MetricsTracker />
          </Suspense>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
