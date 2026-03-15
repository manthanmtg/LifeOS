"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode } from "react";

const THEMES = [
    "one-dark",
    "dracula",
    "github-dark",
    "night-owl",
    "solarized-dark",
    "material-dark",
    "monokai",
    "cyberpunk",
    "aurora",
    "ocean-dark",
    "sunset",
    "coffee",
    "minimal-light",
    "nordic-light",
] as const;

export type ThemeName = (typeof THEMES)[number];

export { THEMES };

export default function ThemeProvider({ children, defaultTheme = "one-dark" }: { children: ReactNode; defaultTheme?: string }) {
    return (
        <NextThemesProvider
            attribute="data-theme"
            defaultTheme={defaultTheme}
            themes={[...THEMES]}
            enableSystem={false}
            disableTransitionOnChange={false}
        >
            {children}
        </NextThemesProvider>
    );
}
