"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
    HeartPulse, Plus, X, Edit3, Trash2, ChevronLeft, AlertTriangle,
    Clock, Pill, Syringe, Stethoscope, FileText, Activity,
    Ruler, User, Users, PawPrint, Droplets,
    AlertCircle, TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Toast, { type ToastType } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// ─── Types ───────────────────────────────────────────────────────────────────

type ProfileType = "self" | "family" | "pet";
type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "unknown";
type Gender = "male" | "female" | "other";
type ConditionStatus = "active" | "managed" | "resolved";
type MedicationStatus = "active" | "completed" | "discontinued";
type VisitType = "checkup" | "consultation" | "emergency" | "surgery" | "lab_test" | "follow_up" | "dental" | "eye" | "other";
type LabStatus = "normal" | "borderline" | "abnormal";
type DocType = "prescription" | "bill" | "lab_report" | "discharge_summary" | "insurance" | "imaging" | "other";

interface Condition {
    id: string;
    name: string;
    diagnosed_date?: string;
    status: ConditionStatus;
    notes?: string;
}

interface Medication {
    id: string;
    name: string;
    dosage?: string;
    prescribed_by?: string;
    start_date?: string;
    end_date?: string;
    refill_date?: string;
    status: MedicationStatus;
    notes?: string;
}

interface Vaccination {
    id: string;
    name: string;
    date_administered: string;
    next_due?: string;
    provider?: string;
    batch_number?: string;
    notes?: string;
}

interface Visit {
    id: string;
    date: string;
    type: VisitType;
    doctor?: string;
    facility?: string;
    diagnosis?: string;
    prescription?: string;
    cost?: number;
    currency: string;
    notes?: string;
}

interface LabResult {
    id: string;
    date: string;
    test_name: string;
    value: string;
    unit?: string;
    reference_range?: string;
    status: LabStatus;
    notes?: string;
}

interface Measurement {
    id: string;
    date: string;
    height_cm?: number;
    weight_kg?: number;
    notes?: string;
}

interface HealthDocument {
    id: string;
    type: DocType;
    title: string;
    date?: string;
    notes?: string;
}

interface HealthPayload {
    name: string;
    type: ProfileType;
    relation?: string;
    date_of_birth?: string;
    blood_group: BloodGroup;
    gender?: Gender;
    avatar_url?: string;
    emergency_contact?: string;
    insurance_info?: string;
    allergies: string[];
    conditions: Condition[];
    medications: Medication[];
    vaccinations: Vaccination[];
    visits: Visit[];
    lab_results: LabResult[];
    measurements: Measurement[];
    documents: HealthDocument[];
    notes?: string;
    tags: string[];
}

interface HealthProfile {
    _id: string;
    created_at: string;
    updated_at: string;
    payload: HealthPayload;
}

type DetailTab = "overview" | "medications" | "vaccinations" | "visits" | "lab_results" | "body_stats" | "documents";

// ─── Constants ───────────────────────────────────────────────────────────────

const PROFILE_TYPE_CONFIG: Record<ProfileType, { label: string; color: string; bg: string; border: string; icon: typeof User }> = {
    self: { label: "Self", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: User },
    family: { label: "Family", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", icon: Users },
    pet: { label: "Pet", color: "text-warning", bg: "bg-warning/10", border: "border-warning/20", icon: PawPrint },
};

const CONDITION_STATUS_CONFIG: Record<ConditionStatus, { label: string; color: string; bg: string }> = {
    active: { label: "Active", color: "text-danger", bg: "bg-danger/10" },
    managed: { label: "Managed", color: "text-warning", bg: "bg-warning/10" },
    resolved: { label: "Resolved", color: "text-success", bg: "bg-success/10" },
};

const MEDICATION_STATUS_CONFIG: Record<MedicationStatus, { label: string; color: string; bg: string }> = {
    active: { label: "Active", color: "text-success", bg: "bg-success/10" },
    completed: { label: "Completed", color: "text-blue-400", bg: "bg-blue-500/10" },
    discontinued: { label: "Discontinued", color: "text-zinc-400", bg: "bg-zinc-500/10" },
};

const VISIT_TYPE_CONFIG: Record<VisitType, { label: string; color: string }> = {
    checkup: { label: "Checkup", color: "text-blue-400" },
    consultation: { label: "Consultation", color: "text-purple-400" },
    emergency: { label: "Emergency", color: "text-danger" },
    surgery: { label: "Surgery", color: "text-orange-400" },
    lab_test: { label: "Lab Test", color: "text-teal-400" },
    follow_up: { label: "Follow-up", color: "text-cyan-400" },
    dental: { label: "Dental", color: "text-purple-400" },
    eye: { label: "Eye", color: "text-teal-400" },
    other: { label: "Other", color: "text-zinc-400" },
};

const LAB_STATUS_CONFIG: Record<LabStatus, { label: string; color: string; bg: string; border: string }> = {
    normal: { label: "Normal", color: "text-success", bg: "bg-success/10", border: "border-success/20" },
    borderline: { label: "Borderline", color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
    abnormal: { label: "Abnormal", color: "text-danger", bg: "bg-danger/10", border: "border-danger/20" },
};

const DOC_TYPE_CONFIG: Record<DocType, { label: string; color: string }> = {
    prescription: { label: "Prescription", color: "text-blue-400" },
    bill: { label: "Bill", color: "text-warning" },
    lab_report: { label: "Lab Report", color: "text-teal-400" },
    discharge_summary: { label: "Discharge", color: "text-purple-400" },
    insurance: { label: "Insurance", color: "text-success" },
    imaging: { label: "Imaging", color: "text-cyan-400" },
    other: { label: "Other", color: "text-zinc-400" },
};

const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"];

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
    return `${d}T00:00:00.000Z`;
}

function daysUntil(dateStr?: string): number | null {
    if (!dateStr) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getDueStatus(dateStr?: string): "overdue" | "warning" | "ok" | "none" {
    if (!dateStr) return "none";
    const days = daysUntil(dateStr);
    if (days === null) return "none";
    if (days < 0) return "overdue";
    if (days <= 30) return "warning";
    return "ok";
}

function dueBadge(dateStr?: string, label?: string) {
    const status = getDueStatus(dateStr);
    if (status === "none") return null;
    const days = daysUntil(dateStr)!;
    const config = {
        overdue: { text: `${label ? label + ": " : ""}Overdue ${Math.abs(days)}d`, bg: "bg-danger/10", border: "border-danger/20", color: "text-danger" },
        warning: { text: `${label ? label + ": " : ""}${days}d left`, bg: "bg-warning/10", border: "border-warning/20", color: "text-warning" },
        ok: { text: `${label ? label + ": " : ""}${days}d left`, bg: "bg-success/10", border: "border-success/20", color: "text-success" },
    }[status];
    return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", config.bg, config.border, config.color)}>
            {status === "overdue" ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {config.text}
        </span>
    );
}

function uuid() {
    return crypto.randomUUID();
}

function emptyPayload(): HealthPayload {
    return {
        name: "",
        type: "self",
        blood_group: "unknown",
        allergies: [],
        conditions: [],
        medications: [],
        vaccinations: [],
        visits: [],
        lab_results: [],
        measurements: [],
        documents: [],
        tags: [],
    };
}

function getInitials(name: string): string {
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function calculateBMI(heightCm?: number, weightKg?: number): number | null {
    if (!heightCm || !weightKg || heightCm <= 0) return null;
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
}

function bmiCategory(bmi: number): { label: string; color: string } {
    if (bmi < 18.5) return { label: "Underweight", color: "text-warning" };
    if (bmi < 25) return { label: "Normal", color: "text-success" };
    if (bmi < 30) return { label: "Overweight", color: "text-warning" };
    return { label: "Obese", color: "text-danger" };
}

// ─── Shared form elements ────────────────────────────────────────────────────

const inputCls = "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600";
const labelCls = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5";

// ─── Portal wrapper ──────────────────────────────────────────────────────────

function Portal({ children }: { children: ReactNode }) {
    if (typeof document === "undefined") return null;
    return createPortal(children, document.body);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function HealthAdminView() {
    const [profiles, setProfiles] = useState<HealthProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Profile form
    const [showProfileForm, setShowProfileForm] = useState(false);
    const [editingProfile, setEditingProfile] = useState<HealthProfile | null>(null);
    const [formData, setFormData] = useState<HealthPayload>(emptyPayload());
    const [allergyInput, setAllergyInput] = useState("");

    // Detail view
    const [selectedProfile, setSelectedProfile] = useState<HealthProfile | null>(null);
    const [activeTab, setActiveTab] = useState<DetailTab>("overview");

    // Sub-form states
    const [showSubForm, setShowSubForm] = useState<string | null>(null);
    const [conditionForm, setConditionForm] = useState<Partial<Condition>>({});
    const [editingCondition, setEditingCondition] = useState<Condition | null>(null);
    const [medicationForm, setMedicationForm] = useState<Partial<Medication>>({});
    const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
    const [vaccinationForm, setVaccinationForm] = useState<Partial<Vaccination>>({});
    const [editingVaccination, setEditingVaccination] = useState<Vaccination | null>(null);
    const [visitForm, setVisitForm] = useState<Partial<Visit>>({});
    const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
    const [labForm, setLabForm] = useState<Partial<LabResult>>({});
    const [editingLab, setEditingLab] = useState<LabResult | null>(null);
    const [measurementForm, setMeasurementForm] = useState<Partial<Measurement>>({});
    const [editingMeasurement, setEditingMeasurement] = useState<Measurement | null>(null);
    const [docForm, setDocForm] = useState<Partial<HealthDocument>>({});
    const [editingDoc, setEditingDoc] = useState<HealthDocument | null>(null);

    // UI
    const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean }>({ message: "", type: "success", visible: false });
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });

    const showToast = useCallback((message: string, type: ToastType = "success") => {
        setToast({ message, type, visible: true });
    }, []);

    // ─── API ─────────────────────────────────────────────────────────────────

    const fetchProfiles = useCallback(async () => {
        try {
            const r = await fetch("/api/content?module_type=health_profile");
            const d = await r.json();
            setProfiles(d.data || []);
        } catch {
            showToast("Failed to load health profiles", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    const saveProfile = async () => {
        if (!formData.name.trim()) {
            showToast("Name is required", "error");
            return;
        }
        setSaving(true);
        const profileId = editingProfile?._id;
        try {
            if (editingProfile) {
                await fetch(`/api/content/${editingProfile._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ payload: formData }),
                });
                showToast("Profile updated");
            } else {
                await fetch("/api/content", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ module_type: "health_profile", is_public: false, payload: formData }),
                });
                showToast("Profile added");
            }
            setShowProfileForm(false);
            setEditingProfile(null);
            setFormData(emptyPayload());
            await fetchProfiles();
            if (profileId && selectedProfile?._id === profileId) {
                const r = await fetch(`/api/content/${profileId}`);
                const d = await r.json();
                if (d.data) setSelectedProfile(d.data);
            }
        } catch {
            showToast("Failed to save profile", "error");
        } finally {
            setSaving(false);
        }
    };

    const deleteProfile = async (id: string) => {
        try {
            await fetch(`/api/content/${id}`, { method: "DELETE" });
            showToast("Profile deleted");
            if (selectedProfile?._id === id) setSelectedProfile(null);
            await fetchProfiles();
        } catch {
            showToast("Failed to delete profile", "error");
        }
    };

    const updatePayload = async (profile: HealthProfile, newPayload: HealthPayload) => {
        try {
            await fetch(`/api/content/${profile._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payload: newPayload }),
            });
            await fetchProfiles();
            const r = await fetch(`/api/content/${profile._id}`);
            const d = await r.json();
            if (d.data) setSelectedProfile(d.data);
        } catch {
            showToast("Failed to update", "error");
        }
    };

    // ─── Sub-record CRUD helpers ─────────────────────────────────────────────

    const saveSubRecord = async <T extends { id: string }>(
        field: keyof HealthPayload,
        record: T,
        editingRecord: T | null
    ) => {
        if (!selectedProfile) return;
        const arr = [...(((selectedProfile.payload[field] as unknown) as T[]) || [])];
        const idx = arr.findIndex((r) => r.id === record.id);
        if (idx >= 0) arr[idx] = record;
        else arr.push(record);
        await updatePayload(selectedProfile, { ...selectedProfile.payload, [field]: arr });
        showToast(editingRecord ? "Updated" : "Added");
        setShowSubForm(null);
    };

    const deleteSubRecord = async (field: keyof HealthPayload, id: string) => {
        if (!selectedProfile) return;
        const arr = ((selectedProfile.payload[field] as Array<{ id: string }>) || []).filter((r) => r.id !== id);
        await updatePayload(selectedProfile, { ...selectedProfile.payload, [field]: arr });
        showToast("Deleted");
    };

    // ─── Conditions ──────────────────────────────────────────────────────────

    const openConditionForm = (c?: Condition) => {
        if (c) {
            setEditingCondition(c);
            setConditionForm({ ...c, diagnosed_date: formatDateInput(c.diagnosed_date) });
        } else {
            setEditingCondition(null);
            setConditionForm({ status: "active" });
        }
        setShowSubForm("condition");
    };

    const saveCondition = async () => {
        if (!conditionForm.name?.trim()) { showToast("Name is required", "error"); return; }
        const record: Condition = {
            id: editingCondition?.id || uuid(),
            name: conditionForm.name || "",
            diagnosed_date: conditionForm.diagnosed_date ? toISODate(conditionForm.diagnosed_date) : undefined,
            status: (conditionForm.status as ConditionStatus) || "active",
            notes: conditionForm.notes || undefined,
        };
        await saveSubRecord("conditions", record, editingCondition);
    };

    // ─── Medications ─────────────────────────────────────────────────────────

    const openMedicationForm = (m?: Medication) => {
        if (m) {
            setEditingMedication(m);
            setMedicationForm({ ...m, start_date: formatDateInput(m.start_date), end_date: formatDateInput(m.end_date), refill_date: formatDateInput(m.refill_date) });
        } else {
            setEditingMedication(null);
            setMedicationForm({ status: "active" });
        }
        setShowSubForm("medication");
    };

    const saveMedication = async () => {
        if (!medicationForm.name?.trim()) { showToast("Medication name is required", "error"); return; }
        const record: Medication = {
            id: editingMedication?.id || uuid(),
            name: medicationForm.name || "",
            dosage: medicationForm.dosage || undefined,
            prescribed_by: medicationForm.prescribed_by || undefined,
            start_date: medicationForm.start_date ? toISODate(medicationForm.start_date) : undefined,
            end_date: medicationForm.end_date ? toISODate(medicationForm.end_date) : undefined,
            refill_date: medicationForm.refill_date ? toISODate(medicationForm.refill_date) : undefined,
            status: (medicationForm.status as MedicationStatus) || "active",
            notes: medicationForm.notes || undefined,
        };
        await saveSubRecord("medications", record, editingMedication);
    };

    // ─── Vaccinations ────────────────────────────────────────────────────────

    const openVaccinationForm = (v?: Vaccination) => {
        if (v) {
            setEditingVaccination(v);
            setVaccinationForm({ ...v, date_administered: formatDateInput(v.date_administered), next_due: formatDateInput(v.next_due) });
        } else {
            setEditingVaccination(null);
            setVaccinationForm({ date_administered: new Date().toISOString().slice(0, 10) });
        }
        setShowSubForm("vaccination");
    };

    const saveVaccination = async () => {
        if (!vaccinationForm.name?.trim()) { showToast("Vaccine name is required", "error"); return; }
        const record: Vaccination = {
            id: editingVaccination?.id || uuid(),
            name: vaccinationForm.name || "",
            date_administered: toISODate(vaccinationForm.date_administered || new Date().toISOString().slice(0, 10)),
            next_due: vaccinationForm.next_due ? toISODate(vaccinationForm.next_due) : undefined,
            provider: vaccinationForm.provider || undefined,
            batch_number: vaccinationForm.batch_number || undefined,
            notes: vaccinationForm.notes || undefined,
        };
        await saveSubRecord("vaccinations", record, editingVaccination);
    };

    // ─── Visits ──────────────────────────────────────────────────────────────

    const openVisitForm = (v?: Visit) => {
        if (v) {
            setEditingVisit(v);
            setVisitForm({ ...v, date: formatDateInput(v.date) });
        } else {
            setEditingVisit(null);
            setVisitForm({ type: "checkup", currency: "INR", date: new Date().toISOString().slice(0, 10) });
        }
        setShowSubForm("visit");
    };

    const saveVisit = async () => {
        if (!visitForm.date) { showToast("Date is required", "error"); return; }
        const record: Visit = {
            id: editingVisit?.id || uuid(),
            date: toISODate(visitForm.date || new Date().toISOString().slice(0, 10)),
            type: (visitForm.type as VisitType) || "checkup",
            doctor: visitForm.doctor || undefined,
            facility: visitForm.facility || undefined,
            diagnosis: visitForm.diagnosis || undefined,
            prescription: visitForm.prescription || undefined,
            cost: visitForm.cost ? Number(visitForm.cost) : undefined,
            currency: visitForm.currency || "INR",
            notes: visitForm.notes || undefined,
        };
        await saveSubRecord("visits", record, editingVisit);
    };

    // ─── Lab Results ─────────────────────────────────────────────────────────

    const openLabForm = (l?: LabResult) => {
        if (l) {
            setEditingLab(l);
            setLabForm({ ...l, date: formatDateInput(l.date) });
        } else {
            setEditingLab(null);
            setLabForm({ status: "normal", date: new Date().toISOString().slice(0, 10) });
        }
        setShowSubForm("lab");
    };

    const saveLabResult = async () => {
        if (!labForm.test_name?.trim() || !labForm.value?.trim()) { showToast("Test name and value are required", "error"); return; }
        const record: LabResult = {
            id: editingLab?.id || uuid(),
            date: toISODate(labForm.date || new Date().toISOString().slice(0, 10)),
            test_name: labForm.test_name || "",
            value: labForm.value || "",
            unit: labForm.unit || undefined,
            reference_range: labForm.reference_range || undefined,
            status: (labForm.status as LabStatus) || "normal",
            notes: labForm.notes || undefined,
        };
        await saveSubRecord("lab_results", record, editingLab);
    };

    // ─── Measurements ────────────────────────────────────────────────────────

    const openMeasurementForm = (m?: Measurement) => {
        if (m) {
            setEditingMeasurement(m);
            setMeasurementForm({ ...m, date: formatDateInput(m.date) });
        } else {
            setEditingMeasurement(null);
            setMeasurementForm({ date: new Date().toISOString().slice(0, 10) });
        }
        setShowSubForm("measurement");
    };

    const saveMeasurement = async () => {
        if (!measurementForm.height_cm && !measurementForm.weight_kg) {
            showToast("At least height or weight is required", "error"); return;
        }
        const record: Measurement = {
            id: editingMeasurement?.id || uuid(),
            date: toISODate(measurementForm.date || new Date().toISOString().slice(0, 10)),
            height_cm: measurementForm.height_cm ? Number(measurementForm.height_cm) : undefined,
            weight_kg: measurementForm.weight_kg ? Number(measurementForm.weight_kg) : undefined,
            notes: measurementForm.notes || undefined,
        };
        await saveSubRecord("measurements", record, editingMeasurement);
    };

    // ─── Documents ───────────────────────────────────────────────────────────

    const openDocForm = (doc?: HealthDocument) => {
        if (doc) {
            setEditingDoc(doc);
            setDocForm({ ...doc, date: formatDateInput(doc.date) });
        } else {
            setEditingDoc(null);
            setDocForm({ type: "other" });
        }
        setShowSubForm("document");
    };

    const saveDocument = async () => {
        if (!docForm.title?.trim()) { showToast("Title is required", "error"); return; }
        const record: HealthDocument = {
            id: editingDoc?.id || uuid(),
            type: (docForm.type as DocType) || "other",
            title: docForm.title || "",
            date: docForm.date ? toISODate(docForm.date) : undefined,
            notes: docForm.notes || undefined,
        };
        await saveSubRecord("documents", record, editingDoc);
    };

    // ─── Computed ────────────────────────────────────────────────────────────

    const profileAlerts = useMemo(() => {
        const alerts: Array<{ profileName: string; label: string; date: string; status: "overdue" | "warning" }> = [];
        for (const p of profiles) {
            const payload = p.payload;
            for (const med of payload.medications || []) {
                if (med.status === "active" && med.refill_date) {
                    const s = getDueStatus(med.refill_date);
                    if (s === "overdue" || s === "warning") {
                        alerts.push({ profileName: payload.name, label: `Refill: ${med.name}`, date: med.refill_date, status: s });
                    }
                }
            }
            for (const vac of payload.vaccinations || []) {
                if (vac.next_due) {
                    const s = getDueStatus(vac.next_due);
                    if (s === "overdue" || s === "warning") {
                        alerts.push({ profileName: payload.name, label: `Vaccine: ${vac.name}`, date: vac.next_due, status: s });
                    }
                }
            }
        }
        alerts.sort((a, b) => {
            if (a.status === "overdue" && b.status !== "overdue") return -1;
            if (a.status !== "overdue" && b.status === "overdue") return 1;
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
        return alerts;
    }, [profiles]);

    // ─── Form helpers ────────────────────────────────────────────────────────

    const openAddProfile = () => {
        setEditingProfile(null);
        setFormData(emptyPayload());
        setAllergyInput("");
        setShowProfileForm(true);
    };

    const openEditProfile = (p: HealthProfile) => {
        setEditingProfile(p);
        setFormData({ ...p.payload });
        setAllergyInput("");
        setShowProfileForm(true);
    };

    // ─── Sub-form Modal renderer ─────────────────────────────────────────────

    function renderModal(title: string, formKey: string, onSave: () => Promise<void>, children: React.ReactNode) {
        return (
            <Portal>
                <AnimatePresence>
                    {showSubForm === formKey && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSubForm(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg max-h-[80vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                                <div className="p-6 border-b border-zinc-800 flex items-center justify-between shrink-0">
                                    <h3 className="text-lg font-bold text-zinc-50">{title}</h3>
                                    <button onClick={() => setShowSubForm(null)} className="p-1 rounded-lg hover:bg-zinc-800"><X className="w-5 h-5 text-zinc-400" /></button>
                                </div>
                                <div className="p-6 space-y-4 flex-1 min-h-0 overflow-y-auto">
                                    {children}
                                </div>
                                <div className="p-6 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0">
                                    <button onClick={() => setShowSubForm(null)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all">Cancel</button>
                                    <button onClick={onSave} className="px-5 py-2.5 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95">
                                        Save
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </Portal>
        );
    }

    // ─── Profile Form Modal (shared across views) ─────────────────────────────

    const profileFormModal = (
        <Portal>
            <AnimatePresence>
                {showProfileForm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProfileForm(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg max-h-[80vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-zinc-800 flex items-center justify-between shrink-0">
                                <h3 className="text-lg font-bold text-zinc-50">{editingProfile ? "Edit" : "Add"} Health Profile</h3>
                                <button onClick={() => setShowProfileForm(false)} className="p-1 rounded-lg hover:bg-zinc-800"><X className="w-5 h-5 text-zinc-400" /></button>
                            </div>
                            <div className="p-6 space-y-4 flex-1 min-h-0 overflow-y-auto">
                                <div>
                                    <label className={labelCls}>Name *</label>
                                    <input type="text" value={formData.name} onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="Full name" className={inputCls} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelCls}>Type</label>
                                        <select value={formData.type} onChange={(e) => setFormData(f => ({ ...f, type: e.target.value as ProfileType }))} className={inputCls}>
                                            <option value="self">Self</option>
                                            <option value="family">Family</option>
                                            <option value="pet">Pet</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Relation</label>
                                        <input type="text" value={formData.relation || ""} onChange={(e) => setFormData(f => ({ ...f, relation: e.target.value }))} placeholder="e.g., Mother" className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Gender</label>
                                        <select value={formData.gender || ""} onChange={(e) => setFormData(f => ({ ...f, gender: (e.target.value || undefined) as Gender | undefined }))} className={inputCls}>
                                            <option value="">—</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Date of Birth</label>
                                        <input type="date" value={formatDateInput(formData.date_of_birth)} onChange={(e) => setFormData(f => ({ ...f, date_of_birth: e.target.value ? toISODate(e.target.value) : undefined }))} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Blood Group</label>
                                        <select value={formData.blood_group} onChange={(e) => setFormData(f => ({ ...f, blood_group: e.target.value as BloodGroup }))} className={inputCls}>
                                            {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg === "unknown" ? "Unknown" : bg}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Emergency Contact</label>
                                    <input type="text" value={formData.emergency_contact || ""} onChange={(e) => setFormData(f => ({ ...f, emergency_contact: e.target.value }))} placeholder="Phone or name" className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Insurance Info</label>
                                    <input type="text" value={formData.insurance_info || ""} onChange={(e) => setFormData(f => ({ ...f, insurance_info: e.target.value }))} placeholder="Policy number or details" className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Allergies</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {formData.allergies.map((a, i) => (
                                            <span key={i} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-danger/10 border border-danger/20 text-danger">
                                                {a}
                                                <button onClick={() => setFormData(f => ({ ...f, allergies: f.allergies.filter((_, j) => j !== i) }))} className="hover:text-danger">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={allergyInput}
                                            onChange={(e) => setAllergyInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && allergyInput.trim()) {
                                                    e.preventDefault();
                                                    setFormData(f => ({ ...f, allergies: [...f.allergies, allergyInput.trim()] }));
                                                    setAllergyInput("");
                                                }
                                            }}
                                            placeholder="Type and press Enter"
                                            className={inputCls}
                                        />
                                        <button
                                            onClick={() => {
                                                if (allergyInput.trim()) {
                                                    setFormData(f => ({ ...f, allergies: [...f.allergies, allergyInput.trim()] }));
                                                    setAllergyInput("");
                                                }
                                            }}
                                            className="px-3 py-2 bg-zinc-800 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Notes</label>
                                    <textarea value={formData.notes || ""} onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="General notes..." className={cn(inputCls, "resize-none")} />
                                </div>
                            </div>
                            <div className="p-6 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0">
                                <button onClick={() => setShowProfileForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all">Cancel</button>
                                <button onClick={saveProfile} disabled={saving} className="px-5 py-2.5 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50">
                                    {saving ? "Saving..." : editingProfile ? "Update" : "Add"} Profile
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Portal>
    );

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

    if (selectedProfile) {
        const p = selectedProfile.payload;
        const typeConfig = PROFILE_TYPE_CONFIG[p.type];
        const TypeIcon = typeConfig.icon;
        const activeMeds = p.medications.filter(m => m.status === "active");
        const activeConditions = p.conditions.filter(c => c.status !== "resolved");

        // Latest measurement for BMI
        const sortedMeasurements = [...p.measurements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const latestMeasurement = sortedMeasurements[0];
        const latestBMI = latestMeasurement ? calculateBMI(latestMeasurement.height_cm, latestMeasurement.weight_kg) : null;

        const TAB_CONFIG: Array<{ key: DetailTab; label: string; icon: typeof HeartPulse }> = [
            { key: "overview", label: "Overview", icon: HeartPulse },
            { key: "medications", label: "Medications", icon: Pill },
            { key: "vaccinations", label: "Vaccines", icon: Syringe },
            { key: "visits", label: "Visits", icon: Stethoscope },
            { key: "lab_results", label: "Lab Results", icon: Activity },
            { key: "body_stats", label: "Body Stats", icon: Ruler },
            { key: "documents", label: "Documents", icon: FileText },
        ];

        return (
            <div className="animate-fade-in-up space-y-6">
                {/* Back + Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => { setSelectedProfile(null); setActiveTab("overview"); }}
                        className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-zinc-400" />
                    </button>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0", typeConfig.bg, typeConfig.color)}>
                            {getInitials(p.name)}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-2xl font-bold text-zinc-50 tracking-tight truncate">{p.name}</h1>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", typeConfig.bg, typeConfig.border, typeConfig.color)}>
                                    <TypeIcon className="w-3 h-3 inline mr-1" />{typeConfig.label}
                                </span>
                                {p.relation && <span className="text-xs text-zinc-500">{p.relation}</span>}
                                {p.blood_group !== "unknown" && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-danger/10 border border-danger/20 text-danger">
                                        <Droplets className="w-3 h-3 inline mr-1" />{p.blood_group}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => openEditProfile(selectedProfile)} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors">
                            <Edit3 className="w-4 h-4 text-zinc-400" />
                        </button>
                        <button onClick={() => setConfirmDelete({ open: true, id: selectedProfile._id, name: p.name })} className="p-2 rounded-xl bg-zinc-900 border border-danger/30 hover:bg-danger/50 transition-colors">
                            <Trash2 className="w-4 h-4 text-danger" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 overflow-x-auto">
                    {TAB_CONFIG.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                "flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                                activeTab === tab.key
                                    ? "bg-zinc-800 text-zinc-50 shadow-lg"
                                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                            )}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* ─── Tab: Overview ──────────────────────────────────────── */}
                {activeTab === "overview" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        {/* Stats row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                                <p className={labelCls}>Active Conditions</p>
                                <p className="text-2xl font-bold text-zinc-50">{activeConditions.length}</p>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                                <p className={labelCls}>Active Meds</p>
                                <p className="text-2xl font-bold text-zinc-50">{activeMeds.length}</p>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                                <p className={labelCls}>Total Visits</p>
                                <p className="text-2xl font-bold text-zinc-50">{p.visits.length}</p>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                                <p className={labelCls}>Latest BMI</p>
                                {latestBMI ? (
                                    <>
                                        <p className={cn("text-2xl font-bold", bmiCategory(latestBMI).color)}>{latestBMI.toFixed(1)}</p>
                                        <p className={cn("text-xs mt-0.5", bmiCategory(latestBMI).color)}>{bmiCategory(latestBMI).label}</p>
                                    </>
                                ) : (
                                    <p className="text-sm text-zinc-600 italic">No data</p>
                                )}
                            </div>
                        </div>

                        {/* Allergies */}
                        {p.allergies.length > 0 && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                                <p className={cn(labelCls, "mb-3")}>Allergies</p>
                                <div className="flex flex-wrap gap-2">
                                    {p.allergies.map((a, i) => (
                                        <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-danger/10 border border-danger/20 text-danger">{a}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Conditions */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <p className={labelCls}>Conditions</p>
                                <button onClick={() => openConditionForm()} className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors">
                                    <Plus className="w-3 h-3" /> Add
                                </button>
                            </div>
                            {p.conditions.length === 0 ? (
                                <p className="text-xs text-zinc-600 italic">No conditions tracked</p>
                            ) : (
                                <div className="space-y-2">
                                    {p.conditions.map((c) => (
                                        <div key={c.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0 group">
                                            <div>
                                                <p className="text-sm font-medium text-zinc-200">{c.name}</p>
                                                {c.diagnosed_date && <p className="text-[11px] text-zinc-500">Since {formatDate(c.diagnosed_date)}</p>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", CONDITION_STATUS_CONFIG[c.status].bg, CONDITION_STATUS_CONFIG[c.status].color)}>
                                                    {CONDITION_STATUS_CONFIG[c.status].label}
                                                </span>
                                                <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openConditionForm(c)} className="p-1 rounded hover:bg-zinc-800"><Edit3 className="w-3 h-3 text-zinc-500" /></button>
                                                    <button onClick={() => deleteSubRecord("conditions", c.id)} className="p-1 rounded hover:bg-danger/50"><Trash2 className="w-3 h-3 text-danger" /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Identity details */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                            <p className={labelCls}>Details</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                {p.date_of_birth && (
                                    <div>
                                        <span className="text-zinc-500">Date of Birth</span>
                                        <p className="text-zinc-200 font-medium">{formatDate(p.date_of_birth)}</p>
                                    </div>
                                )}
                                {p.gender && (
                                    <div>
                                        <span className="text-zinc-500">Gender</span>
                                        <p className="text-zinc-200 font-medium capitalize">{p.gender}</p>
                                    </div>
                                )}
                                {p.emergency_contact && (
                                    <div>
                                        <span className="text-zinc-500">Emergency Contact</span>
                                        <p className="text-zinc-200 font-medium">{p.emergency_contact}</p>
                                    </div>
                                )}
                                {p.insurance_info && (
                                    <div>
                                        <span className="text-zinc-500">Insurance</span>
                                        <p className="text-zinc-200 font-medium">{p.insurance_info}</p>
                                    </div>
                                )}
                            </div>
                            {p.notes && (
                                <div className="pt-2 border-t border-zinc-800">
                                    <p className="text-sm text-zinc-400 whitespace-pre-wrap">{p.notes}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* ─── Tab: Medications ───────────────────────────────────── */}
                {activeTab === "medications" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-zinc-400">{p.medications.length} medication{p.medications.length !== 1 ? "s" : ""}</p>
                            <button onClick={() => openMedicationForm()} className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95">
                                <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                        </div>

                        {p.medications.length === 0 ? (
                            <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
                                <Pill className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                                <p className="text-zinc-500 font-medium">No medications tracked</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {[...p.medications]
                                    .sort((a, b) => {
                                        const order: Record<MedicationStatus, number> = { active: 0, completed: 1, discontinued: 2 };
                                        return order[a.status] - order[b.status];
                                    })
                                    .map((med) => {
                                        const sConfig = MEDICATION_STATUS_CONFIG[med.status];
                                        return (
                                            <motion.div key={med.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-colors group">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3 min-w-0">
                                                        <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                                                            <Pill className={cn("w-4 h-4", sConfig.color)} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-zinc-200 truncate">{med.name}</p>
                                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", sConfig.bg, sConfig.color)}>
                                                                    {sConfig.label}
                                                                </span>
                                                                {med.dosage && <span className="text-[11px] text-zinc-500">{med.dosage}</span>}
                                                                {med.prescribed_by && <span className="text-[11px] text-zinc-600">by {med.prescribed_by}</span>}
                                                            </div>
                                                            {med.refill_date && med.status === "active" && (
                                                                <div className="mt-1.5">{dueBadge(med.refill_date, "Refill")}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                                                        <button onClick={() => openMedicationForm(med)} className="p-1.5 rounded-lg hover:bg-zinc-800"><Edit3 className="w-3.5 h-3.5 text-zinc-500" /></button>
                                                        <button onClick={() => deleteSubRecord("medications", med.id)} className="p-1.5 rounded-lg hover:bg-danger/50"><Trash2 className="w-3.5 h-3.5 text-danger" /></button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                            </div>
                        )}

                        {renderModal(
                            `${editingMedication ? "Edit" : "Add"} Medication`,
                            "medication",
                            saveMedication,
                            <>
                                <div>
                                    <label className={labelCls}>Name *</label>
                                    <input type="text" value={medicationForm.name || ""} onChange={(e) => setMedicationForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Metformin" className={inputCls} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Dosage</label>
                                        <input type="text" value={medicationForm.dosage || ""} onChange={(e) => setMedicationForm(f => ({ ...f, dosage: e.target.value }))} placeholder="e.g., 500mg twice daily" className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Status</label>
                                        <select value={medicationForm.status || "active"} onChange={(e) => setMedicationForm(f => ({ ...f, status: e.target.value as MedicationStatus }))} className={inputCls}>
                                            {Object.entries(MEDICATION_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Prescribed By</label>
                                    <input type="text" value={medicationForm.prescribed_by || ""} onChange={(e) => setMedicationForm(f => ({ ...f, prescribed_by: e.target.value }))} placeholder="Doctor name" className={inputCls} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelCls}>Start Date</label>
                                        <input type="date" value={medicationForm.start_date || ""} onChange={(e) => setMedicationForm(f => ({ ...f, start_date: e.target.value }))} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>End Date</label>
                                        <input type="date" value={medicationForm.end_date || ""} onChange={(e) => setMedicationForm(f => ({ ...f, end_date: e.target.value }))} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Refill Date</label>
                                        <input type="date" value={medicationForm.refill_date || ""} onChange={(e) => setMedicationForm(f => ({ ...f, refill_date: e.target.value }))} className={inputCls} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Notes</label>
                                    <textarea value={medicationForm.notes || ""} onChange={(e) => setMedicationForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={cn(inputCls, "resize-none")} />
                                </div>
                            </>
                        )}
                    </motion.div>
                )}

                {/* ─── Tab: Vaccinations ──────────────────────────────────── */}
                {activeTab === "vaccinations" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-zinc-400">{p.vaccinations.length} vaccination{p.vaccinations.length !== 1 ? "s" : ""}</p>
                            <button onClick={() => openVaccinationForm()} className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95">
                                <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                        </div>

                        {p.vaccinations.length === 0 ? (
                            <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
                                <Syringe className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                                <p className="text-zinc-500 font-medium">No vaccinations recorded</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {[...p.vaccinations]
                                    .sort((a, b) => new Date(b.date_administered).getTime() - new Date(a.date_administered).getTime())
                                    .map((vac) => (
                                        <motion.div key={vac.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-colors group">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                                                        <Syringe className="w-4 h-4 text-teal-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-zinc-200 truncate">{vac.name}</p>
                                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                                            <span className="text-[11px] text-zinc-500">{formatDate(vac.date_administered)}</span>
                                                            {vac.provider && <span className="text-[11px] text-zinc-600">by {vac.provider}</span>}
                                                        </div>
                                                        {vac.next_due && (
                                                            <div className="mt-1.5">{dueBadge(vac.next_due, "Next due")}</div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                                                    <button onClick={() => openVaccinationForm(vac)} className="p-1.5 rounded-lg hover:bg-zinc-800"><Edit3 className="w-3.5 h-3.5 text-zinc-500" /></button>
                                                    <button onClick={() => deleteSubRecord("vaccinations", vac.id)} className="p-1.5 rounded-lg hover:bg-danger/50"><Trash2 className="w-3.5 h-3.5 text-danger" /></button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                            </div>
                        )}

                        {renderModal(
                            `${editingVaccination ? "Edit" : "Add"} Vaccination`,
                            "vaccination",
                            saveVaccination,
                            <>
                                <div>
                                    <label className={labelCls}>Vaccine Name *</label>
                                    <input type="text" value={vaccinationForm.name || ""} onChange={(e) => setVaccinationForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., COVID-19 Booster" className={inputCls} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Date Administered *</label>
                                        <input type="date" value={vaccinationForm.date_administered || ""} onChange={(e) => setVaccinationForm(f => ({ ...f, date_administered: e.target.value }))} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Next Due</label>
                                        <input type="date" value={vaccinationForm.next_due || ""} onChange={(e) => setVaccinationForm(f => ({ ...f, next_due: e.target.value }))} className={inputCls} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Provider</label>
                                        <input type="text" value={vaccinationForm.provider || ""} onChange={(e) => setVaccinationForm(f => ({ ...f, provider: e.target.value }))} placeholder="Hospital / clinic" className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Batch Number</label>
                                        <input type="text" value={vaccinationForm.batch_number || ""} onChange={(e) => setVaccinationForm(f => ({ ...f, batch_number: e.target.value }))} className={inputCls} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Notes</label>
                                    <textarea value={vaccinationForm.notes || ""} onChange={(e) => setVaccinationForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={cn(inputCls, "resize-none")} />
                                </div>
                            </>
                        )}
                    </motion.div>
                )}

                {/* ─── Tab: Visits ────────────────────────────────────────── */}
                {activeTab === "visits" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-zinc-400">{p.visits.length} visit{p.visits.length !== 1 ? "s" : ""}</p>
                            <button onClick={() => openVisitForm()} className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95">
                                <Plus className="w-3.5 h-3.5" /> Add Visit
                            </button>
                        </div>

                        {p.visits.length === 0 ? (
                            <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
                                <Stethoscope className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                                <p className="text-zinc-500 font-medium">No visits recorded</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {[...p.visits]
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map((visit) => {
                                        const vtConfig = VISIT_TYPE_CONFIG[visit.type];
                                        return (
                                            <motion.div key={visit.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-colors group">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3 min-w-0">
                                                        <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                                                            <Stethoscope className={cn("w-4 h-4", vtConfig.color)} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800", vtConfig.color)}>
                                                                    {vtConfig.label}
                                                                </span>
                                                                <span className="text-[11px] text-zinc-500">{formatDate(visit.date)}</span>
                                                            </div>
                                                            {visit.doctor && <p className="text-sm text-zinc-300 mt-1">Dr. {visit.doctor}</p>}
                                                            {visit.facility && <p className="text-[11px] text-zinc-600">{visit.facility}</p>}
                                                            {visit.diagnosis && <p className="text-xs text-zinc-400 mt-1">{visit.diagnosis}</p>}
                                                            {visit.notes && <p className="text-xs text-zinc-500 mt-1">{visit.notes}</p>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {visit.cost != null && visit.cost > 0 && (
                                                            <span className="text-sm font-bold text-zinc-300">
                                                                {visit.currency === "INR" ? "\u20B9" : visit.currency} {visit.cost.toLocaleString()}
                                                            </span>
                                                        )}
                                                        <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => openVisitForm(visit)} className="p-1.5 rounded-lg hover:bg-zinc-800"><Edit3 className="w-3.5 h-3.5 text-zinc-500" /></button>
                                                            <button onClick={() => deleteSubRecord("visits", visit.id)} className="p-1.5 rounded-lg hover:bg-danger/50"><Trash2 className="w-3.5 h-3.5 text-danger" /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                            </div>
                        )}

                        {renderModal(
                            `${editingVisit ? "Edit" : "Add"} Visit`,
                            "visit",
                            saveVisit,
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Date *</label>
                                        <input type="date" value={visitForm.date || ""} onChange={(e) => setVisitForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Type</label>
                                        <select value={visitForm.type || "checkup"} onChange={(e) => setVisitForm(f => ({ ...f, type: e.target.value as VisitType }))} className={inputCls}>
                                            {Object.entries(VISIT_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Doctor</label>
                                        <input type="text" value={visitForm.doctor || ""} onChange={(e) => setVisitForm(f => ({ ...f, doctor: e.target.value }))} placeholder="Doctor name" className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Facility</label>
                                        <input type="text" value={visitForm.facility || ""} onChange={(e) => setVisitForm(f => ({ ...f, facility: e.target.value }))} placeholder="Hospital / clinic" className={inputCls} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Diagnosis</label>
                                    <input type="text" value={visitForm.diagnosis || ""} onChange={(e) => setVisitForm(f => ({ ...f, diagnosis: e.target.value }))} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Prescription</label>
                                    <textarea value={visitForm.prescription || ""} onChange={(e) => setVisitForm(f => ({ ...f, prescription: e.target.value }))} rows={2} className={cn(inputCls, "resize-none")} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Cost</label>
                                        <input type="number" min="0" step="0.01" value={visitForm.cost ?? ""} onChange={(e) => setVisitForm(f => ({ ...f, cost: e.target.value ? Number(e.target.value) : undefined }))} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Currency</label>
                                        <input type="text" value={visitForm.currency || "INR"} onChange={(e) => setVisitForm(f => ({ ...f, currency: e.target.value }))} maxLength={3} className={inputCls} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Notes</label>
                                    <textarea value={visitForm.notes || ""} onChange={(e) => setVisitForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={cn(inputCls, "resize-none")} />
                                </div>
                            </>
                        )}
                    </motion.div>
                )}

                {/* ─── Tab: Lab Results ───────────────────────────────────── */}
                {activeTab === "lab_results" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-zinc-400">{p.lab_results.length} result{p.lab_results.length !== 1 ? "s" : ""}</p>
                            <button onClick={() => openLabForm()} className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95">
                                <Plus className="w-3.5 h-3.5" /> Add Result
                            </button>
                        </div>

                        {p.lab_results.length === 0 ? (
                            <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
                                <Activity className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                                <p className="text-zinc-500 font-medium">No lab results recorded</p>
                            </div>
                        ) : (
                            (() => {
                                // Group by test_name
                                const grouped: Record<string, LabResult[]> = {};
                                for (const r of p.lab_results) {
                                    if (!grouped[r.test_name]) grouped[r.test_name] = [];
                                    grouped[r.test_name].push(r);
                                }
                                // Sort each group by date desc
                                for (const key of Object.keys(grouped)) {
                                    grouped[key].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                }

                                return (
                                    <div className="space-y-4">
                                        {Object.entries(grouped).map(([testName, results]) => {
                                            const latest = results[0];
                                            const lsConfig = LAB_STATUS_CONFIG[latest.status];
                                            const hasTrend = results.length > 1;
                                            return (
                                                <div key={testName} className={cn("bg-zinc-900 border rounded-2xl p-4", lsConfig.border)}>
                                                    <div className="flex items-start justify-between gap-3 mb-2">
                                                        <div>
                                                            <p className="text-sm font-semibold text-zinc-200">{testName}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className={cn("text-lg font-bold", lsConfig.color)}>{latest.value}</span>
                                                                {latest.unit && <span className="text-xs text-zinc-500">{latest.unit}</span>}
                                                                <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", lsConfig.bg, lsConfig.color)}>
                                                                    {lsConfig.label}
                                                                </span>
                                                            </div>
                                                            {latest.reference_range && <p className="text-[11px] text-zinc-600 mt-0.5">Ref: {latest.reference_range}</p>}
                                                            <p className="text-[11px] text-zinc-500 mt-0.5">{formatDate(latest.date)}</p>
                                                        </div>
                                                        {hasTrend && (
                                                            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                                                                <TrendingUp className="w-3 h-3" />
                                                                {results.length} readings
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Mini trend bar */}
                                                    {hasTrend && (
                                                        <div className="flex items-end gap-0.5 h-6 mt-2 mb-2">
                                                            {[...results].reverse().map((r) => {
                                                                const numVal = parseFloat(r.value);
                                                                const allVals = results.map(x => parseFloat(x.value)).filter(x => !isNaN(x));
                                                                const max = Math.max(...allVals);
                                                                const height = !isNaN(numVal) && max > 0 ? (numVal / max) * 100 : 50;
                                                                const statusColor = LAB_STATUS_CONFIG[r.status];
                                                                return (
                                                                    <div
                                                                        key={r.id}
                                                                        className={cn("flex-1 rounded-t-sm transition-colors", statusColor.bg)}
                                                                        style={{ height: `${Math.max(height, 12)}%` }}
                                                                        title={`${r.value} ${r.unit || ""} (${formatDate(r.date)})`}
                                                                    />
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* All results for this test */}
                                                    <div className="space-y-1 mt-2">
                                                        {results.map((r) => {
                                                            const rsConfig = LAB_STATUS_CONFIG[r.status];
                                                            return (
                                                                <div key={r.id} className="flex items-center justify-between py-1 group/item">
                                                                    <div className="flex items-center gap-2 text-xs">
                                                                        <span className="text-zinc-500 w-16 sm:w-20 shrink-0">{formatDate(r.date)}</span>
                                                                        <span className={cn("font-medium", rsConfig.color)}>{r.value} {r.unit || ""}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity">
                                                                        <button onClick={() => openLabForm(r)} className="p-1 rounded hover:bg-zinc-800"><Edit3 className="w-3 h-3 text-zinc-500" /></button>
                                                                        <button onClick={() => deleteSubRecord("lab_results", r.id)} className="p-1 rounded hover:bg-danger/50"><Trash2 className="w-3 h-3 text-danger" /></button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()
                        )}

                        {renderModal(
                            `${editingLab ? "Edit" : "Add"} Lab Result`,
                            "lab",
                            saveLabResult,
                            <>
                                <div>
                                    <label className={labelCls}>Test Name *</label>
                                    <input type="text" value={labForm.test_name || ""} onChange={(e) => setLabForm(f => ({ ...f, test_name: e.target.value }))} placeholder="e.g., Blood Sugar (Fasting)" className={inputCls} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelCls}>Value *</label>
                                        <input type="text" value={labForm.value || ""} onChange={(e) => setLabForm(f => ({ ...f, value: e.target.value }))} placeholder="e.g., 95" className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Unit</label>
                                        <input type="text" value={labForm.unit || ""} onChange={(e) => setLabForm(f => ({ ...f, unit: e.target.value }))} placeholder="e.g., mg/dL" className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Status</label>
                                        <select value={labForm.status || "normal"} onChange={(e) => setLabForm(f => ({ ...f, status: e.target.value as LabStatus }))} className={inputCls}>
                                            {Object.entries(LAB_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Date</label>
                                        <input type="date" value={labForm.date || ""} onChange={(e) => setLabForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Reference Range</label>
                                        <input type="text" value={labForm.reference_range || ""} onChange={(e) => setLabForm(f => ({ ...f, reference_range: e.target.value }))} placeholder="e.g., 70-100" className={inputCls} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Notes</label>
                                    <textarea value={labForm.notes || ""} onChange={(e) => setLabForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={cn(inputCls, "resize-none")} />
                                </div>
                            </>
                        )}
                    </motion.div>
                )}

                {/* ─── Tab: Body Stats ────────────────────────────────────── */}
                {activeTab === "body_stats" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-zinc-400">{p.measurements.length} measurement{p.measurements.length !== 1 ? "s" : ""}</p>
                            <button onClick={() => openMeasurementForm()} className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95">
                                <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                        </div>

                        {/* Latest reading card */}
                        {latestMeasurement && (
                            <div className="bg-gradient-to-r from-blue-500/5 to-transparent border border-blue-500/10 rounded-2xl p-5">
                                <p className={cn(labelCls, "mb-3")}>Latest Reading</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {latestMeasurement.height_cm && (
                                        <div>
                                            <p className="text-2xl font-bold text-zinc-50">{latestMeasurement.height_cm}</p>
                                            <p className="text-xs text-zinc-500">cm height</p>
                                        </div>
                                    )}
                                    {latestMeasurement.weight_kg && (
                                        <div>
                                            <p className="text-2xl font-bold text-zinc-50">{latestMeasurement.weight_kg}</p>
                                            <p className="text-xs text-zinc-500">kg weight</p>
                                        </div>
                                    )}
                                    {latestBMI && (
                                        <div>
                                            <p className={cn("text-2xl font-bold", bmiCategory(latestBMI).color)}>{latestBMI.toFixed(1)}</p>
                                            <p className={cn("text-xs", bmiCategory(latestBMI).color)}>{bmiCategory(latestBMI).label}</p>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[11px] text-zinc-500 mt-2">{formatDate(latestMeasurement.date)}</p>
                            </div>
                        )}

                        {/* Weight trend chart */}
                        {sortedMeasurements.length > 1 && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                                <p className={cn(labelCls, "mb-3")}>Weight Trend</p>
                                <div className="flex items-end gap-1 h-20">
                                    {[...sortedMeasurements].reverse().filter(m => m.weight_kg).map((m) => {
                                        const weights = sortedMeasurements.filter(x => x.weight_kg).map(x => x.weight_kg!);
                                        const min = Math.min(...weights);
                                        const max = Math.max(...weights);
                                        const range = max - min || 1;
                                        const height = ((m.weight_kg! - min) / range) * 80 + 20;
                                        return (
                                            <div
                                                key={m.id}
                                                className="flex-1 bg-blue-500/20 rounded-t-sm hover:bg-blue-500/40 transition-colors"
                                                style={{ height: `${height}%` }}
                                                title={`${m.weight_kg} kg (${formatDate(m.date)})`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {p.measurements.length === 0 ? (
                            <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
                                <Ruler className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                                <p className="text-zinc-500 font-medium">No measurements recorded</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sortedMeasurements.map((m) => {
                                    const bmi = calculateBMI(m.height_cm, m.weight_kg);
                                    return (
                                        <motion.div key={m.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-colors group">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                    <span className="text-[11px] text-zinc-500 w-20 sm:w-24">{formatDate(m.date)}</span>
                                                    {m.height_cm && <span className="text-sm text-zinc-300">{m.height_cm} cm</span>}
                                                    {m.weight_kg && <span className="text-sm text-zinc-300">{m.weight_kg} kg</span>}
                                                    {bmi && <span className={cn("text-xs font-medium", bmiCategory(bmi).color)}>BMI {bmi.toFixed(1)}</span>}
                                                </div>
                                                <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openMeasurementForm(m)} className="p-1.5 rounded-lg hover:bg-zinc-800"><Edit3 className="w-3.5 h-3.5 text-zinc-500" /></button>
                                                    <button onClick={() => deleteSubRecord("measurements", m.id)} className="p-1.5 rounded-lg hover:bg-danger/50"><Trash2 className="w-3.5 h-3.5 text-danger" /></button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}

                        {renderModal(
                            `${editingMeasurement ? "Edit" : "Add"} Measurement`,
                            "measurement",
                            saveMeasurement,
                            <>
                                <div>
                                    <label className={labelCls}>Date</label>
                                    <input type="date" value={measurementForm.date || ""} onChange={(e) => setMeasurementForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Height (cm)</label>
                                        <input type="number" min="0" step="0.1" value={measurementForm.height_cm ?? ""} onChange={(e) => setMeasurementForm(f => ({ ...f, height_cm: e.target.value ? Number(e.target.value) : undefined }))} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Weight (kg)</label>
                                        <input type="number" min="0" step="0.1" value={measurementForm.weight_kg ?? ""} onChange={(e) => setMeasurementForm(f => ({ ...f, weight_kg: e.target.value ? Number(e.target.value) : undefined }))} className={inputCls} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Notes</label>
                                    <textarea value={measurementForm.notes || ""} onChange={(e) => setMeasurementForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={cn(inputCls, "resize-none")} />
                                </div>
                            </>
                        )}
                    </motion.div>
                )}

                {/* ─── Tab: Documents ─────────────────────────────────────── */}
                {activeTab === "documents" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-zinc-400">{p.documents.length} document{p.documents.length !== 1 ? "s" : ""}</p>
                            <button onClick={() => openDocForm()} className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95">
                                <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                        </div>

                        {p.documents.length === 0 ? (
                            <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
                                <FileText className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                                <p className="text-zinc-500 font-medium">No documents stored</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {[...p.documents]
                                    .sort((a, b) => {
                                        if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
                                        return 0;
                                    })
                                    .map((doc) => {
                                        const dtConfig = DOC_TYPE_CONFIG[doc.type];
                                        return (
                                            <motion.div key={doc.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-colors group">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3 min-w-0">
                                                        <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                                                            <FileText className={cn("w-4 h-4", dtConfig.color)} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-zinc-200 truncate">{doc.title}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800", dtConfig.color)}>
                                                                    {dtConfig.label}
                                                                </span>
                                                                {doc.date && <span className="text-[11px] text-zinc-500">{formatDate(doc.date)}</span>}
                                                            </div>
                                                            {doc.notes && <p className="text-xs text-zinc-500 mt-1">{doc.notes}</p>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                                                        <button onClick={() => openDocForm(doc)} className="p-1.5 rounded-lg hover:bg-zinc-800"><Edit3 className="w-3.5 h-3.5 text-zinc-500" /></button>
                                                        <button onClick={() => deleteSubRecord("documents", doc.id)} className="p-1.5 rounded-lg hover:bg-danger/50"><Trash2 className="w-3.5 h-3.5 text-danger" /></button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                            </div>
                        )}

                        {renderModal(
                            `${editingDoc ? "Edit" : "Add"} Document`,
                            "document",
                            saveDocument,
                            <>
                                <div>
                                    <label className={labelCls}>Title *</label>
                                    <input type="text" value={docForm.title || ""} onChange={(e) => setDocForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Blood Test Report" className={inputCls} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Type</label>
                                        <select value={docForm.type || "other"} onChange={(e) => setDocForm(f => ({ ...f, type: e.target.value as DocType }))} className={inputCls}>
                                            {Object.entries(DOC_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Date</label>
                                        <input type="date" value={docForm.date || ""} onChange={(e) => setDocForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Notes</label>
                                    <textarea value={docForm.notes || ""} onChange={(e) => setDocForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={cn(inputCls, "resize-none")} />
                                </div>
                            </>
                        )}
                    </motion.div>
                )}

                {/* Condition form modal */}
                {renderModal(
                    `${editingCondition ? "Edit" : "Add"} Condition`,
                    "condition",
                    saveCondition,
                    <>
                        <div>
                            <label className={labelCls}>Condition Name *</label>
                            <input type="text" value={conditionForm.name || ""} onChange={(e) => setConditionForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Hypertension" className={inputCls} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Diagnosed Date</label>
                                <input type="date" value={conditionForm.diagnosed_date || ""} onChange={(e) => setConditionForm(f => ({ ...f, diagnosed_date: e.target.value }))} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Status</label>
                                <select value={conditionForm.status || "active"} onChange={(e) => setConditionForm(f => ({ ...f, status: e.target.value as ConditionStatus }))} className={inputCls}>
                                    {Object.entries(CONDITION_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Notes</label>
                            <textarea value={conditionForm.notes || ""} onChange={(e) => setConditionForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={cn(inputCls, "resize-none")} />
                        </div>
                    </>
                )}

                {profileFormModal}

                {/* Confirm Delete */}
                <ConfirmDialog
                    isOpen={confirmDelete.open}
                    title="Delete Profile"
                    description={`Are you sure you want to delete "${confirmDelete.name}"? This will remove all health data for this profile.`}
                    onConfirm={() => { deleteProfile(confirmDelete.id); setConfirmDelete({ open: false, id: "", name: "" }); }}
                    onClose={() => setConfirmDelete({ open: false, id: "", name: "" })}
                />
                <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
            </div>
        );
    }

    // ─── Render: List View ───────────────────────────────────────────────────

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-50 mb-1">Health</h1>
                    <p className="text-sm text-zinc-500">{profiles.length} profile{profiles.length !== 1 ? "s" : ""}</p>
                </div>
                <button
                    onClick={openAddProfile}
                    className="flex items-center gap-2 px-5 py-2.5 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Add Profile
                </button>
            </div>

            {/* Alerts banner */}
            {profileAlerts.length > 0 && (
                <div className="bg-warning/5 border border-warning/20 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                        <p className="text-xs font-bold text-warning uppercase tracking-widest">{profileAlerts.length} Alert{profileAlerts.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="space-y-2">
                        {profileAlerts.slice(0, 5).map((a, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-zinc-300">{a.profileName} — {a.label}</span>
                                <span className={cn("font-medium", a.status === "overdue" ? "text-danger" : "text-warning")}>
                                    {a.status === "overdue" ? `Overdue ${Math.abs(daysUntil(a.date)!)}d` : `${daysUntil(a.date)}d left`}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Profile Cards */}
            {profiles.length === 0 ? (
                <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-16 text-center">
                    <HeartPulse className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-400 font-medium text-lg">No health profiles yet</p>
                    <p className="text-sm text-zinc-600 mt-2">Add your first profile to start tracking health records</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {profiles.map((profile) => {
                        const pl = profile.payload;
                        const typeConfig = PROFILE_TYPE_CONFIG[pl.type];
                        const TypeIcon = typeConfig.icon;
                        const activeCondCount = pl.conditions.filter(c => c.status !== "resolved").length;
                        const activeMedCount = pl.medications.filter(m => m.status === "active").length;

                        // Count alerts for this profile
                        let alerts = 0;
                        for (const med of pl.medications || []) {
                            if (med.status === "active" && med.refill_date) {
                                const s = getDueStatus(med.refill_date);
                                if (s === "overdue" || s === "warning") alerts++;
                            }
                        }
                        for (const vac of pl.vaccinations || []) {
                            if (vac.next_due) {
                                const s = getDueStatus(vac.next_due);
                                if (s === "overdue" || s === "warning") alerts++;
                            }
                        }

                        return (
                            <motion.div
                                key={profile._id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => { setSelectedProfile(profile); setActiveTab("overview"); }}
                                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 hover:shadow-lg hover:shadow-accent/5 transition-all cursor-pointer group"
                            >
                                <div className="flex items-start gap-3">
                                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0", typeConfig.bg, typeConfig.color)}>
                                        {getInitials(pl.name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-bold text-zinc-100 truncate">{pl.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", typeConfig.bg, typeConfig.border, typeConfig.color)}>
                                                <TypeIcon className="w-3 h-3 inline mr-0.5" />{typeConfig.label}
                                            </span>
                                            {pl.relation && <span className="text-[11px] text-zinc-500">{pl.relation}</span>}
                                        </div>
                                    </div>
                                    {pl.blood_group !== "unknown" && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger/10 border border-danger/20 text-danger shrink-0">
                                            {pl.blood_group}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500">
                                    {activeCondCount > 0 && (
                                        <span className="flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3 text-warning" /> {activeCondCount} condition{activeCondCount !== 1 ? "s" : ""}
                                        </span>
                                    )}
                                    {activeMedCount > 0 && (
                                        <span className="flex items-center gap-1">
                                            <Pill className="w-3 h-3 text-blue-400" /> {activeMedCount} med{activeMedCount !== 1 ? "s" : ""}
                                        </span>
                                    )}
                                    {pl.vaccinations.length > 0 && (
                                        <span className="flex items-center gap-1">
                                            <Syringe className="w-3 h-3 text-teal-400" /> {pl.vaccinations.length}
                                        </span>
                                    )}
                                </div>

                                {alerts > 0 && (
                                    <div className="mt-3 p-2 rounded-xl border border-warning/20 bg-warning/5 flex items-center gap-2">
                                        <AlertTriangle className="w-3 h-3 text-warning shrink-0" />
                                        <span className="text-[11px] text-warning font-medium">{alerts} alert{alerts !== 1 ? "s" : ""} need attention</span>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {profileFormModal}

            {/* Confirm Delete */}
            <ConfirmDialog
                isOpen={confirmDelete.open}
                title="Delete Profile"
                description={`Are you sure you want to delete "${confirmDelete.name}"?`}
                onConfirm={() => { deleteProfile(confirmDelete.id); setConfirmDelete({ open: false, id: "", name: "" }); }}
                onClose={() => setConfirmDelete({ open: false, id: "", name: "" })}
            />
            <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
        </div>
    );
}
