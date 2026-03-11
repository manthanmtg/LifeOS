"use client";

import { useEffect, useState, useMemo } from "react";
import { CloudRain, Droplets } from "lucide-react";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import WidgetCard from "@/components/dashboard/WidgetCard";

interface RainEntry {
    _id: string;
    payload: {
        rainfall_amount: number; // Stored in mm
        date: string;
    };
}

export default function RainTrackerWidget() {
    const { settings } = useModuleSettings<{ defaultUnit: "mm" | "cm" | "in" }>("rainTrackerSettings", { defaultUnit: "mm" });
    const displayUnit = settings.defaultUnit || "mm";

    const [entries, setEntries] = useState<RainEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/content?module_type=rain_entry")
            .then(res => res.json())
            .then(d => {
                setEntries(d.data || []);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const stats = useMemo(() => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        let last7Mm = 0;
        let last30Mm = 0;
        let totalMm = 0;

        for (const entry of entries) {
            const date = new Date(entry.payload.date);
            const amtMm = entry.payload.rainfall_amount;
            totalMm += amtMm;
            if (date >= sevenDaysAgo) last7Mm += amtMm;
            if (date >= thirtyDaysAgo) last30Mm += amtMm;
        }

        const conversion = { mm: 1, cm: 0.1, in: 0.0393701 };
        const convRate = conversion[displayUnit];

        return {
            last7: (last7Mm * convRate).toFixed(1),
            last30: (last30Mm * convRate).toFixed(1),
            total: (totalMm * convRate).toFixed(1)
        };
    }, [entries, displayUnit]);

    return (
        <WidgetCard
            title="Precipitation"
            icon={CloudRain}
            loading={loading}
            href="/admin/rain-tracker"
            footer={
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    <span className="flex items-center gap-1">
                        <Droplets className="w-3 h-3" /> Cumulative: {stats.total} {displayUnit}
                    </span>
                </div>
            }
        >
            <div className="py-2 space-y-4">
                <div className="flex items-center gap-6">
                    <div>
                        <p className="text-4xl font-bold text-zinc-50 tracking-tight">{stats.last7}</p>
                        <p className="text-[10px] text-zinc-500 mt-1 font-bold uppercase tracking-widest leading-none">Last 7 Days ({displayUnit})</p>
                    </div>
                    <div className="w-px h-10 bg-zinc-800" />
                    <div>
                        <p className="text-2xl font-bold text-zinc-400 tracking-tight">{stats.last30}</p>
                        <p className="text-[10px] text-zinc-500 mt-1 font-bold uppercase tracking-widest leading-none">Last 30 Days</p>
                    </div>
                </div>
            </div>
        </WidgetCard>
    );
}
