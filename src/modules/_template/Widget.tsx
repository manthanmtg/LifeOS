"use client";

/**
 * ═══════════════════════════════════════════════════════════════════
 *  WIDGET TEMPLATE — Reference implementation for the widget contract
 * ═══════════════════════════════════════════════════════════════════
 *
 *  RULES:
 *  1. Show only the most important metric + one detail. That's it.
 *  2. Total card height is hard-capped at WIDGET_MAX_HEIGHT (280px).
 *     Content that overflows is CLIPPED. In dev mode a red warning
 *     banner appears so you know you violated the contract.
 *  3. Use the widget primitives (WidgetStat, WidgetHighlight,
 *     WidgetMiniStats, WidgetList) — they are pre-sized to fit.
 *  4. Fetch from /api/widgets/summary — never pull full collections.
 *  5. No interactive elements (buttons, forms, inputs).
 *  6. No window.location navigation — use WidgetCard's `href` prop.
 *  7. Keep animations minimal (the card handles hover transitions).
 *
 *  RECOMMENDED LAYOUTS (pick ONE):
 *    A) WidgetStat + WidgetHighlight
 *    B) WidgetStat + WidgetMiniStats (max 3 cells)
 *    C) WidgetStat + WidgetList (max 2 items)
 *    D) WidgetStat alone
 *
 *  If your widget overflows, you put too much in it. Simplify.
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from "react";
import { Layout, AlertTriangle } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

interface Summary {
  total: number;
  alertMessage?: string;
}

export default function TemplateWidget() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/widgets/summary?module_type=YOUR_CONTENT_TYPE", {
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (!ac.signal.aborted) setData(d.data ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, []);

  return (
    <WidgetCard
      title="Module Name"
      icon={Layout}
      loading={loading}
      href="/admin/your-module"
      footer={
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Secondary info here
        </div>
      }
    >
      {data && (
        <div className="space-y-3">
          <WidgetStat value={data.total} label="items tracked" />
          {data.alertMessage && (
            <WidgetHighlight
              icon={AlertTriangle}
              text={data.alertMessage}
              variant="warning"
            />
          )}
        </div>
      )}
    </WidgetCard>
  );
}
