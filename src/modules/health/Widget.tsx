"use client";

import { useMemo, useState, useEffect } from "react";
import { HeartPulse, AlertTriangle, Calendar } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";

interface HealthProfile {
    payload: {
        name: string;
        type: string;
        medications: Array<{ status: string; refill_date?: string }>;
        vaccinations: Array<{ next_due?: string }>;
        visits: Array<{ date: string; type: string }>;
    };
}

function isOverdueOrSoon(dateStr?: string): boolean {
    if (!dateStr) return false;
    const now = new Date();
    const target = new Date(dateStr);
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
}

export default function HealthWidget() {
    const [profiles, setProfiles] = useState<HealthProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/content?module_type=health_profile")
            .then((r) => r.json())
            .then((d) => setProfiles(d.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const summary = useMemo(() => {
        const total = profiles.length;
        let alertCount = 0;

        for (const p of profiles) {
            const payload = p.payload;
            // Medication refill alerts
            for (const med of payload.medications || []) {
                if (med.status === "active" && isOverdueOrSoon(med.refill_date)) {
                    alertCount++;
                }
            }
            // Overdue vaccinations
            for (const vac of payload.vaccinations || []) {
                if (isOverdueOrSoon(vac.next_due)) {
                    alertCount++;
                }
            }
        }

        // Most recent visit across all profiles
        let latestVisit: { date: string; type: string } | null = null;
        for (const p of profiles) {
            for (const v of p.payload.visits || []) {
                if (!latestVisit || v.date > latestVisit.date) {
                    latestVisit = v;
                }
            }
        }

        return { total, alertCount, latestVisit };
    }, [profiles]);

    return (
        <WidgetCard
            title="Health"
            icon={HeartPulse}
            loading={loading}
            href="/admin/health"
            footer={
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                    {summary.latestVisit ? (
                        <span className="flex items-center gap-1.5 text-zinc-500">
                            <Calendar className="w-3 h-3" />
                            Last: {summary.latestVisit.type}
                        </span>
                    ) : (
                        <span className="text-zinc-600">No visits logged</span>
                    )}
                </div>
            }
        >
            <div className="py-2 space-y-4">
                <div>
                    <p className="text-4xl font-bold text-zinc-50 tracking-tight">{summary.total}</p>
                    <p className="text-xs text-zinc-500 mt-1 font-medium italic">
                        health profile{summary.total !== 1 ? "s" : ""}
                    </p>
                </div>

                {summary.alertCount > 0 ? (
                    <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <p className="text-[13px] text-amber-300 font-medium leading-relaxed">
                                {summary.alertCount} alert{summary.alertCount !== 1 ? "s" : ""}
                            </p>
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-1 ml-5.5">refills or vaccinations due</p>
                    </div>
                ) : (
                    <div className="p-3 rounded-xl border border-dashed border-zinc-800 opacity-40">
                        <p className="text-[11px] text-zinc-500 text-center font-medium">All clear, no alerts.</p>
                    </div>
                )}
            </div>
        </WidgetCard>
    );
}
