# Core Components

This directory contains the shared UI architecture of LifeOS. The components are categorized by their role in the system.

## Directory Structure

### `/dashboard` (The Widget Contract)

These components are the building blocks for all modules' `Widget.tsx` exports on the dashboard. They enforce strict visual and structural constraints.

- **`WidgetCard.tsx`**: The mandatory wrapper for all dashboard widgets. It enforces the `WIDGET_MAX_HEIGHT` (280px). In development mode, it uses a ResizeObserver to warn if content overflows the contract bounds. It also handles the interactive hover state and routing.
- **`widget-primitives.tsx`**: The Lego bricks of the dashboard. Widgets must be built exclusively from these:
  - `WidgetStat`: The hero number. Every widget must have one.
  - `WidgetHighlight`: A spotlight row for one key detail.
  - `WidgetMiniStats`: A row of up to 3 compact stats.
  - `WidgetList`: A compact list hard-capped at 2 items to prevent overflow.

### `/shell` (The Application Frame)

Structural components that form the outer layout of the app.

- Includes `AdminSidebar`, `AdminHeader`, `PublicHeader`, `PublicFooter`, `GlobalModuleSearch`, and layout wrappers. These manage navigation and global state like search.

### `/ui` (Atomic Elements)

Reusable, standalone UI components.

- Buttons (`Button`), Dialogs (`ConfirmDialog`), Inputs (`Switch`), loading states (`Skeletons`), file previewing (`ImagePreview`, `ImageCropper`, `DocPreview`), and utilities (`CommandPalette`, `Toast`).
- `Button` centralizes variants, sizes, focus rings, disabled states, and active press feedback for standard button elements.
- `Toast` renders status, error, and info notifications with semantic color tokens, optional action buttons, close controls, and accessible live-region roles.

### `/analytics`

- **`MetricsTracker.tsx`**: Shared analytics primitives to track engagement across the application.

### Root Level

- **`ZenMode.tsx`**: A global provider that hides distracting UI elements when triggered via `Cmd/Ctrl + Shift + Z`.
- **`MarkdownRenderer.tsx`**: Standardized markdown rendering with `react-markdown` and `remark-gfm`, styled to match the dark theme via Tailwind typography plugin.
- **`ThemeProvider.tsx`**: Manages the application's color theme.

## Example Usage

### Dashboard Widget

A strict, valid example of combining dashboard primitives into a module widget.

```tsx
import { Wallet } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetMiniStats,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

type FinanceWidgetData = {
  balance: string;
  income: string;
  expenses: string;
};

type MyFinanceWidgetProps = {
  loading: boolean;
  data?: FinanceWidgetData;
};

export function MyFinanceWidget({ loading, data }: MyFinanceWidgetProps) {
  return (
    <WidgetCard
      title="Finances"
      icon={Wallet}
      href="/admin/finance"
      loading={loading}
      accentColor="success"
    >
      <div className="space-y-4">
        <WidgetStat value={data?.balance ?? "$4,250"} label="Current Balance" />
        <WidgetMiniStats
          stats={[
            {
              value: data?.income ?? "$1,200",
              label: "Income",
              color: "success",
            },
            {
              value: data?.expenses ?? "$300",
              label: "Expenses",
              color: "danger",
            },
          ]}
        />
        <WidgetHighlight
          icon={Wallet}
          text="Budget on track"
          variant="success"
        />
      </div>
    </WidgetCard>
  );
}
```

## Design Philosophy

1. **Strict Contracts**: Dashboard widgets are intentionally constrained. The limited space ensures the dashboard remains a scannable dashboard, not a scrolling feed.
2. **"Zinc" Aesthetic**: Built heavily on Tailwind's `zinc` neutral palette with minimal, intentional bursts of semantic colors (`accent`, `warning`, `success`, `danger`).
3. **Client-side Interactivity**: Most of these components use the `"use client"` directive, relying on React hooks for interactivity and DOM measurement.
