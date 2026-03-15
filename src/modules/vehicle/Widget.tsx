"use client";

import { useMemo, useState, useEffect } from "react";
import { Car, AlertTriangle, Fuel, Wrench } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";

interface ServiceRecord {
    id: string;
    date: string;
    type: string;
    description: string;
    cost?: number;
    currency?: string;
}

interface FuelLog {
    id: string;
    date: string;
    cost: number;
    currency?: string;
}

interface Vehicle {
    payload: {
        name: string;
        insurance_expiry?: string;
        pollution_certificate_expiry?: string;
        next_service_due?: string;
        service_records: ServiceRecord[];
        fuel_logs: FuelLog[];
    };
}

function getExpiryStatus(dateStr?: string): "expired" | "warning" | "ok" | "none" {
    if (!dateStr) return "none";
    const now = new Date();
    const expiry = new Date(dateStr);
    if (expiry < now) return "expired";
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) return "warning";
    return "ok";
}

export default function VehicleWidget() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/content?module_type=vehicle")
            .then((r) => r.json())
            .then((d) => setVehicles(d.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const summary = useMemo(() => {
        const total = vehicles.length;

        // Count expiry alerts across all vehicles
        let alertCount = 0;
        for (const v of vehicles) {
            const p = v.payload;
            const ins = getExpiryStatus(p.insurance_expiry);
            const pol = getExpiryStatus(p.pollution_certificate_expiry);
            const svc = getExpiryStatus(p.next_service_due);
            if (ins === "expired" || ins === "warning") alertCount++;
            if (pol === "expired" || pol === "warning") alertCount++;
            if (svc === "expired" || svc === "warning") alertCount++;
        }

        // Most recent service record across all vehicles
        let latestService: ServiceRecord | null = null;
        for (const v of vehicles) {
            for (const sr of v.payload.service_records || []) {
                if (!latestService || sr.date > latestService.date) {
                    latestService = sr;
                }
            }
        }

        // Fuel cost this month
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        let fuelCostThisMonth = 0;
        for (const v of vehicles) {
            for (const fl of v.payload.fuel_logs || []) {
                if (fl.date >= monthStart) {
                    fuelCostThisMonth += fl.cost;
                }
            }
        }

        return { total, alertCount, latestService, fuelCostThisMonth };
    }, [vehicles]);

    return (
        <WidgetCard
            title="Vehicles"
            icon={Car}
            loading={loading}
            href="/admin/vehicle"
            footer={
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-warning/80">
                        <Fuel className="w-3 h-3" />
                        {summary.fuelCostThisMonth > 0
                            ? `${Math.round(summary.fuelCostThisMonth).toLocaleString()} fuel`
                            : "No fuel logs"}
                    </span>
                    {summary.latestService && (
                        <span className="flex items-center gap-1.5 text-zinc-500">
                            <Wrench className="w-3 h-3" />
                            {summary.latestService.description.slice(0, 18)}
                        </span>
                    )}
                </div>
            }
        >
            <div className="py-2 space-y-4">
                <div>
                    <p className="text-4xl font-bold text-zinc-50 tracking-tight">{summary.total}</p>
                    <p className="text-xs text-zinc-500 mt-1 font-medium italic">
                        vehicle{summary.total !== 1 ? "s" : ""} tracked
                    </p>
                </div>

                {summary.alertCount > 0 ? (
                    <div className="p-3 rounded-xl border border-warning/20 bg-warning/5">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                            <p className="text-[13px] text-warning font-medium leading-relaxed">
                                {summary.alertCount} expiry/service alert{summary.alertCount !== 1 ? "s" : ""}
                            </p>
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-1 ml-5.5">needs your attention</p>
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
