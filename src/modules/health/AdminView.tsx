"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  HeartPulse,
  Plus,
  X,
  Edit3,
  Trash2,
  ChevronLeft,
  Pill,
  Syringe,
  Stethoscope,
  FileText,
  Activity,
  Ruler,
  Droplets,
  ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Toast, { type ToastType } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ImageCropper from "@/components/ui/ImageCropper";
import ImagePreview from "@/components/ui/ImagePreview";
import DocPreview from "@/components/ui/DocPreview";

// Sub-components
import HealthMetrics from "./components/HealthMetrics";
import AlertsBanner from "./components/AlertsBanner";
import ProfileCard from "./components/ProfileCard";
import ProfileFormModal from "./components/ProfileFormModal";
import HealthProfileToolbar from "./components/HealthProfileToolbar";
import OverviewTab from "./components/OverviewTab";
import MedicationsTab from "./components/MedicationsTab";
import VaccinationsTab from "./components/VaccinationsTab";
import VisitsTab from "./components/VisitsTab";
import LabResultsTab from "./components/LabResultsTab";
import BodyStatsTab from "./components/BodyStatsTab";
import DocumentsTab from "./components/DocumentsTab";

// Types, constants, helpers
import type {
  HealthProfile,
  HealthPayload,
  DetailTab,
  Condition,
  ConditionStatus,
  Medication,
  MedicationStatus,
  Vaccination,
  Visit,
  VisitType,
  LabResult,
  LabStatus,
  Measurement,
  HealthDocument,
  DocType,
  BillAttachment,
} from "./components/types";
import {
  PROFILE_TYPE_CONFIG,
  CONDITION_STATUS_CONFIG,
  MEDICATION_STATUS_CONFIG,
  VISIT_TYPE_CONFIG,
  LAB_STATUS_CONFIG,
  DOC_TYPE_CONFIG,
} from "./components/constants";
import {
  formatDateInput,
  toISODate,
  getInitials,
  uuid,
  emptyPayload,
} from "./components/helpers";
import {
  filterHealthProfiles,
  getHealthAlerts,
  getHealthFilterOptions,
  type HealthListFilter,
} from "./components/selectors";

// ─── Shared form styling ─────────────────────────────────────────────────────

const inputCls =
  "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600";
const labelCls =
  "text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5";

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
  const [editingProfile, setEditingProfile] = useState<HealthProfile | null>(
    null,
  );
  const [formData, setFormData] = useState<HealthPayload>(emptyPayload());
  const [allergyInput, setAllergyInput] = useState("");
  const [cropFileState, setCropFileState] = useState<{
    url: string;
    type: string;
  } | null>(null);
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    name: string;
  } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{
    src: string;
    contentType: string;
    filename: string;
    size?: number;
  } | null>(null);

  // Detail view
  const [selectedProfile, setSelectedProfile] = useState<HealthProfile | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [listFilter, setListFilter] = useState<HealthListFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Sub-form states
  const [showSubForm, setShowSubForm] = useState<string | null>(null);
  const [conditionForm, setConditionForm] = useState<Partial<Condition>>({});
  const [editingCondition, setEditingCondition] = useState<Condition | null>(
    null,
  );
  const [medicationForm, setMedicationForm] = useState<Partial<Medication>>({});
  const [editingMedication, setEditingMedication] = useState<Medication | null>(
    null,
  );
  const [vaccinationForm, setVaccinationForm] = useState<Partial<Vaccination>>(
    {},
  );
  const [editingVaccination, setEditingVaccination] =
    useState<Vaccination | null>(null);
  const [visitForm, setVisitForm] = useState<Partial<Visit>>({});
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [labForm, setLabForm] = useState<Partial<LabResult>>({});
  const [editingLab, setEditingLab] = useState<LabResult | null>(null);
  const [measurementForm, setMeasurementForm] = useState<Partial<Measurement>>(
    {},
  );
  const [editingMeasurement, setEditingMeasurement] =
    useState<Measurement | null>(null);
  const [docForm, setDocForm] = useState<Partial<HealthDocument>>({});
  const [editingDoc, setEditingDoc] = useState<HealthDocument | null>(null);

  // UI
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
    visible: boolean;
  }>({ message: "", type: "success", visible: false });
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: "", name: "" });

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      setToast({ message, type, visible: true });
    },
    [],
  );

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

  const handleProfilePicUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Only images are allowed for profile pictures", "error");
      return;
    }
    try {
      const url = URL.createObjectURL(file);
      setCropFileState({ url, type: file.type });
    } catch (err) {
      console.error("Blob generation failed", err);
      showToast("Failed to process image", "error");
    }
  };

  const handleCropComplete = (base64Data: string, mimeType: string) => {
    setFormData((f) => ({
      ...f,
      profile_pic: { data: base64Data, content_type: mimeType },
    }));
    if (cropFileState?.url) URL.revokeObjectURL(cropFileState.url);
    setCropFileState(null);
  };

  const closeCropper = () => {
    if (cropFileState?.url) URL.revokeObjectURL(cropFileState.url);
    setCropFileState(null);
  };

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
          body: JSON.stringify({
            module_type: "health_profile",
            is_public: false,
            payload: formData,
          }),
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

  const updatePayload = async (
    profile: HealthProfile,
    newPayload: HealthPayload,
  ) => {
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
    editingRecord: T | null,
  ) => {
    if (!selectedProfile) return;
    const arr = [...((selectedProfile.payload[field] as unknown as T[]) || [])];
    const idx = arr.findIndex((r) => r.id === record.id);
    if (idx >= 0) arr[idx] = record;
    else arr.push(record);
    await updatePayload(selectedProfile, {
      ...selectedProfile.payload,
      [field]: arr,
    });
    showToast(editingRecord ? "Updated" : "Added");
    setShowSubForm(null);
  };

  const deleteSubRecord = async (field: keyof HealthPayload, id: string) => {
    if (!selectedProfile) return;
    const arr = (
      (selectedProfile.payload[field] as Array<{ id: string }>) || []
    ).filter((r) => r.id !== id);
    await updatePayload(selectedProfile, {
      ...selectedProfile.payload,
      [field]: arr,
    });
    showToast("Deleted");
  };

  // ─── Conditions ──────────────────────────────────────────────────────────

  const openConditionForm = (c?: Condition) => {
    if (c) {
      setEditingCondition(c);
      setConditionForm({
        ...c,
        diagnosed_date: formatDateInput(c.diagnosed_date),
      });
    } else {
      setEditingCondition(null);
      setConditionForm({ status: "active" });
    }
    setShowSubForm("condition");
  };

  const saveCondition = async () => {
    if (!conditionForm.name?.trim()) {
      showToast("Name is required", "error");
      return;
    }
    const record: Condition = {
      id: editingCondition?.id || uuid(),
      name: conditionForm.name || "",
      diagnosed_date: conditionForm.diagnosed_date
        ? toISODate(conditionForm.diagnosed_date)
        : undefined,
      status: (conditionForm.status as ConditionStatus) || "active",
      notes: conditionForm.notes || undefined,
    };
    await saveSubRecord("conditions", record, editingCondition);
  };

  // ─── Medications ─────────────────────────────────────────────────────────

  const openMedicationForm = (m?: Medication) => {
    if (m) {
      setEditingMedication(m);
      setMedicationForm({
        ...m,
        start_date: formatDateInput(m.start_date),
        end_date: formatDateInput(m.end_date),
        refill_date: formatDateInput(m.refill_date),
      });
    } else {
      setEditingMedication(null);
      setMedicationForm({ status: "active" });
    }
    setShowSubForm("medication");
  };

  const saveMedication = async () => {
    if (!medicationForm.name?.trim()) {
      showToast("Medication name is required", "error");
      return;
    }
    const record: Medication = {
      id: editingMedication?.id || uuid(),
      name: medicationForm.name || "",
      dosage: medicationForm.dosage || undefined,
      prescribed_by: medicationForm.prescribed_by || undefined,
      start_date: medicationForm.start_date
        ? toISODate(medicationForm.start_date)
        : undefined,
      end_date: medicationForm.end_date
        ? toISODate(medicationForm.end_date)
        : undefined,
      refill_date: medicationForm.refill_date
        ? toISODate(medicationForm.refill_date)
        : undefined,
      status: (medicationForm.status as MedicationStatus) || "active",
      notes: medicationForm.notes || undefined,
    };
    await saveSubRecord("medications", record, editingMedication);
  };

  // ─── Vaccinations ────────────────────────────────────────────────────────

  const openVaccinationForm = (v?: Vaccination) => {
    if (v) {
      setEditingVaccination(v);
      setVaccinationForm({
        ...v,
        date_administered: formatDateInput(v.date_administered),
        next_due: formatDateInput(v.next_due),
      });
    } else {
      setEditingVaccination(null);
      setVaccinationForm({
        date_administered: new Date().toISOString().slice(0, 10),
      });
    }
    setShowSubForm("vaccination");
  };

  const saveVaccination = async () => {
    if (!vaccinationForm.name?.trim()) {
      showToast("Vaccine name is required", "error");
      return;
    }
    const record: Vaccination = {
      id: editingVaccination?.id || uuid(),
      name: vaccinationForm.name || "",
      date_administered: toISODate(
        vaccinationForm.date_administered ||
          new Date().toISOString().slice(0, 10),
      ),
      next_due: vaccinationForm.next_due
        ? toISODate(vaccinationForm.next_due)
        : undefined,
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
      setVisitForm({
        type: "checkup",
        currency: "INR",
        date: new Date().toISOString().slice(0, 10),
      });
    }
    setShowSubForm("visit");
  };

  const saveVisit = async () => {
    if (!visitForm.date) {
      showToast("Date is required", "error");
      return;
    }
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
      setLabForm({
        status: "normal",
        date: new Date().toISOString().slice(0, 10),
      });
    }
    setShowSubForm("lab");
  };

  const saveLabResult = async () => {
    if (!labForm.test_name?.trim() || !labForm.value?.trim()) {
      showToast("Test name and value are required", "error");
      return;
    }
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
      showToast("At least height or weight is required", "error");
      return;
    }
    const record: Measurement = {
      id: editingMeasurement?.id || uuid(),
      date: toISODate(
        measurementForm.date || new Date().toISOString().slice(0, 10),
      ),
      height_cm: measurementForm.height_cm
        ? Number(measurementForm.height_cm)
        : undefined,
      weight_kg: measurementForm.weight_kg
        ? Number(measurementForm.weight_kg)
        : undefined,
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
      setDocForm({ type: "other", attachments: [] });
    }
    setShowSubForm("document");
  };

  const saveDocument = async () => {
    if (!docForm.title?.trim()) {
      showToast("Title is required", "error");
      return;
    }
    const record: HealthDocument = {
      id: editingDoc?.id || uuid(),
      type: (docForm.type as DocType) || "other",
      title: docForm.title || "",
      date: docForm.date ? toISODate(docForm.date) : undefined,
      notes: docForm.notes || undefined,
      attachments: docForm.attachments || [],
    };
    await saveSubRecord("documents", record, editingDoc);
  };

  const handleDocFilesChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    const newAttachments: BillAttachment[] = [...(docForm.attachments || [])];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) continue;
      try {
        const raw = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const data = raw.split(",")[1];
        newAttachments.push({
          id: uuid(),
          filename: file.name,
          content_type: file.type,
          data,
          size: file.size,
          uploaded_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error("Failed to read file", err);
      }
    }
    setDocForm((f) => ({ ...f, attachments: newAttachments }));
    e.target.value = "";
  };

  const removeDocAttachment = (id: string) => {
    setDocForm((f) => ({
      ...f,
      attachments: (f.attachments || []).filter((a) => a.id !== id),
    }));
  };

  // ─── Vaccination helpers ────────────────────────────────────────────────

  const duplicateVaccination = async (vac: Vaccination) => {
    if (!selectedProfile) return;
    const newVac: Vaccination = {
      ...vac,
      id: uuid(),
      date_administered:
        new Date().toISOString().slice(0, 10) + "T00:00:00.000Z",
      next_due: undefined,
    };
    const arr = [...(selectedProfile.payload.vaccinations || []), newVac];
    await updatePayload(selectedProfile, {
      ...selectedProfile.payload,
      vaccinations: arr,
    });
    showToast("Vaccination duplicated");
  };

  const removeVaccinationDueDate = async (vac: Vaccination) => {
    if (!selectedProfile) return;
    const arr = selectedProfile.payload.vaccinations.map((v) =>
      v.id === vac.id ? { ...v, next_due: undefined } : v,
    );
    await updatePayload(selectedProfile, {
      ...selectedProfile.payload,
      vaccinations: arr,
    });
    showToast("Due date removed");
  };

  // ─── Computed ────────────────────────────────────────────────────────────

  const allVaccineNames = useMemo(() => {
    const names = new Set<string>();
    for (const prof of profiles) {
      for (const vac of prof.payload.vaccinations || []) {
        if (vac.name.trim()) names.add(vac.name.trim());
      }
    }
    return Array.from(names).sort();
  }, [profiles]);

  const profileAlerts = useMemo(() => {
    return getHealthAlerts(profiles);
  }, [profiles]);

  const filterOptions = useMemo(
    () => getHealthFilterOptions(profiles),
    [profiles],
  );

  const visibleProfiles = useMemo(
    () => filterHealthProfiles(profiles, listFilter, deferredSearchQuery),
    [deferredSearchQuery, listFilter, profiles],
  );

  // ─── Form helpers ────────────────────────────────────────────────────────

  const openAddProfile = () => {
    setEditingProfile(null);
    setFormData(emptyPayload());
    setAllergyInput("");
    setSearchQuery("");
    setShowProfileForm(true);
  };

  const openEditProfile = (p: HealthProfile) => {
    setEditingProfile(p);
    setFormData({ ...p.payload });
    setAllergyInput("");
    setShowProfileForm(true);
  };

  // ─── Sub-form Modal renderer ─────────────────────────────────────────────

  function renderModal(
    title: string,
    formKey: string,
    onSave: () => Promise<void>,
    children: React.ReactNode,
  ) {
    return (
      <Portal>
        <AnimatePresence>
          {showSubForm === formKey && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSubForm(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg max-h-[85vh] sm:max-h-[80vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl mx-2 sm:mx-0"
              >
                <div className="p-4 sm:p-6 border-b border-zinc-800 flex items-center justify-between shrink-0">
                  <h3 className="text-base sm:text-lg font-bold text-zinc-50">
                    {title}
                  </h3>
                  <button
                    onClick={() => setShowSubForm(null)}
                    className="p-1 rounded-lg hover:bg-zinc-800"
                  >
                    <X className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>
                <div className="p-4 sm:p-6 space-y-4 flex-1 min-h-0 overflow-y-auto">
                  {children}
                </div>
                <div className="p-4 sm:p-6 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0">
                  <button
                    onClick={() => setShowSubForm(null)}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onSave}
                    className="px-5 py-2.5 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95"
                  >
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
            <div
              key={i}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 animate-pulse"
            >
              <div className="h-6 w-1/2 bg-zinc-800 rounded" />
              <div className="h-4 w-3/4 bg-zinc-800/60 rounded" />
              <div className="h-4 w-1/3 bg-zinc-800/40 rounded" />
            </div>
          ))}
        </div>

        {cropFileState && (
          <ImageCropper
            imageSrc={cropFileState.url}
            mimeType={cropFileState.type}
            onClose={closeCropper}
            onCropComplete={handleCropComplete}
          />
        )}
      </div>
    );
  }

  // ─── Render: Detail View ─────────────────────────────────────────────────

  if (selectedProfile) {
    const p = selectedProfile.payload;
    const typeConfig = PROFILE_TYPE_CONFIG[p.type];
    const TypeIcon = typeConfig.icon;

    const TAB_CONFIG: Array<{
      key: DetailTab;
      label: string;
      icon: typeof HeartPulse;
    }> = [
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
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => {
              setSelectedProfile(null);
              setActiveTab("overview");
            }}
            className="p-1.5 sm:p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" />
          </button>
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div
              onClick={() => {
                if (p.profile_pic) {
                  setPreviewImage({
                    src: `data:${p.profile_pic.content_type};base64,${p.profile_pic.data}`,
                    name: p.name,
                  });
                }
              }}
              className={cn(
                "w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 overflow-hidden cursor-pointer hover:scale-105 transition-transform",
                typeConfig.bg,
                typeConfig.color,
              )}
            >
              {p.profile_pic ? (
                <div className="relative w-full h-full">
                  <Image
                    src={`data:${p.profile_pic.content_type};base64,${p.profile_pic.data}`}
                    alt={p.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              ) : (
                getInitials(p.name)
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-zinc-50 tracking-tight truncate">
                {p.name}
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                    typeConfig.bg,
                    typeConfig.border,
                    typeConfig.color,
                  )}
                >
                  <TypeIcon className="w-3 h-3 inline mr-1" />
                  {typeConfig.label}
                </span>
                {p.relation && (
                  <span className="text-xs text-zinc-500">{p.relation}</span>
                )}
                {p.blood_group !== "unknown" && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-danger/10 border border-danger/20 text-danger">
                    <Droplets className="w-3 h-3 inline mr-1" />
                    {p.blood_group}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => openEditProfile(selectedProfile)}
              className="p-1.5 sm:p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />
            </button>
            <button
              onClick={() =>
                setConfirmDelete({
                  open: true,
                  id: selectedProfile._id,
                  name: p.name,
                })
              }
              className="p-1.5 sm:p-2 rounded-xl bg-zinc-900 border border-danger/30 hover:bg-danger/50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-danger" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 overflow-x-auto scrollbar-none">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                activeTab === tab.key
                  ? "bg-zinc-800 text-zinc-50 shadow-lg"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50",
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        {activeTab === "overview" && (
          <OverviewTab
            profile={selectedProfile}
            onAddCondition={() => openConditionForm()}
            onEditCondition={openConditionForm}
            onDeleteCondition={(id) => deleteSubRecord("conditions", id)}
          />
        )}

        {activeTab === "medications" && (
          <MedicationsTab
            payload={p}
            onAdd={() => openMedicationForm()}
            onEdit={openMedicationForm}
            onDelete={(id) => deleteSubRecord("medications", id)}
            renderModal={renderModal(
              `${editingMedication ? "Edit" : "Add"} Medication`,
              "medication",
              saveMedication,
              <>
                <div>
                  <label className={labelCls}>Name *</label>
                  <input
                    type="text"
                    value={medicationForm.name || ""}
                    onChange={(e) =>
                      setMedicationForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g., Metformin"
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Dosage</label>
                    <input
                      type="text"
                      value={medicationForm.dosage || ""}
                      onChange={(e) =>
                        setMedicationForm((f) => ({
                          ...f,
                          dosage: e.target.value,
                        }))
                      }
                      placeholder="e.g., 500mg twice daily"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Status</label>
                    <select
                      value={medicationForm.status || "active"}
                      onChange={(e) =>
                        setMedicationForm((f) => ({
                          ...f,
                          status: e.target.value as MedicationStatus,
                        }))
                      }
                      className={inputCls}
                    >
                      {Object.entries(MEDICATION_STATUS_CONFIG).map(
                        ([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Prescribed By</label>
                  <input
                    type="text"
                    value={medicationForm.prescribed_by || ""}
                    onChange={(e) =>
                      setMedicationForm((f) => ({
                        ...f,
                        prescribed_by: e.target.value,
                      }))
                    }
                    placeholder="Doctor name"
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Start Date</label>
                    <input
                      type="date"
                      value={medicationForm.start_date || ""}
                      onChange={(e) =>
                        setMedicationForm((f) => ({
                          ...f,
                          start_date: e.target.value,
                        }))
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>End Date</label>
                    <input
                      type="date"
                      value={medicationForm.end_date || ""}
                      onChange={(e) =>
                        setMedicationForm((f) => ({
                          ...f,
                          end_date: e.target.value,
                        }))
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Refill Date</label>
                    <input
                      type="date"
                      value={medicationForm.refill_date || ""}
                      onChange={(e) =>
                        setMedicationForm((f) => ({
                          ...f,
                          refill_date: e.target.value,
                        }))
                      }
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Notes</label>
                  <textarea
                    value={medicationForm.notes || ""}
                    onChange={(e) =>
                      setMedicationForm((f) => ({
                        ...f,
                        notes: e.target.value,
                      }))
                    }
                    rows={2}
                    className={cn(inputCls, "resize-none")}
                  />
                </div>
              </>,
            )}
          />
        )}

        {activeTab === "vaccinations" && (
          <VaccinationsTab
            payload={p}
            onAdd={() => openVaccinationForm()}
            onEdit={openVaccinationForm}
            onDelete={(id) => deleteSubRecord("vaccinations", id)}
            onDuplicate={duplicateVaccination}
            onRemoveDueDate={removeVaccinationDueDate}
            renderModal={renderModal(
              `${editingVaccination ? "Edit" : "Add"} Vaccination`,
              "vaccination",
              saveVaccination,
              <>
                <div>
                  <label className={labelCls}>Vaccine Name *</label>
                  <input
                    type="text"
                    list="vaccine-name-suggestions"
                    value={vaccinationForm.name || ""}
                    onChange={(e) =>
                      setVaccinationForm((f) => ({
                        ...f,
                        name: e.target.value,
                      }))
                    }
                    placeholder="e.g., COVID-19 Booster"
                    className={inputCls}
                  />
                  <datalist id="vaccine-name-suggestions">
                    {allVaccineNames.map((n) => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Date Administered *</label>
                    <input
                      type="date"
                      value={vaccinationForm.date_administered || ""}
                      onChange={(e) =>
                        setVaccinationForm((f) => ({
                          ...f,
                          date_administered: e.target.value,
                        }))
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Next Due</label>
                    <input
                      type="date"
                      value={vaccinationForm.next_due || ""}
                      onChange={(e) =>
                        setVaccinationForm((f) => ({
                          ...f,
                          next_due: e.target.value,
                        }))
                      }
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Provider</label>
                    <input
                      type="text"
                      value={vaccinationForm.provider || ""}
                      onChange={(e) =>
                        setVaccinationForm((f) => ({
                          ...f,
                          provider: e.target.value,
                        }))
                      }
                      placeholder="Hospital / clinic"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Batch Number</label>
                    <input
                      type="text"
                      value={vaccinationForm.batch_number || ""}
                      onChange={(e) =>
                        setVaccinationForm((f) => ({
                          ...f,
                          batch_number: e.target.value,
                        }))
                      }
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Notes</label>
                  <textarea
                    value={vaccinationForm.notes || ""}
                    onChange={(e) =>
                      setVaccinationForm((f) => ({
                        ...f,
                        notes: e.target.value,
                      }))
                    }
                    rows={2}
                    className={cn(inputCls, "resize-none")}
                  />
                </div>
              </>,
            )}
          />
        )}

        {activeTab === "visits" && (
          <VisitsTab
            payload={p}
            onAdd={() => openVisitForm()}
            onEdit={openVisitForm}
            onDelete={(id) => deleteSubRecord("visits", id)}
            renderModal={renderModal(
              `${editingVisit ? "Edit" : "Add"} Visit`,
              "visit",
              saveVisit,
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Date *</label>
                    <input
                      type="date"
                      value={visitForm.date || ""}
                      onChange={(e) =>
                        setVisitForm((f) => ({ ...f, date: e.target.value }))
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Type</label>
                    <select
                      value={visitForm.type || "checkup"}
                      onChange={(e) =>
                        setVisitForm((f) => ({
                          ...f,
                          type: e.target.value as VisitType,
                        }))
                      }
                      className={inputCls}
                    >
                      {Object.entries(VISIT_TYPE_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Doctor</label>
                    <input
                      type="text"
                      value={visitForm.doctor || ""}
                      onChange={(e) =>
                        setVisitForm((f) => ({ ...f, doctor: e.target.value }))
                      }
                      placeholder="Doctor name"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Facility</label>
                    <input
                      type="text"
                      value={visitForm.facility || ""}
                      onChange={(e) =>
                        setVisitForm((f) => ({
                          ...f,
                          facility: e.target.value,
                        }))
                      }
                      placeholder="Hospital / clinic"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Diagnosis</label>
                  <input
                    type="text"
                    value={visitForm.diagnosis || ""}
                    onChange={(e) =>
                      setVisitForm((f) => ({ ...f, diagnosis: e.target.value }))
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Prescription</label>
                  <textarea
                    value={visitForm.prescription || ""}
                    onChange={(e) =>
                      setVisitForm((f) => ({
                        ...f,
                        prescription: e.target.value,
                      }))
                    }
                    rows={2}
                    className={cn(inputCls, "resize-none")}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Cost</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={visitForm.cost ?? ""}
                      onChange={(e) =>
                        setVisitForm((f) => ({
                          ...f,
                          cost: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        }))
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Currency</label>
                    <input
                      type="text"
                      value={visitForm.currency || "INR"}
                      onChange={(e) =>
                        setVisitForm((f) => ({
                          ...f,
                          currency: e.target.value,
                        }))
                      }
                      maxLength={3}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Notes</label>
                  <textarea
                    value={visitForm.notes || ""}
                    onChange={(e) =>
                      setVisitForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    rows={2}
                    className={cn(inputCls, "resize-none")}
                  />
                </div>
              </>,
            )}
          />
        )}

        {activeTab === "lab_results" && (
          <LabResultsTab
            payload={p}
            onAdd={() => openLabForm()}
            onEdit={openLabForm}
            onDelete={(id) => deleteSubRecord("lab_results", id)}
            renderModal={renderModal(
              `${editingLab ? "Edit" : "Add"} Lab Result`,
              "lab",
              saveLabResult,
              <>
                <div>
                  <label className={labelCls}>Test Name *</label>
                  <input
                    type="text"
                    value={labForm.test_name || ""}
                    onChange={(e) =>
                      setLabForm((f) => ({ ...f, test_name: e.target.value }))
                    }
                    placeholder="e.g., Blood Sugar (Fasting)"
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Value *</label>
                    <input
                      type="text"
                      value={labForm.value || ""}
                      onChange={(e) =>
                        setLabForm((f) => ({ ...f, value: e.target.value }))
                      }
                      placeholder="e.g., 95"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Unit</label>
                    <input
                      type="text"
                      value={labForm.unit || ""}
                      onChange={(e) =>
                        setLabForm((f) => ({ ...f, unit: e.target.value }))
                      }
                      placeholder="e.g., mg/dL"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Status</label>
                    <select
                      value={labForm.status || "normal"}
                      onChange={(e) =>
                        setLabForm((f) => ({
                          ...f,
                          status: e.target.value as LabStatus,
                        }))
                      }
                      className={inputCls}
                    >
                      {Object.entries(LAB_STATUS_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Date</label>
                    <input
                      type="date"
                      value={labForm.date || ""}
                      onChange={(e) =>
                        setLabForm((f) => ({ ...f, date: e.target.value }))
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Reference Range</label>
                    <input
                      type="text"
                      value={labForm.reference_range || ""}
                      onChange={(e) =>
                        setLabForm((f) => ({
                          ...f,
                          reference_range: e.target.value,
                        }))
                      }
                      placeholder="e.g., 70-100"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Notes</label>
                  <textarea
                    value={labForm.notes || ""}
                    onChange={(e) =>
                      setLabForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    rows={2}
                    className={cn(inputCls, "resize-none")}
                  />
                </div>
              </>,
            )}
          />
        )}

        {activeTab === "body_stats" && (
          <BodyStatsTab
            payload={p}
            onAdd={() => openMeasurementForm()}
            onEdit={openMeasurementForm}
            onDelete={(id) => deleteSubRecord("measurements", id)}
            renderModal={renderModal(
              `${editingMeasurement ? "Edit" : "Add"} Measurement`,
              "measurement",
              saveMeasurement,
              <>
                <div>
                  <label className={labelCls}>Date</label>
                  <input
                    type="date"
                    value={measurementForm.date || ""}
                    onChange={(e) =>
                      setMeasurementForm((f) => ({
                        ...f,
                        date: e.target.value,
                      }))
                    }
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Height (cm)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={measurementForm.height_cm ?? ""}
                      onChange={(e) =>
                        setMeasurementForm((f) => ({
                          ...f,
                          height_cm: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        }))
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Weight (kg)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={measurementForm.weight_kg ?? ""}
                      onChange={(e) =>
                        setMeasurementForm((f) => ({
                          ...f,
                          weight_kg: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        }))
                      }
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Notes</label>
                  <textarea
                    value={measurementForm.notes || ""}
                    onChange={(e) =>
                      setMeasurementForm((f) => ({
                        ...f,
                        notes: e.target.value,
                      }))
                    }
                    rows={2}
                    className={cn(inputCls, "resize-none")}
                  />
                </div>
              </>,
            )}
          />
        )}

        {activeTab === "documents" && (
          <DocumentsTab
            payload={p}
            onAdd={() => openDocForm()}
            onEdit={openDocForm}
            onDelete={(id) => deleteSubRecord("documents", id)}
            onPreviewDoc={(src, contentType, filename, size) =>
              setPreviewDoc({ src, contentType, filename, size })
            }
            renderModal={renderModal(
              `${editingDoc ? "Edit" : "Add"} Document`,
              "document",
              saveDocument,
              <>
                <div>
                  <label className={labelCls}>Title *</label>
                  <input
                    type="text"
                    value={docForm.title || ""}
                    onChange={(e) =>
                      setDocForm((f) => ({ ...f, title: e.target.value }))
                    }
                    placeholder="e.g., Blood Test Report"
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Type</label>
                    <select
                      value={docForm.type || "other"}
                      onChange={(e) =>
                        setDocForm((f) => ({
                          ...f,
                          type: e.target.value as DocType,
                        }))
                      }
                      className={inputCls}
                    >
                      {Object.entries(DOC_TYPE_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Date</label>
                    <input
                      type="date"
                      value={docForm.date || ""}
                      onChange={(e) =>
                        setDocForm((f) => ({ ...f, date: e.target.value }))
                      }
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="space-y-3 pb-2">
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>Attachments</label>
                    <button
                      type="button"
                      onClick={() =>
                        document.getElementById("health-doc-upload")?.click()
                      }
                      className="text-[10px] font-bold uppercase tracking-wider text-accent hover:text-accent/80 transition-colors"
                    >
                      Add Files
                    </button>
                    <input
                      id="health-doc-upload"
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={handleDocFilesChange}
                      className="hidden"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {(docForm.attachments || []).map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between gap-3 p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl group hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700/50">
                            {att.content_type === "application/pdf" ? (
                              <FileText className="w-4 h-4 text-danger" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-accent" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-zinc-300 truncate">
                              {att.filename}
                            </p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                              {(att.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocAttachment(att.id)}
                          className="p-1.5 rounded-lg hover:bg-danger/20 text-zinc-500 hover:text-danger transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {(docForm.attachments || []).length === 0 && (
                      <div
                        onClick={() =>
                          document.getElementById("health-doc-upload")?.click()
                        }
                        className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-zinc-800 rounded-2xl hover:border-zinc-700 hover:bg-zinc-800/30 transition-all cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Plus className="w-5 h-5 text-zinc-600" />
                        </div>
                        <p className="text-xs text-zinc-500 font-medium">
                          No files attached
                        </p>
                        <p className="text-[10px] text-zinc-700 uppercase tracking-widest mt-1">
                          Drop images or PDFs here
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Notes</label>
                  <textarea
                    value={docForm.notes || ""}
                    onChange={(e) =>
                      setDocForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    rows={2}
                    className={cn(inputCls, "resize-none")}
                  />
                </div>
              </>,
            )}
          />
        )}

        {/* Condition form modal */}
        {renderModal(
          `${editingCondition ? "Edit" : "Add"} Condition`,
          "condition",
          saveCondition,
          <>
            <div>
              <label className={labelCls}>Condition Name *</label>
              <input
                type="text"
                value={conditionForm.name || ""}
                onChange={(e) =>
                  setConditionForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g., Hypertension"
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Diagnosed Date</label>
                <input
                  type="date"
                  value={conditionForm.diagnosed_date || ""}
                  onChange={(e) =>
                    setConditionForm((f) => ({
                      ...f,
                      diagnosed_date: e.target.value,
                    }))
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select
                  value={conditionForm.status || "active"}
                  onChange={(e) =>
                    setConditionForm((f) => ({
                      ...f,
                      status: e.target.value as ConditionStatus,
                    }))
                  }
                  className={inputCls}
                >
                  {Object.entries(CONDITION_STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <textarea
                value={conditionForm.notes || ""}
                onChange={(e) =>
                  setConditionForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
                className={cn(inputCls, "resize-none")}
              />
            </div>
          </>,
        )}

        <ProfileFormModal
          open={showProfileForm}
          onClose={() => setShowProfileForm(false)}
          editingProfile={editingProfile}
          formData={formData}
          setFormData={setFormData}
          allergyInput={allergyInput}
          setAllergyInput={setAllergyInput}
          saving={saving}
          onSave={saveProfile}
          onProfilePicUpload={handleProfilePicUpload}
        />

        {/* Confirm Delete */}
        <ConfirmDialog
          isOpen={confirmDelete.open}
          title="Delete Profile"
          description={`Are you sure you want to delete "${confirmDelete.name}"? This will remove all health data for this profile.`}
          onConfirm={() => {
            deleteProfile(confirmDelete.id);
            setConfirmDelete({ open: false, id: "", name: "" });
          }}
          onClose={() => setConfirmDelete({ open: false, id: "", name: "" })}
        />
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.visible}
          onClose={() => setToast((t) => ({ ...t, visible: false }))}
        />

        {cropFileState && (
          <ImageCropper
            imageSrc={cropFileState.url}
            mimeType={cropFileState.type}
            onClose={closeCropper}
            onCropComplete={handleCropComplete}
          />
        )}

        {previewImage && (
          <ImagePreview
            src={previewImage.src}
            alt={previewImage.name}
            onClose={() => setPreviewImage(null)}
          />
        )}

        {previewDoc && (
          <DocPreview
            src={`data:${previewDoc.contentType};base64,${previewDoc.src}`}
            contentType={previewDoc.contentType}
            filename={previewDoc.filename}
            size={previewDoc.size}
            onClose={() => setPreviewDoc(null)}
          />
        )}
      </div>
    );
  }

  // ─── Render: List View ───────────────────────────────────────────────────

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50 mb-1">
            Health
          </h1>
          <p className="text-sm text-zinc-500">
            {profiles.length} profile{profiles.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openAddProfile}
          className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />{" "}
          <span className="hidden sm:inline">Add</span> Profile
        </button>
      </div>

      {/* Metrics bento grid */}
      {profiles.length > 0 && (
        <HealthMetrics profiles={profiles} alertCount={profileAlerts.length} />
      )}

      {/* Alerts banner */}
      <AlertsBanner alerts={profileAlerts} />

      {profiles.length > 0 && (
        <HealthProfileToolbar
          filterOptions={filterOptions}
          listFilter={listFilter}
          onFilterChange={setListFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          visibleCount={visibleProfiles.length}
          totalCount={profiles.length}
        />
      )}

      {/* Profile Cards */}
      {profiles.length === 0 ? (
        <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-16 text-center">
          <HeartPulse className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400 font-medium text-lg">
            No health profiles yet
          </p>
          <p className="text-sm text-zinc-600 mt-2">
            Add your first profile to start tracking health records
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {visibleProfiles.map((profile) => (
            <ProfileCard
              key={profile._id}
              profile={profile}
              onClick={() => {
                setSelectedProfile(profile);
                setActiveTab("overview");
              }}
              onPreviewImage={(src, name) => setPreviewImage({ src, name })}
            />
          ))}
        </div>
      )}

      {profiles.length > 0 && visibleProfiles.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900 p-10 text-center">
          <p className="text-sm font-semibold text-zinc-200">
            No profiles match the current view
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {searchQuery.trim()
              ? "Try a different search term or switch filters."
              : "Try switching back to all profiles or another group."}
          </p>
        </div>
      )}

      <ProfileFormModal
        open={showProfileForm}
        onClose={() => setShowProfileForm(false)}
        editingProfile={editingProfile}
        formData={formData}
        setFormData={setFormData}
        allergyInput={allergyInput}
        setAllergyInput={setAllergyInput}
        saving={saving}
        onSave={saveProfile}
        onProfilePicUpload={handleProfilePicUpload}
      />

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={confirmDelete.open}
        title="Delete Profile"
        description={`Are you sure you want to delete "${confirmDelete.name}"?`}
        onConfirm={() => {
          deleteProfile(confirmDelete.id);
          setConfirmDelete({ open: false, id: "", name: "" });
        }}
        onClose={() => setConfirmDelete({ open: false, id: "", name: "" })}
      />
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.visible}
        onClose={() => setToast((t) => ({ ...t, visible: false }))}
      />

      {cropFileState && (
        <ImageCropper
          imageSrc={cropFileState.url}
          mimeType={cropFileState.type}
          onClose={closeCropper}
          onCropComplete={handleCropComplete}
        />
      )}

      {previewImage && (
        <ImagePreview
          src={previewImage.src}
          alt={previewImage.name}
          onClose={() => setPreviewImage(null)}
        />
      )}
      {previewDoc && (
        <DocPreview
          src={`data:${previewDoc.contentType};base64,${previewDoc.src}`}
          contentType={previewDoc.contentType}
          filename={previewDoc.filename}
          size={previewDoc.size}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
