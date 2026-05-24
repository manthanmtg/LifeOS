"use client";

import { useEffect, useState } from "react";
import { ListChecks, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetHighlight,
  WidgetStat,
} from "@/components/dashboard/widget-primitives";

interface ShoppingListWidgetSummary {
  total: number;
}

export default function ShoppingListWidget() {
  const [summary, setSummary] = useState<ShoppingListWidgetSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();

    fetch("/api/widgets/summary?module_type=shopping_list", {
      signal: ac.signal,
    })
      .then((response) => response.json())
      .then((data) => setSummary(data.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, []);

  const totalLists = summary?.total ?? 0;

  return (
    <WidgetCard
      title="Shopping List"
      icon={ShoppingBag}
      loading={loading}
      href="/admin/shopping-list"
    >
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <WidgetStat
          value={totalLists}
          label={totalLists === 1 ? "list tracked" : "lists tracked"}
        />
        <WidgetHighlight
          icon={ListChecks}
          text={totalLists > 0 ? "Ready for the next trip" : "No lists yet"}
          subtext={
            totalLists > 0
              ? "Open to add items or mark purchases"
              : "Create one before your next shop"
          }
          variant={totalLists > 0 ? "accent" : "default"}
        />
      </motion.div>
    </WidgetCard>
  );
}
