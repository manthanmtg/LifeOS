"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
    Car, Plus, X, Edit3, Trash2, Fuel, Wrench, FileText, AlertTriangle,
    Calendar, Gauge, ChevronLeft, Shield, Wind, Clock, TrendingUp,
    MapPin, DollarSign, CheckCircle2, Droplets, Zap, Flame,
    CircleDot, HelpCircle, Eye, Battery, Disc, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Toast, { type ToastType } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// ─── Types ───────────────────────────────────────────────────────────────────

type FuelType = "petrol" | "diesel" | "electric" | "hybrid" | "cng" | "lpg" | "other";
type OdometerUnit = "km" | "mi";
type ServiceType = "routine" | "repair" | "inspection" | "tire" | "oil_change" | "brake" | "battery" | "wash" | "other";
type FuelUnit = "liters" | "gallons";
type DocType = "insurance" | "registration" | "pollution" | "license" | "warranty" | "other";

interface ServiceRecord {
    id: string;
    date: string;
    type: ServiceType;
    description: string;
    odometer?: number;
    cost?: number;
    currency: string;
    garage?: string;
    notes?: string;
}

interface FuelLog {
    id: string;
    date: string;
    quantity: number;
    fuel_unit: FuelUnit;
    cost: number;
    currency: string;
    odometer?: number;
    full_tank: boolean;
    station?: string;
}

interface VehicleDocument {
    id: string;
    type: DocType;
    title: string;
    expiry_date?: string;
    notes?: string;
}

interface VehiclePayload {
    name: string;
    make?: string;
    model?: string;
    year?: number;
    registration_number?: string;
    color?: string;
    fuel_type: FuelType;
    odometer_reading: number;
    odometer_unit: OdometerUnit;
    insurance_expiry?: string;
    pollution_certificate_expiry?: string;
    next_service_due?: string;
    next_service_odometer?: number;
    service_records: ServiceRecord[];
    fuel_logs: FuelLog[];
    documents: VehicleDocument[];
    notes?: string;
}

interface Vehicle {
    _id: string;
    created_at: string;
    updated_at: string;
    payload: VehiclePayload;
}

type DetailTab = "overview" | "service" | "fuel" | "documents";

// ─── Constants ───────────────────────────────────────────────────────────────

const FUEL_TYPE_CONFIG: Record<FuelType, { label: string; color: string; bg: string; border: string }> = {
    petrol: { label: "Petrol", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    diesel: { label: "Diesel", color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20" },
    electric: { label: "Electric", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
    hybrid: { label: "Hybrid", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    cng: { label: "CNG", color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20" },
    lpg: { label: "LPG", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
    other: { label: "Other", color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20" },
};

const SERVICE_TYPE_CONFIG: Record<ServiceType, { label: string; icon: typeof Wrench; color: string }> = {
    routine: { label: "Routine", icon: Wrench, color: "text-blue-400" },
    repair: { label: "Repair", icon: Wrench, color: "text-red-400" },
    inspection: { label: "Inspection", icon: Eye, color: "text-purple-400" },
    tire: { label: "Tire", icon: Disc, color: "text-zinc-400" },
    oil_change: { label: "Oil Change", icon: Droplets, color: "text-amber-400" },
    brake: { label: "Brake", icon: CircleDot, color: "text-orange-400" },
    battery: { label: "Battery", icon: Battery, color: "text-green-400" },
    wash: { label: "Wash", icon: Sparkles, color: "text-cyan-400" },
    other: { label: "Other", icon: HelpCircle, color: "text-zinc-500" },
};

const DOC_TYPE_CONFIG: Record<DocType, { label: string; color: string }> = {
    insurance: { label: "Insurance", color: "text-blue-400" },
    registration: { label: "Registration", color: "text-purple-400" },
    pollution: { label: "Pollution Cert", color: "text-green-400" },
    license: { label: "License", color: "text-amber-400" },
    warranty: { label: "Warranty", color: "text-teal-400" },
    other: { label: "Other", color: "text-zinc-400" },
};

const FUEL_TYPE_ICON: Record<FuelType, typeof Fuel> = {
    petrol: Flame,
    diesel: Fuel,
    electric: Zap,
    hybrid: TrendingUp,
    cng: Wind,
    lpg: Flame,
    other: Fuel,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string): string {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateInput(d?: string): string {
    if (!d) return "";
    return d.slice(0, 10);
}

function toISODate(d: string): string {
    if (!d) return "";
    if (d.includes("T")) return d;
    return new Date(d + "T00:00:00").toISOString();
}

function daysUntil(dateStr?: string): number | null {
    if (!dateStr) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryStatus(dateStr?: string): "expired" | "warning" | "ok" | "none" {
    if (!dateStr) return "none";
    const days = daysUntil(dateStr);
    if (days === null) return "none";
    if (days < 0) return "expired";
    if (days <= 30) return "warning";
    return "ok";
}

function expiryBadge(dateStr?: string, label?: string) {
    const status = getExpiryStatus(dateStr);
    if (status === "none") return null;
    const days = daysUntil(dateStr)!;
    const config = {
        expired: { text: `${label ? label + ": " : ""}Expired ${Math.abs(days)}d ago`, bg: "bg-red-500/10", border: "border-red-500/20", color: "text-red-400" },
        warning: { text: `${label ? label + ": " : ""}${days}d left`, bg: "bg-amber-500/10", border: "border-amber-500/20", color: "text-amber-400" },
        ok: { text: `${label ? label + ": " : ""}${days}d left`, bg: "bg-emerald-500/10", border: "border-emerald-500/20", color: "text-emerald-400" },
    }[status];
    return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", config.bg, config.border, config.color)}>
            {status === "expired" ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {config.text}
        </span>
    );
}

function uuid() {
    return crypto.randomUUID();
}

function emptyPayload(): VehiclePayload {
    return {
        name: "",
        fuel_type: "petrol",
        odometer_reading: 0,
        odometer_unit: "km",
        service_records: [],
        fuel_logs: [],
        documents: [],
    };
}

// ─── Component ───────────────────────────────────────────────────────────────

function Portal({ children }: { children: ReactNode }) {
    if (typeof document === "undefined") return null;
    return createPortal(children, document.body);
}

export default function VehicleAdminView() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Modal states
    const [showVehicleForm, setShowVehicleForm] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [formData, setFormData] = useState<VehiclePayload>(emptyPayload());

    // Detail view
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [activeTab, setActiveTab] = useState<DetailTab>("overview");

    // Sub-form states
    const [showServiceForm, setShowServiceForm] = useState(false);
    const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
    const [showFuelForm, setShowFuelForm] = useState(false);
    const [editingFuel, setEditingFuel] = useState<FuelLog | null>(null);
    const [showDocForm, setShowDocForm] = useState(false);
    const [editingDoc, setEditingDoc] = useState<VehicleDocument | null>(null);

    // Service form data
    const [serviceForm, setServiceForm] = useState<Partial<ServiceRecord>>({});
    const [fuelForm, setFuelForm] = useState<Partial<FuelLog>>({});
    const [docForm, setDocForm] = useState<Partial<VehicleDocument>>({});

    // UI
    const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean }>({ message: "", type: "success", visible: false });
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });

    const showToast = useCallback((message: string, type: ToastType = "success") => {
        setToast({ message, type, visible: true });
    }, []);

    // ─── API ─────────────────────────────────────────────────────────────────

    const fetchVehicles = useCallback(async () => {
        try {
            const r = await fetch("/api/content?module_type=vehicle");
            const d = await r.json();
            setVehicles(d.data || []);
        } catch {
            showToast("Failed to load vehicles", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchVehicles();
    }, [fetchVehicles]);

    const saveVehicle = async () => {
        if (!formData.name.trim()) {
            showToast("Vehicle name is required", "error");
            return;
        }
        setSaving(true);
        try {
            if (editingVehicle) {
                await fetch(`/api/content/${editingVehicle._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ payload: formData }),
                });
                showToast("Vehicle updated");
            } else {
                await fetch("/api/content", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ module_type: "vehicle", is_public: false, payload: formData }),
                });
                showToast("Vehicle added");
            }
            setShowVehicleForm(false);
            setEditingVehicle(null);
            setFormData(emptyPayload());
            await fetchVehicles();
        } catch {
            showToast("Failed to save vehicle", "error");
        } finally {
            setSaving(false);
        }
    };

    const deleteVehicle = async (id: string) => {
        try {
            await fetch(`/api/content/${id}`, { method: "DELETE" });
            showToast("Vehicle deleted");
            if (selectedVehicle?._id === id) setSelectedVehicle(null);
            await fetchVehicles();
        } catch {
            showToast("Failed to delete vehicle", "error");
        }
    };

    const updateVehiclePayload = async (vehicle: Vehicle, newPayload: VehiclePayload) => {
        try {
            await fetch(`/api/content/${vehicle._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payload: newPayload }),
            });
            await fetchVehicles();
            // Refresh selected vehicle
            const r = await fetch(`/api/content/${vehicle._id}`);
            const d = await r.json();
            if (d.data) setSelectedVehicle(d.data);
        } catch {
            showToast("Failed to update", "error");
        }
    };

    // ─── Service records ─────────────────────────────────────────────────────

    const openServiceForm = (record?: ServiceRecord) => {
        if (record) {
            setEditingService(record);
            setServiceForm({ ...record, date: formatDateInput(record.date) });
        } else {
            setEditingService(null);
            setServiceForm({ type: "routine", currency: "INR", date: new Date().toISOString().slice(0, 10) });
        }
        setShowServiceForm(true);
    };

    const saveServiceRecord = async () => {
        if (!selectedVehicle || !serviceForm.description?.trim()) {
            showToast("Description is required", "error");
            return;
        }
        const record: ServiceRecord = {
            id: editingService?.id || uuid(),
            date: toISODate(serviceForm.date || new Date().toISOString().slice(0, 10)),
            type: (serviceForm.type as ServiceType) || "routine",
            description: serviceForm.description || "",
            odometer: serviceForm.odometer ? Number(serviceForm.odometer) : undefined,
            cost: serviceForm.cost ? Number(serviceForm.cost) : undefined,
            currency: serviceForm.currency || "INR",
            garage: serviceForm.garage || undefined,
            notes: serviceForm.notes || undefined,
        };
        const records = [...(selectedVehicle.payload.service_records || [])];
        const idx = records.findIndex((r) => r.id === record.id);
        if (idx >= 0) records[idx] = record;
        else records.push(record);
        await updateVehiclePayload(selectedVehicle, { ...selectedVehicle.payload, service_records: records });
        showToast(editingService ? "Service record updated" : "Service record added");
        setShowServiceForm(false);
        setEditingService(null);
    };

    const deleteServiceRecord = async (id: string) => {
        if (!selectedVehicle) return;
        const records = selectedVehicle.payload.service_records.filter((r) => r.id !== id);
        await updateVehiclePayload(selectedVehicle, { ...selectedVehicle.payload, service_records: records });
        showToast("Service record deleted");
    };

    // ─── Fuel logs ───────────────────────────────────────────────────────────

    const openFuelForm = (log?: FuelLog) => {
        if (log) {
            setEditingFuel(log);
            setFuelForm({ ...log, date: formatDateInput(log.date) });
        } else {
            setEditingFuel(null);
            setFuelForm({ fuel_unit: "liters", currency: "INR", full_tank: true, date: new Date().toISOString().slice(0, 10) });
        }
        setShowFuelForm(true);
    };

    const saveFuelLog = async () => {
        if (!selectedVehicle || !fuelForm.quantity || !fuelForm.cost) {
            showToast("Quantity and cost are required", "error");
            return;
        }
        const log: FuelLog = {
            id: editingFuel?.id || uuid(),
            date: toISODate(fuelForm.date || new Date().toISOString().slice(0, 10)),
            quantity: Number(fuelForm.quantity),
            fuel_unit: (fuelForm.fuel_unit as FuelUnit) || "liters",
            cost: Number(fuelForm.cost),
            currency: fuelForm.currency || "INR",
            odometer: fuelForm.odometer ? Number(fuelForm.odometer) : undefined,
            full_tank: fuelForm.full_tank ?? true,
            station: fuelForm.station || undefined,
        };
        const logs = [...(selectedVehicle.payload.fuel_logs || [])];
        const idx = logs.findIndex((l) => l.id === log.id);
        if (idx >= 0) logs[idx] = log;
        else logs.push(log);
        await updateVehiclePayload(selectedVehicle, { ...selectedVehicle.payload, fuel_logs: logs });
        showToast(editingFuel ? "Fuel log updated" : "Fuel log added");
        setShowFuelForm(false);
        setEditingFuel(null);
    };

    const deleteFuelLog = async (id: string) => {
        if (!selectedVehicle) return;
        const logs = selectedVehicle.payload.fuel_logs.filter((l) => l.id !== id);
        await updateVehiclePayload(selectedVehicle, { ...selectedVehicle.payload, fuel_logs: logs });
        showToast("Fuel log deleted");
    };

    // ─── Documents ───────────────────────────────────────────────────────────

    const openDocForm = (doc?: VehicleDocument) => {
        if (doc) {
            setEditingDoc(doc);
            setDocForm({ ...doc, expiry_date: formatDateInput(doc.expiry_date) });
        } else {
            setEditingDoc(null);
            setDocForm({ type: "other" });
        }
        setShowDocForm(true);
    };

    const saveDocument = async () => {
        if (!selectedVehicle || !docForm.title?.trim()) {
            showToast("Document title is required", "error");
            return;
        }
        const doc: VehicleDocument = {
            id: editingDoc?.id || uuid(),
            type: (docForm.type as DocType) || "other",
            title: docForm.title || "",
            expiry_date: docForm.expiry_date ? toISODate(docForm.expiry_date) : undefined,
            notes: docForm.notes || undefined,
        };
        const docs = [...(selectedVehicle.payload.documents || [])];
        const idx = docs.findIndex((d) => d.id === doc.id);
        if (idx >= 0) docs[idx] = doc;
        else docs.push(doc);
        await updateVehiclePayload(selectedVehicle, { ...selectedVehicle.payload, documents: docs });
        showToast(editingDoc ? "Document updated" : "Document added");
        setShowDocForm(false);
        setEditingDoc(null);
    };

    const deleteDocument = async (id: string) => {
        if (!selectedVehicle) return;
        const docs = selectedVehicle.payload.documents.filter((d) => d.id !== id);
        await updateVehiclePayload(selectedVehicle, { ...selectedVehicle.payload, documents: docs });
        showToast("Document deleted");
    };

    // ─── Computed ────────────────────────────────────────────────────────────

    const allAlerts = useMemo(() => {
        const alerts: Array<{ vehicleName: string; label: string; date: string; status: "expired" | "warning" }> = [];
        for (const v of vehicles) {
            const p = v.payload;
            const checks: Array<{ label: string; date?: string }> = [
                { label: "Insurance", date: p.insurance_expiry },
                { label: "Pollution Cert", date: p.pollution_certificate_expiry },
                { label: "Next Service", date: p.next_service_due },
            ];
            for (const c of checks) {
                const s = getExpiryStatus(c.date);
                if (s === "expired" || s === "warning") {
                    alerts.push({ vehicleName: p.name, label: c.label, date: c.date!, status: s });
                }
            }
            // Check document expiries
            for (const doc of p.documents || []) {
                const s = getExpiryStatus(doc.expiry_date);
                if (s === "expired" || s === "warning") {
                    alerts.push({ vehicleName: p.name, label: doc.title, date: doc.expiry_date!, status: s });
                }
            }
        }
        alerts.sort((a, b) => {
            if (a.status === "expired" && b.status !== "expired") return -1;
            if (a.status !== "expired" && b.status === "expired") return 1;
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
        return alerts;
    }, [vehicles]);

    const selectedStats = useMemo(() => {
        if (!selectedVehicle) return null;
        const p = selectedVehicle.payload;
        const totalServiceCost = (p.service_records || []).reduce((sum, r) => sum + (r.cost || 0), 0);
        const totalFuelCost = (p.fuel_logs || []).reduce((sum, l) => sum + l.cost, 0);

        // Calculate fuel efficiency from full tank fills
        const sortedLogs = [...(p.fuel_logs || [])].filter((l) => l.odometer).sort((a, b) => (a.odometer || 0) - (b.odometer || 0));
        const efficiencies: number[] = [];
        for (let i = 1; i < sortedLogs.length; i++) {
            if (sortedLogs[i].full_tank && sortedLogs[i - 1].full_tank) {
                const dist = (sortedLogs[i].odometer || 0) - (sortedLogs[i - 1].odometer || 0);
                const qty = sortedLogs[i].quantity;
                if (dist > 0 && qty > 0) {
                    efficiencies.push(dist / qty);
                }
            }
        }
        const avgEfficiency = efficiencies.length > 0 ? efficiencies.reduce((s, e) => s + e, 0) / efficiencies.length : null;
        const unit = p.odometer_unit === "km" ? "km/l" : "mpg";

        return { totalServiceCost, totalFuelCost, avgEfficiency, efficiencyUnit: unit, efficiencies };
    }, [selectedVehicle]);

    // ─── Form helpers ────────────────────────────────────────────────────────

    const openAddVehicle = () => {
        setEditingVehicle(null);
        setFormData(emptyPayload());
        setShowVehicleForm(true);
    };

    const openEditVehicle = (v: Vehicle) => {
        setEditingVehicle(v);
        setFormData({ ...v.payload });
        setShowVehicleForm(true);
    };

    // ─── Render: Loading ─────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="animate-fade-in-up space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-zinc-800 rounded-lg animate-pulse" />
                        <div className="h-4 w-72 bg-zinc-800/60 rounded-md animate-pulse" />
                    </div>
                    <div className="h-10 w-32 bg-zinc-800 rounded-lg animate-pulse" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 animate-pulse">
                            <div className="h-6 w-1/2 bg-zinc-800 rounded" />
                            <div className="h-4 w-3/4 bg-zinc-800/60 rounded" />
                            <div className="h-4 w-1/3 bg-zinc-800/40 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ─── Render: Detail View ─────────────────────────────────────────────────

    if (selectedVehicle) {
        const p = selectedVehicle.payload;
        const ftConfig = FUEL_TYPE_CONFIG[p.fuel_type];
        const FuelIcon = FUEL_TYPE_ICON[p.fuel_type];

        return (
            <div className="animate-fade-in-up space-y-6">
                {/* Back + Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => { setSelectedVehicle(null); setActiveTab("overview"); }}
                        className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-zinc-400" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-zinc-50 tracking-tight truncate">{p.name}</h1>
                        <p className="text-sm text-zinc-500">
                            {[p.make, p.model, p.year].filter(Boolean).join(" ") || "Vehicle details"}
                            {p.registration_number && <span className="ml-2 text-zinc-600">| {p.registration_number}</span>}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => openEditVehicle(selectedVehicle)}
                            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors"
                        >
                            <Edit3 className="w-4 h-4 text-zinc-400" />
                        </button>
                        <button
                            onClick={() => setConfirmDelete({ open: true, id: selectedVehicle._id, name: p.name })}
                            className="p-2 rounded-xl bg-zinc-900 border border-red-900/30 hover:bg-red-950/50 transition-colors"
                        >
                            <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
                    {(["overview", "service", "fuel", "documents"] as DetailTab[]).map((tab) => {
                        const icons = { overview: Gauge, service: Wrench, fuel: Fuel, documents: FileText };
                        const labels = { overview: "Overview", service: "Service History", fuel: "Fuel Log", documents: "Documents" };
                        const Icon = icons[tab];
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                                    activeTab === tab
                                        ? "bg-zinc-800 text-zinc-50 shadow-lg"
                                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{labels[tab]}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Tab: Overview */}
                {activeTab === "overview" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        {/* Stats row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Odometer</p>
                                <p className="text-2xl font-bold text-zinc-50">{p.odometer_reading.toLocaleString()}</p>
                                <p className="text-xs text-zinc-500">{p.odometer_unit}</p>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Fuel Type</p>
                                <div className="flex items-center gap-2">
                                    <FuelIcon className={cn("w-5 h-5", ftConfig.color)} />
                                    <span className={cn("text-lg font-bold", ftConfig.color)}>{ftConfig.label}</span>
                                </div>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Service Cost</p>
                                <p className="text-2xl font-bold text-zinc-50">{selectedStats?.totalServiceCost.toLocaleString()}</p>
                                <p className="text-xs text-zinc-500">total spent</p>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Fuel Cost</p>
                                <p className="text-2xl font-bold text-zinc-50">{selectedStats?.totalFuelCost.toLocaleString()}</p>
                                <p className="text-xs text-zinc-500">total spent</p>
                            </div>
                        </div>

                        {/* Avg Efficiency */}
                        {selectedStats?.avgEfficiency && (
                            <div className="bg-gradient-to-r from-emerald-500/5 to-transparent border border-emerald-500/10 rounded-2xl p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Avg Fuel Efficiency</p>
                                        <p className="text-2xl font-bold text-emerald-400">
                                            {selectedStats.avgEfficiency.toFixed(1)} <span className="text-sm text-zinc-500">{selectedStats.efficiencyUnit}</span>
                                        </p>
                                    </div>
                                </div>
                                {selectedStats.efficiencies.length > 1 && (
                                    <div className="mt-4 flex items-end gap-1 h-12">
                                        {(selectedStats.efficiencies || []).map((eff, i) => {
                                            const max = Math.max(...selectedStats.efficiencies);
                                            const height = max > 0 ? (eff / max) * 100 : 0;
                                            return (
                                                <div
                                                    key={i}
                                                    className="flex-1 bg-emerald-500/20 rounded-t-sm hover:bg-emerald-500/40 transition-colors"
                                                    style={{ height: `${Math.max(height, 8)}%` }}
                                                    title={`${eff.toFixed(1)} ${selectedStats.efficiencyUnit}`}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Expiry statuses */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { label: "Insurance", date: p.insurance_expiry, icon: Shield },
                                { label: "Pollution Cert", date: p.pollution_certificate_expiry, icon: Wind },
                                { label: "Next Service", date: p.next_service_due, icon: Wrench },
                            ].map((item) => {
                                const status = getExpiryStatus(item.date);
                                const days = daysUntil(item.date);
                                const statusColors = {
                                    expired: "border-red-500/20 bg-red-500/5",
                                    warning: "border-amber-500/20 bg-amber-500/5",
                                    ok: "border-emerald-500/20 bg-emerald-500/5",
                                    none: "border-zinc-800 bg-zinc-900/50",
                                };
                                const textColors = { expired: "text-red-400", warning: "text-amber-400", ok: "text-emerald-400", none: "text-zinc-500" };
                                return (
                                    <div key={item.label} className={cn("rounded-2xl border p-4", statusColors[status])}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <item.icon className={cn("w-4 h-4", textColors[status])} />
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{item.label}</span>
                                        </div>
                                        {item.date ? (
                                            <>
                                                <p className={cn("text-lg font-bold", textColors[status])}>
                                                    {status === "expired" ? `Expired ${Math.abs(days!)}d ago` : `${days}d remaining`}
                                                </p>
                                                <p className="text-xs text-zinc-500 mt-1">{formatDate(item.date)}</p>
                                            </>
                                        ) : (
                                            <p className="text-sm text-zinc-600 italic">Not set</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Vehicle info */}
                        {(p.color || p.registration_number || p.notes) && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Details</p>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    {p.color && (
                                        <div>
                                            <span className="text-zinc-500">Color</span>
                                            <p className="text-zinc-200 font-medium">{p.color}</p>
                                        </div>
                                    )}
                                    {p.registration_number && (
                                        <div>
                                            <span className="text-zinc-500">Registration</span>
                                            <p className="text-zinc-200 font-medium">{p.registration_number}</p>
                                        </div>
                                    )}
                                    {p.next_service_odometer && (
                                        <div>
                                            <span className="text-zinc-500">Service at</span>
                                            <p className="text-zinc-200 font-medium">{p.next_service_odometer.toLocaleString()} {p.odometer_unit}</p>
                                        </div>
                                    )}
                                </div>
                                {p.notes && (
                                    <div className="pt-2 border-t border-zinc-800">
                                        <p className="text-sm text-zinc-400 whitespace-pre-wrap">{p.notes}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Tab: Service History */}
                {activeTab === "service" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-zinc-400">
                                {p.service_records.length} record{p.service_records.length !== 1 ? "s" : ""}
                            </p>
                            <button
                                onClick={() => openServiceForm()}
                                className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Record
                            </button>
                        </div>

                        {p.service_records.length === 0 ? (
                            <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
                                <Wrench className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                                <p className="text-zinc-500 font-medium">No service records yet</p>
                                <p className="text-xs text-zinc-600 mt-1">Add your first service record to start tracking</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {[...p.service_records]
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map((record) => {
                                        const stConfig = SERVICE_TYPE_CONFIG[record.type];
                                        const StIcon = stConfig.icon;
                                        return (
                                            <motion.div
                                                key={record.id}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-colors group"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3 min-w-0">
                                                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", `bg-zinc-800`)}>
                                                            <StIcon className={cn("w-4 h-4", stConfig.color)} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-zinc-200 truncate">{record.description}</p>
                                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800", stConfig.color)}>
                                                                    {stConfig.label}
                                                                </span>
                                                                <span className="text-[11px] text-zinc-500">{formatDate(record.date)}</span>
                                                                {record.odometer && (
                                                                    <span className="text-[11px] text-zinc-600 flex items-center gap-1">
                                                                        <Gauge className="w-3 h-3" /> {record.odometer.toLocaleString()} {p.odometer_unit}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {record.garage && (
                                                                <p className="text-[11px] text-zinc-600 mt-1 flex items-center gap-1">
                                                                    <MapPin className="w-3 h-3" /> {record.garage}
                                                                </p>
                                                            )}
                                                            {record.notes && (
                                                                <p className="text-xs text-zinc-500 mt-1">{record.notes}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {record.cost != null && record.cost > 0 && (
                                                            <span className="text-sm font-bold text-zinc-300">
                                                                {record.currency === "INR" ? "₹" : record.currency} {record.cost.toLocaleString()}
                                                            </span>
                                                        )}
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => openServiceForm(record)} className="p-1.5 rounded-lg hover:bg-zinc-800">
                                                                <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
                                                            </button>
                                                            <button onClick={() => deleteServiceRecord(record.id)} className="p-1.5 rounded-lg hover:bg-red-950/50">
                                                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                            </div>
                        )}

                        {/* Service Form Modal */}
                        <Portal>
                        <AnimatePresence>
                            {showServiceForm && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowServiceForm(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col">
                                        <div className="p-6 border-b border-zinc-800 flex items-center justify-between shrink-0">
                                            <h3 className="text-lg font-bold text-zinc-50">{editingService ? "Edit" : "Add"} Service Record</h3>
                                            <button onClick={() => setShowServiceForm(false)} className="p-1 rounded-lg hover:bg-zinc-800"><X className="w-5 h-5 text-zinc-400" /></button>
                                        </div>
                                        <div className="p-6 space-y-4 flex-1 min-h-0 overflow-y-auto">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Date</label>
                                                    <input type="date" value={serviceForm.date || ""} onChange={(e) => setServiceForm((f) => ({ ...f, date: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Type</label>
                                                    <select value={serviceForm.type || "routine"} onChange={(e) => setServiceForm((f) => ({ ...f, type: e.target.value as ServiceType }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600">
                                                        {Object.entries(SERVICE_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Description *</label>
                                                <input type="text" value={serviceForm.description || ""} onChange={(e) => setServiceForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g., Oil change and filter replacement" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Cost</label>
                                                    <input type="number" min="0" step="0.01" value={serviceForm.cost ?? ""} onChange={(e) => setServiceForm((f) => ({ ...f, cost: e.target.value ? Number(e.target.value) : undefined }))} placeholder="0" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Odometer</label>
                                                    <input type="number" min="0" value={serviceForm.odometer ?? ""} onChange={(e) => setServiceForm((f) => ({ ...f, odometer: e.target.value ? Number(e.target.value) : undefined }))} placeholder={`in ${p.odometer_unit}`} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Garage / Workshop</label>
                                                <input type="text" value={serviceForm.garage || ""} onChange={(e) => setServiceForm((f) => ({ ...f, garage: e.target.value }))} placeholder="e.g., Authorized Service Center" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Notes</label>
                                                <textarea value={serviceForm.notes || ""} onChange={(e) => setServiceForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Additional notes..." className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 resize-none" />
                                            </div>
                                        </div>
                                        <div className="p-6 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0">
                                            <button onClick={() => setShowServiceForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all">Cancel</button>
                                            <button onClick={saveServiceRecord} className="px-5 py-2.5 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95">
                                                {editingService ? "Update" : "Add"} Record
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>
                        </Portal>
                    </motion.div>
                )}

                {/* Tab: Fuel Log */}
                {activeTab === "fuel" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-zinc-400">
                                {p.fuel_logs.length} entr{p.fuel_logs.length !== 1 ? "ies" : "y"}
                                {selectedStats?.avgEfficiency && (
                                    <span className="ml-2 text-emerald-400 font-semibold">
                                        Avg: {selectedStats.avgEfficiency.toFixed(1)} {selectedStats.efficiencyUnit}
                                    </span>
                                )}
                            </p>
                            <button
                                onClick={() => openFuelForm()}
                                className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95"
                            >
                                <Plus className="w-3.5 h-3.5" /> Log Fuel
                            </button>
                        </div>

                        {p.fuel_logs.length === 0 ? (
                            <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
                                <Fuel className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                                <p className="text-zinc-500 font-medium">No fuel logs yet</p>
                                <p className="text-xs text-zinc-600 mt-1">Log your fuel fills to track mileage and costs</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {[...p.fuel_logs]
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map((log) => (
                                        <motion.div
                                            key={log.id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-colors group"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                                                        <Fuel className="w-4 h-4 text-amber-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-zinc-200">
                                                            {log.quantity} {log.fuel_unit}
                                                            {log.full_tank && (
                                                                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Full Tank</span>
                                                            )}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                                            <span className="text-[11px] text-zinc-500">{formatDate(log.date)}</span>
                                                            {log.odometer && (
                                                                <span className="text-[11px] text-zinc-600 flex items-center gap-1">
                                                                    <Gauge className="w-3 h-3" /> {log.odometer.toLocaleString()} {p.odometer_unit}
                                                                </span>
                                                            )}
                                                            {log.station && (
                                                                <span className="text-[11px] text-zinc-600 flex items-center gap-1">
                                                                    <MapPin className="w-3 h-3" /> {log.station}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-zinc-600 mt-0.5">
                                                            Rate: {log.currency === "INR" ? "₹" : log.currency} {(log.cost / log.quantity).toFixed(2)}/{log.fuel_unit === "liters" ? "L" : "gal"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-sm font-bold text-zinc-300">
                                                        {log.currency === "INR" ? "₹" : log.currency} {log.cost.toLocaleString()}
                                                    </span>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => openFuelForm(log)} className="p-1.5 rounded-lg hover:bg-zinc-800">
                                                            <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
                                                        </button>
                                                        <button onClick={() => deleteFuelLog(log.id)} className="p-1.5 rounded-lg hover:bg-red-950/50">
                                                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                            </div>
                        )}

                        {/* Fuel Form Modal */}
                        <Portal>
                        <AnimatePresence>
                            {showFuelForm && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFuelForm(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col">
                                        <div className="p-6 border-b border-zinc-800 flex items-center justify-between shrink-0">
                                            <h3 className="text-lg font-bold text-zinc-50">{editingFuel ? "Edit" : "Log"} Fuel Fill</h3>
                                            <button onClick={() => setShowFuelForm(false)} className="p-1 rounded-lg hover:bg-zinc-800"><X className="w-5 h-5 text-zinc-400" /></button>
                                        </div>
                                        <div className="p-6 space-y-4 flex-1 min-h-0 overflow-y-auto">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Date</label>
                                                    <input type="date" value={fuelForm.date || ""} onChange={(e) => setFuelForm((f) => ({ ...f, date: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Full Tank?</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFuelForm((f) => ({ ...f, full_tank: !f.full_tank }))}
                                                        className={cn(
                                                            "w-full rounded-xl px-3 py-2.5 text-sm font-medium border transition-all flex items-center justify-center gap-2",
                                                            fuelForm.full_tank
                                                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                                : "bg-zinc-900 border-zinc-800 text-zinc-500"
                                                        )}
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        {fuelForm.full_tank ? "Yes" : "No"}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Quantity *</label>
                                                    <div className="flex gap-2">
                                                        <input type="number" min="0" step="0.01" value={fuelForm.quantity ?? ""} onChange={(e) => setFuelForm((f) => ({ ...f, quantity: e.target.value ? Number(e.target.value) : undefined }))} placeholder="0" className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600" />
                                                        <select value={fuelForm.fuel_unit || "liters"} onChange={(e) => setFuelForm((f) => ({ ...f, fuel_unit: e.target.value as FuelUnit }))} className="bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600">
                                                            <option value="liters">L</option>
                                                            <option value="gallons">gal</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Total Cost *</label>
                                                    <input type="number" min="0" step="0.01" value={fuelForm.cost ?? ""} onChange={(e) => setFuelForm((f) => ({ ...f, cost: e.target.value ? Number(e.target.value) : undefined }))} placeholder="0" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Odometer</label>
                                                    <input type="number" min="0" value={fuelForm.odometer ?? ""} onChange={(e) => setFuelForm((f) => ({ ...f, odometer: e.target.value ? Number(e.target.value) : undefined }))} placeholder={`in ${p.odometer_unit}`} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Station</label>
                                                    <input type="text" value={fuelForm.station || ""} onChange={(e) => setFuelForm((f) => ({ ...f, station: e.target.value }))} placeholder="e.g., HP Pump" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-6 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0">
                                            <button onClick={() => setShowFuelForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all">Cancel</button>
                                            <button onClick={saveFuelLog} className="px-5 py-2.5 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95">
                                                {editingFuel ? "Update" : "Log"} Fuel
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>
                        </Portal>
                    </motion.div>
                )}

                {/* Tab: Documents */}
                {activeTab === "documents" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-zinc-400">
                                {p.documents.length} document{p.documents.length !== 1 ? "s" : ""}
                            </p>
                            <button
                                onClick={() => openDocForm()}
                                className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Document
                            </button>
                        </div>

                        {p.documents.length === 0 ? (
                            <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
                                <FileText className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                                <p className="text-zinc-500 font-medium">No documents tracked</p>
                                <p className="text-xs text-zinc-600 mt-1">Add insurance, registration, and other documents</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(p.documents || []).map((doc) => {
                                    const dConfig = DOC_TYPE_CONFIG[doc.type];
                                    const days = daysUntil(doc.expiry_date);
                                    const status = getExpiryStatus(doc.expiry_date);
                                    return (
                                        <motion.div
                                            key={doc.id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={cn(
                                                "bg-zinc-900 border rounded-2xl p-4 group transition-colors",
                                                status === "expired" ? "border-red-500/20" : status === "warning" ? "border-amber-500/20" : "border-zinc-800 hover:border-zinc-700"
                                            )}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <span className={cn("text-[10px] font-bold uppercase tracking-wider", dConfig.color)}>{dConfig.label}</span>
                                                    <p className="text-sm font-semibold text-zinc-200 mt-0.5">{doc.title}</p>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openDocForm(doc)} className="p-1.5 rounded-lg hover:bg-zinc-800">
                                                        <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
                                                    </button>
                                                    <button onClick={() => deleteDocument(doc.id)} className="p-1.5 rounded-lg hover:bg-red-950/50">
                                                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                    </button>
                                                </div>
                                            </div>

                                            {doc.expiry_date ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-zinc-500">Expires</span>
                                                        <span className="text-zinc-300 font-medium">{formatDate(doc.expiry_date)}</span>
                                                    </div>
                                                    {/* Countdown bar */}
                                                    <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                "absolute left-0 top-0 h-full rounded-full transition-all",
                                                                status === "expired" ? "bg-red-500" : status === "warning" ? "bg-amber-500" : "bg-emerald-500"
                                                            )}
                                                            style={{ width: `${status === "expired" ? 100 : Math.max(5, Math.min(100, ((365 - (days || 0)) / 365) * 100))}%` }}
                                                        />
                                                    </div>
                                                    {expiryBadge(doc.expiry_date)}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-zinc-600 italic">No expiry date set</p>
                                            )}

                                            {doc.notes && (
                                                <p className="text-xs text-zinc-500 mt-2 pt-2 border-t border-zinc-800">{doc.notes}</p>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Document Form Modal */}
                        <Portal>
                        <AnimatePresence>
                            {showDocForm && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDocForm(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col">
                                        <div className="p-6 border-b border-zinc-800 flex items-center justify-between shrink-0">
                                            <h3 className="text-lg font-bold text-zinc-50">{editingDoc ? "Edit" : "Add"} Document</h3>
                                            <button onClick={() => setShowDocForm(false)} className="p-1 rounded-lg hover:bg-zinc-800"><X className="w-5 h-5 text-zinc-400" /></button>
                                        </div>
                                        <div className="p-6 space-y-4 flex-1 min-h-0 overflow-y-auto">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Type</label>
                                                    <select value={docForm.type || "other"} onChange={(e) => setDocForm((f) => ({ ...f, type: e.target.value as DocType }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600">
                                                        {Object.entries(DOC_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Expiry Date</label>
                                                    <input type="date" value={docForm.expiry_date || ""} onChange={(e) => setDocForm((f) => ({ ...f, expiry_date: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Title *</label>
                                                <input type="text" value={docForm.title || ""} onChange={(e) => setDocForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g., ICICI Lombard Motor Insurance" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Notes</label>
                                                <textarea value={docForm.notes || ""} onChange={(e) => setDocForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Policy number, remarks..." className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 resize-none" />
                                            </div>
                                        </div>
                                        <div className="p-6 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0">
                                            <button onClick={() => setShowDocForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all">Cancel</button>
                                            <button onClick={saveDocument} className="px-5 py-2.5 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95">
                                                {editingDoc ? "Update" : "Add"} Document
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>
                        </Portal>
                    </motion.div>
                )}

                <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
                <ConfirmDialog
                    isOpen={confirmDelete.open}
                    title="Delete Vehicle"
                    description={`Are you sure you want to delete "${confirmDelete.name}"? All service records, fuel logs, and documents will be permanently removed.`}
                    confirmLabel="Delete"
                    onConfirm={() => deleteVehicle(confirmDelete.id)}
                    onClose={() => setConfirmDelete({ open: false, id: "", name: "" })}
                />
            </div>
        );
    }

    // ─── Render: Vehicle List ────────────────────────────────────────────────

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-50 mb-2">Vehicle Manager</h1>
                    <p className="text-zinc-400">Track your vehicles, services, fuel, and documents.</p>
                </div>
                <button
                    onClick={openAddVehicle}
                    className="flex items-center gap-2 px-5 py-2.5 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95 shadow-lg shadow-white/5"
                >
                    <Plus className="w-4 h-4" /> Add Vehicle
                </button>
            </div>

            {/* Expiry Alerts Dashboard */}
            {allAlerts.length > 0 && (
                <div className="bg-gradient-to-r from-amber-500/5 via-red-500/5 to-transparent border border-amber-500/10 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                            Attention Required ({allAlerts.length})
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {allAlerts.map((alert, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium",
                                    alert.status === "expired"
                                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                                        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                )}
                            >
                                <span className="font-bold">{alert.vehicleName}</span>
                                <span className="text-zinc-500">|</span>
                                <span>{alert.label}</span>
                                <span className="text-zinc-600">{formatDate(alert.date)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Vehicle Cards */}
            {vehicles.length === 0 ? (
                <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                        <Car className="w-8 h-8 text-zinc-600" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-400 mb-2">No vehicles yet</h3>
                    <p className="text-sm text-zinc-600 mb-6 max-w-md mx-auto">
                        Add your first vehicle to start tracking service history, fuel consumption, and document expiry dates.
                    </p>
                    <button
                        onClick={openAddVehicle}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Add Your First Vehicle
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vehicles.map((v) => {
                        const vp = v.payload;
                        const ftConf = FUEL_TYPE_CONFIG[vp.fuel_type];
                        const VFuelIcon = FUEL_TYPE_ICON[vp.fuel_type];
                        const totalServiceCost = (vp.service_records || []).reduce((s, r) => s + (r.cost || 0), 0);
                        const totalFuelCost = (vp.fuel_logs || []).reduce((s, l) => s + l.cost, 0);
                        const hasAlerts = [vp.insurance_expiry, vp.pollution_certificate_expiry, vp.next_service_due]
                            .some((d) => { const s = getExpiryStatus(d); return s === "expired" || s === "warning"; });

                        return (
                            <motion.div
                                key={v._id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                    "bg-zinc-900 border rounded-2xl p-5 cursor-pointer group transition-all hover:shadow-lg",
                                    hasAlerts ? "border-amber-500/20 hover:border-amber-500/40 hover:shadow-amber-500/5" : "border-zinc-800 hover:border-zinc-700 hover:shadow-zinc-800/30"
                                )}
                                onClick={() => { setSelectedVehicle(v); setActiveTab("overview"); }}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", ftConf.bg)}>
                                            <VFuelIcon className={cn("w-5 h-5", ftConf.color)} />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-zinc-100 group-hover:text-zinc-50 transition-colors">{vp.name}</h3>
                                            <p className="text-xs text-zinc-500">
                                                {[vp.make, vp.model, vp.year].filter(Boolean).join(" ") || "—"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openEditVehicle(v); }}
                                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-zinc-800 transition-all"
                                        >
                                            <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, id: v._id, name: vp.name }); }}
                                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-950/50 transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                        </button>
                                    </div>
                                </div>

                                {/* Registration & Odometer */}
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    {vp.registration_number && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                                            {vp.registration_number}
                                        </span>
                                    )}
                                    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", ftConf.bg, ftConf.border, ftConf.color)}>
                                        {ftConf.label}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 text-xs text-zinc-500 mb-4">
                                    <Gauge className="w-3.5 h-3.5" />
                                    <span className="font-medium text-zinc-300">{vp.odometer_reading.toLocaleString()}</span>
                                    <span>{vp.odometer_unit}</span>
                                </div>

                                {/* Expiry badges */}
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                    {expiryBadge(vp.insurance_expiry, "Insurance")}
                                    {expiryBadge(vp.pollution_certificate_expiry, "PUC")}
                                    {expiryBadge(vp.next_service_due, "Service")}
                                </div>

                                {/* Footer stats */}
                                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                    <span className="flex items-center gap-1">
                                        <Wrench className="w-3 h-3" /> {(vp.service_records || []).length} services
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Fuel className="w-3 h-3" /> {(vp.fuel_logs || []).length} fills
                                    </span>
                                    {(totalServiceCost + totalFuelCost) > 0 && (
                                        <span className="flex items-center gap-1 text-zinc-400">
                                            <DollarSign className="w-3 h-3" /> {(totalServiceCost + totalFuelCost).toLocaleString()}
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Vehicle Add/Edit Modal */}
            <AnimatePresence>
                {showVehicleForm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowVehicleForm(false); setEditingVehicle(null); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-zinc-50">{editingVehicle ? "Edit" : "Add"} Vehicle</h3>
                                <button onClick={() => { setShowVehicleForm(false); setEditingVehicle(null); }} className="p-1 rounded-lg hover:bg-zinc-800"><X className="w-5 h-5 text-zinc-400" /></button>
                            </div>
                            <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
                                {/* Name */}
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Vehicle Name *</label>
                                    <input type="text" value={formData.name} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))} placeholder="e.g., My Creta, Dad's Activa" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600" />
                                </div>

                                {/* Make / Model / Year */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Make</label>
                                        <input type="text" value={formData.make || ""} onChange={(e) => setFormData((f) => ({ ...f, make: e.target.value }))} placeholder="e.g., Hyundai" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Model</label>
                                        <input type="text" value={formData.model || ""} onChange={(e) => setFormData((f) => ({ ...f, model: e.target.value }))} placeholder="e.g., Creta" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Year</label>
                                        <input type="number" value={formData.year ?? ""} onChange={(e) => setFormData((f) => ({ ...f, year: e.target.value ? Number(e.target.value) : undefined }))} placeholder="2024" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600" />
                                    </div>
                                </div>

                                {/* Registration / Color */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Registration Number</label>
                                        <input type="text" value={formData.registration_number || ""} onChange={(e) => setFormData((f) => ({ ...f, registration_number: e.target.value }))} placeholder="e.g., KA-01-AB-1234" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Color</label>
                                        <input type="text" value={formData.color || ""} onChange={(e) => setFormData((f) => ({ ...f, color: e.target.value }))} placeholder="e.g., Phantom Black" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600" />
                                    </div>
                                </div>

                                {/* Fuel Type / Odometer */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Fuel Type</label>
                                        <select value={formData.fuel_type} onChange={(e) => setFormData((f) => ({ ...f, fuel_type: e.target.value as FuelType }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600">
                                            {Object.entries(FUEL_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Odometer</label>
                                        <input type="number" min="0" value={formData.odometer_reading} onChange={(e) => setFormData((f) => ({ ...f, odometer_reading: Number(e.target.value) || 0 }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Unit</label>
                                        <select value={formData.odometer_unit} onChange={(e) => setFormData((f) => ({ ...f, odometer_unit: e.target.value as OdometerUnit }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600">
                                            <option value="km">Kilometers</option>
                                            <option value="mi">Miles</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Expiry dates */}
                                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-4">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5" /> Important Dates
                                    </p>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Insurance Expiry</label>
                                            <input type="date" value={formatDateInput(formData.insurance_expiry)} onChange={(e) => setFormData((f) => ({ ...f, insurance_expiry: e.target.value ? toISODate(e.target.value) : undefined }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">PUC Expiry</label>
                                            <input type="date" value={formatDateInput(formData.pollution_certificate_expiry)} onChange={(e) => setFormData((f) => ({ ...f, pollution_certificate_expiry: e.target.value ? toISODate(e.target.value) : undefined }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Next Service</label>
                                            <input type="date" value={formatDateInput(formData.next_service_due)} onChange={(e) => setFormData((f) => ({ ...f, next_service_due: e.target.value ? toISODate(e.target.value) : undefined }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Service at Odometer</label>
                                        <input type="number" min="0" value={formData.next_service_odometer ?? ""} onChange={(e) => setFormData((f) => ({ ...f, next_service_odometer: e.target.value ? Number(e.target.value) : undefined }))} placeholder={`e.g., 15000 ${formData.odometer_unit}`} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600" />
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Notes</label>
                                    <textarea value={formData.notes || ""} onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Any additional notes about this vehicle..." className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 resize-none" />
                                </div>
                            </div>
                            <div className="p-6 border-t border-zinc-800 flex items-center justify-end gap-3">
                                <button onClick={() => { setShowVehicleForm(false); setEditingVehicle(null); }} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all">Cancel</button>
                                <button onClick={saveVehicle} disabled={saving} className="px-5 py-2.5 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50">
                                    {saving ? "Saving..." : editingVehicle ? "Update Vehicle" : "Add Vehicle"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
            <ConfirmDialog
                isOpen={confirmDelete.open}
                title="Delete Vehicle"
                description={`Are you sure you want to delete "${confirmDelete.name}"? All service records, fuel logs, and documents will be permanently removed.`}
                confirmLabel="Delete"
                onConfirm={() => deleteVehicle(confirmDelete.id)}
                onClose={() => setConfirmDelete({ open: false, id: "", name: "" })}
            />
        </div>
    );
}
