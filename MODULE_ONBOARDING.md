# Life OS — Module Onboarding Guide

This document outlines the end-to-end process for creating and integrating a new module into Life OS. Life OS is designed to be highly modular, allowing you to easily plug and play new content types effortlessly.

---

## 🏗️ 1. Register the Module

The very first step to introduce a new module to Life OS is adding it to the **Module Registry**. This centralizes visibility and meta configurations.

**File:** `src/registry.ts`

Add your new module config:
```typescript
export const moduleRegistry: Record<string, ModuleConfig> = {
    // ... existing modules
    my_new_module: { 
        name: "My New Module", 
        icon: "Box", // Use a Lucide React icon name
        defaultPublic: false, // Whether the module is public by default
        contentType: "my_new_payload_type" // Database collection discriminator
    },
};
```

---

## 🗄️ 2. Define the Schema (Optional but Recommended)

Although the database accepts generic JSON in the `payload` field, you should define a Zod schema for your module to enforce data integrity.

**File:** `src/lib/schemas.ts`

```typescript
import { z } from "zod";

export const MyNewModuleSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    status: z.enum(["active", "archived"]),
    // Add additional specialized fields here...
});
```

*(Note: Validation happens inside the `/api/content` route, so you only need to add your schema to the validation map if you strictly enforce payloads).*

---

## ⚙️ 3. Create the Admin View

The Admin View handles the CRUD (Create, Read, Update, Delete) operations and settings for your module.

**Location:** `src/modules/my_new_module/AdminView.tsx`

### Boilerplate Features to Include:
1. **Data Fetching:** Fetch items from `/api/content?module_type=my_new_payload_type`.
2. **Settings Hook:** If your module needs global settings (e.g., default categories, currencies), use the `useModuleSettings` hook:
   ```tsx
   import { useModuleSettings } from "@/hooks/useModuleSettings";
   
   const DEFAULTS = { defaultStatus: "active" };
   const { settings, updateSettings, saving } = useModuleSettings("myNewModuleSettings", DEFAULTS);
   ```
3. **Settings Panel UI:** Add a ⚙️ `Settings` button near the "Add Item" button that triggers a dropdown/panel to modify the hook state.
4. **Form Logic:** Manage a form to Create/Edit items with `POST`/`PUT` to `/api/content`.
5. **List View:** Render cards for the fetched items with generic edit/delete capabilities.

---

## 🌐 4. Create the Public View

The Public View handles the read-only presentation of your module to unauthorized visitors (if the module is enabled and set to public in the Settings page).

**Location:** `src/modules/my_new_module/PublicView.tsx`

### Guidelines:
- Accept `items: Record<string, unknown>[]` as a prop.
- Cast `items` to your specific interface schema.
- Map the items into a clean, read-only UI.
- Do **not** include edit/delete buttons or sensitive payloads (e.g. costs or private API keys) if you don't want them exposed.

```tsx
"use client";

import { Box } from "lucide-react";

interface MyItem {
    _id: string;
    payload: { title: string; description?: string; status: string };
}

export default function MyNewModulePublicView({ items }: { items: Record<string, unknown>[] }) {
    const data = items as unknown as MyItem[];

    if (data.length === 0) {
        return (
            <div className="text-center text-zinc-500 py-20">
                <Box className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No items shared yet.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.map((item) => (
                <div key={item._id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <h3 className="text-white font-medium">{item.payload.title}</h3>
                    <p className="text-zinc-500 text-sm mt-1">{item.payload.description}</p>
                </div>
            ))}
        </div>
    );
}
```

---

## 📊 5. Create the Dashboard Widget

The "Command Center" dashboard at `/admin` is composed of dynamic widgets. Each module should have a `Widget.tsx` component that renders a high-level summary.

**Location:** `src/modules/my_new_module/Widget.tsx`

### Guidelines:
- Fetch the data directly within the component (since they are embedded client-side).
- Return a standard-sized card layout.
- Use `lucide-react` icons and format the UI cleanly.

```tsx
"use client";

import { useState, useEffect } from "react";
import { Box } from "lucide-react";

export default function MyNewModuleWidget() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        fetch("/api/content?module_type=my_new_payload_type")
            .then((r) => r.json())
            .then((d) => setCount(d.data?.length || 0))
            .catch(() => {});
    }, []);

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors h-full flex flex-col justify-between group">
            <div className="flex items-start justify-between mb-4">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest shrink-0">My Module</p>
                <Box className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
            </div>
            <div>
                <p className="text-3xl font-bold text-white mb-1">{count}</p>
                <p className="text-xs text-zinc-500">total tracked items</p>
            </div>
        </div>
    );
}
```

### 🔌 Next: Wire the widget to the dashboard

Open `src/app/admin/page.tsx` and dynamically import your new widget:

```tsx
// src/app/admin/page.tsx
import dynamic from "next/dynamic";
import Link from "next/link";

// 1. Add the dynamic import
const MyNewModuleWidget = dynamic(() => import("@/modules/my_new_module/Widget"), { ssr: false });

export default function AdminDashboard() {
    return (
        // ...
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 2. Add the route wrapping the widget */}
            <Link href="/admin/my_new_module" className="hover:scale-[1.01] transition-transform">
                <MyNewModuleWidget />
            </Link>
        </div>
    );
}
```

---

## 🔗 6. Wire the Public View into the Dynamic Switcher

Finally, you must explicitly import your `PublicView` into the dynamic route dispatcher so Next.js knows how to render your URL slug.

**File:** `src/app/[module]/page.tsx`

```tsx
/* Add to the top imports */
const publicViews: Record<string, ComponentType<{ items: Record<string, unknown>[] }>> = {
    // ... existing
    my_new_module: dynamic(() => import("@/modules/my_new_module/PublicView")),
};

/* Add a brief description for the hero header */
const moduleDescriptions: Record<string, string> = {
    // ... existing
    my_new_module: "An awesome new tracking tool for my workflow.",
};
```

---

## 🎯 Final Checklist

- [ ] Registered slug, icon, and default visibility in `src/registry.ts`.
- [ ] Registered Zod schema in `src/lib/schemas.ts` (optional).
- [ ] Created `AdminView.tsx` in `src/modules/my_new_module/`.
- [ ] Created `Widget.tsx` and wired it into `src/app/admin/page.tsx`.
- [ ] Created `PublicView.tsx` and wired it into `src/app/[module]/page.tsx`.
- [ ] Evaluated if settings are needed and implemented the `useModuleSettings` hook.
- [ ] Verified build (`pnpm run build`).

That's it! Life OS handles the dynamic rendering, API routing, MongoDB scoping (via `module_type`), sidebar generation, and system state persistence entirely for you.
