"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode } from "react";

const THEMES = [
    "one-dark",
    "dracula",
    "studio-dark", 
    "nordic-light",
    "cyberpunk",
    "midnight-one",
    "vampire",
    "sunset",
    "ocean-dark",
    "forest-night",
    "aurora",
    "neon-glow",
    "minimal-light",
    "coffee",
    "lavender-dream",
    "solarized-dark",
    "github-dark",
    "monokai",
    "material-dark",
    "night-owl",
    "winter-blue",
    "autumn-warm",
    "spring-bloom",
    "cosmic-purple",
    "terminal-green",
    "royal-navy",
    "blush-pink",
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
