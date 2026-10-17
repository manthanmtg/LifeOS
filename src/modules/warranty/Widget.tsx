"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetHighlight,
  WidgetStat,
} from "@/components/dashboard/widget-primitives";

interface WarrantySummary {
  tracked_items: number;
  expiring_items: number;
  next_expiry: {
    item_name: string;
    coverage_label: string;
    days_remaining: number;
  } | null;
}

export default function WarrantyWidget() {
  const [summary, setSummary] = useState<WarrantySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/widgets/summary?module_type=warranty_item", {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok) throw new Error(body.error || "Summary unavailable");
        setSummary(body.data);
      })
      .catch(() => !controller.signal.aborted && setFailed(true))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <WidgetCard
      title="Warranty"
      icon={ShieldCheck}
      loading={loading}
      href="/admin/warranty"
    >
      {failed || !summary ? (
        <WidgetHighlight
          icon={AlertTriangle}
          text="Warranty summary unavailable"
          subtext="Open Warranty to retry"
          variant="warning"
        />
      ) : (
        <div className="space-y-3">
          <WidgetStat
            value={summary.expiring_items}
            label={
              summary.expiring_items === 1
                ? "item expiring soon"
                : "items expiring soon"
            }
          />
          {summary.next_expiry ? (
            <WidgetHighlight
              icon={summary.expiring_items ? AlertTriangle : ShieldCheck}
              text={`${summary.next_expiry.item_name} · ${summary.next_expiry.coverage_label}`}
              subtext={`${summary.next_expiry.days_remaining} day${summary.next_expiry.days_remaining === 1 ? "" : "s"} remaining`}
              variant={summary.expiring_items ? "warning" : "accent"}
            />
          ) : (
            <WidgetHighlight
              icon={ShieldCheck}
              text={
                summary.tracked_items
                  ? "No upcoming expiry recorded"
                  : "No warranty items yet"
              }
              subtext={
                summary.tracked_items
                  ? `${summary.tracked_items} item${summary.tracked_items === 1 ? "" : "s"} tracked`
                  : "Add a device or appliance"
              }
              variant="accent"
            />
          )}
        </div>
      )}
    </WidgetCard>
  );
}
