import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ensureSystemConfig } from "@/lib/seed";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Life OS",
  description: "A professional portfolio and private life-management dashboard.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Ensure the database is seeded on app render (development/first run)
  await ensureSystemConfig();

  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-50 antialiased`}>
        {children}
      </body>
    </html>
  );
}
