"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarDays,
  Coins,
  WalletCards,
} from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetHighlight,
  WidgetMiniStats,
  WidgetStat,
} from "@/components/dashboard/widget-primitives";
import type { ExpenseSpacesWidgetSummary } from "./types";

export default function ExpenseSpacesWidget() {
  const [summary, setSummary] = useState<ExpenseSpacesWidgetSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/widgets/summary?module_type=expense_space", {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`summary request failed: ${response.status}`);
        }
        return response.json();
      })
      .then((body) => {
        setSummary(body.data ?? null);
        setError(false);
      })
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setSummary(null);
        setError(true);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return (
    <WidgetCard
      title="Expense Spaces"
      icon={WalletCards}
      loading={loading}
      href="/admin/expense-spaces"
    >
      {error || !summary ? (
        <div className="space-y-3">
          <WidgetStat value="—" label="active spaces" />
          <WidgetHighlight
            icon={AlertTriangle}
            text="Summary unavailable"
            subtext="Open the module to retry"
            variant="danger"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <WidgetStat value={summary.active_spaces} label="active spaces" />
          <WidgetMiniStats
            stats={[
              {
                value: summary.entries_this_month,
                label: "this month",
                icon: CalendarDays,
              },
              {
                value: summary.spaces_with_budgets,
                label: "budgets",
                icon: BadgeDollarSign,
                color: "success",
              },
              {
                value: summary.currencies_in_use,
                label: "currencies",
                icon: Coins,
                color: "warning",
              },
            ]}
          />
        </div>
      )}
    </WidgetCard>
  );
}
