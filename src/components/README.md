# Core Components

This directory contains the shared UI architecture of LifeOS. The components are categorized by their role in the system.

## Directory Structure

### `/dashboard` (The Widget Contract)
These components are the building blocks for all modules' `Widget.tsx` exports on the dashboard. They enforce strict visual and structural constraints.

- **`WidgetCard.tsx`**: The mandatory wrapper for all dashboard widgets. It acts as an error boundary and enforces the `WIDGET_MAX_HEIGHT` (280px). In development mode, it uses a ResizeObserver to warn if content overflows the contract bounds. It also handles the interactive hover state and routing.
- **`widget-primitives.tsx`**: The Lego bricks of the dashboard. Widgets must be built exclusively from these:
  - `WidgetStat`: The hero number. Every widget must have one.
  - `WidgetHighlight`: A spotlight row for one key detail.
  - `WidgetMiniStats`: A row of up to 3 compact stats.
  - `WidgetList`: A compact list hard-capped at 2 items to prevent overflow.

### `/shell` (The Application Frame)
Structural components that form the outer layout of the app.
- Includes `AdminSidebar`, `AdminHeader`, `GlobalModuleSearch`, and layout wrappers. These manage navigation and global state like search.

### `/ui` (Atomic Elements)
Reusable, standalone UI components.
- Buttons, Dialogs (`ConfirmDialog`), Inputs (`Switch`), loading states (`Skeletons`), and utilities (`CommandPalette`, `Toast`).

### `/analytics`
- **`MetricsTracker.tsx`**: Shared analytics primitives to track engagement across the application.

### Root Level
- **`ZenMode.tsx`**: A global provider that hides distracting UI elements when triggered via `Cmd/Ctrl + Shift + Z`.
- **`MarkdownRenderer.tsx`**: Standardized markdown rendering with `react-markdown` and `remark-gfm`, styled to match the dark theme via Tailwind typography plugin.
- **`ThemeProvider.tsx`**: Manages the application's color theme.

## Design Philosophy

1. **Strict Contracts**: Dashboard widgets are intentionally constrained. The limited space ensures the dashboard remains a scannable dashboard, not a scrolling feed.
2. **"Zinc" Aesthetic**: Built heavily on Tailwind's `zinc` neutral palette with minimal, intentional bursts of semantic colors (`accent`, `warning`, `success`, `danger`).
3. **Client-side Interactivity**: Most of these components use the `"use client"` directive, relying on React hooks for interactivity and DOM measurement.
