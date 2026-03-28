import type { ReactNode } from "react";
import {
  User,
  Users,
  PawPrint,
  FileText,
  ImageIcon,
  type LucideIcon,
} from "lucide-react";

// ─── Enums & Literal Types ─────────────────────────────────────────────────

export type ProfileType = "self" | "family" | "pet";
export type BloodGroup =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-"
  | "unknown";
export type Gender = "male" | "female" | "other";
export type ConditionStatus = "active" | "managed" | "resolved";
export type MedicationStatus = "active" | "completed" | "discontinued";
export type VisitType =
  | "checkup"
  | "consultation"
  | "emergency"
  | "surgery"
  | "lab_test"
  | "follow_up"
  | "dental"
  | "eye"
  | "other";
export type LabStatus = "normal" | "borderline" | "abnormal";
export type DocType =
  | "prescription"
  | "bill"
  | "lab_report"
  | "discharge_summary"
  | "insurance"
  | "imaging"
  | "other";

export type DetailTab =
  | "overview"
  | "medications"
  | "vaccinations"
  | "visits"
  | "lab_results"
  | "body_stats"
  | "documents";

// ─── Data Models ────────────────────────────────────────────────────────────

export interface Condition {
  id: string;
  name: string;
  diagnosed_date?: string;
  status: ConditionStatus;
  notes?: string;
}

export interface Medication {
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

export interface Vaccination {
  id: string;
  name: string;
  date_administered: string;
  next_due?: string;
  provider?: string;
  batch_number?: string;
  notes?: string;
}

export interface Visit {
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

export interface LabResult {
  id: string;
  date: string;
  test_name: string;
  value: string;
  unit?: string;
  reference_range?: string;
  status: LabStatus;
  notes?: string;
}

export interface Measurement {
  id: string;
  date: string;
  height_cm?: number;
  weight_kg?: number;
  notes?: string;
}

export interface BillAttachment {
  id: string;
  filename: string;
  content_type: string;
  data: string;
  size: number;
  uploaded_at: string;
}

export interface HealthDocument {
  id: string;
  type: DocType;
  title: string;
  date?: string;
  notes?: string;
  attachments: BillAttachment[];
}

export interface HealthPayload {
  name: string;
  type: ProfileType;
  relation?: string;
  date_of_birth?: string;
  blood_group: BloodGroup;
  gender?: Gender;
  avatar_url?: string;
  profile_pic?: {
    data: string;
    content_type: string;
  };
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

export interface HealthProfile {
  _id: string;
  created_at: string;
  updated_at: string;
  payload: HealthPayload;
}

export interface ProfileAlert {
  profileName: string;
  label: string;
  date: string;
  status: "overdue" | "warning";
}

// ─── Config Records ─────────────────────────────────────────────────────────

export const PROFILE_TYPE_CONFIG: Record<
  ProfileType,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: LucideIcon;
  }
> = {
  self: {
    label: "Self",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    icon: User,
  },
  family: {
    label: "Family",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    icon: Users,
  },
  pet: {
    label: "Pet",
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20",
    icon: PawPrint,
  },
};

export const CONDITION_STATUS_CONFIG: Record<
  ConditionStatus,
  { label: string; color: string; bg: string }
> = {
  active: { label: "Active", color: "text-danger", bg: "bg-danger/10" },
  managed: { label: "Managed", color: "text-warning", bg: "bg-warning/10" },
  resolved: { label: "Resolved", color: "text-success", bg: "bg-success/10" },
};

export const MEDICATION_STATUS_CONFIG: Record<
  MedicationStatus,
  { label: string; color: string; bg: string }
> = {
  active: { label: "Active", color: "text-success", bg: "bg-success/10" },
  completed: {
    label: "Completed",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  discontinued: {
    label: "Discontinued",
    color: "text-zinc-400",
    bg: "bg-zinc-500/10",
  },
};

export const VISIT_TYPE_CONFIG: Record<VisitType, { label: string; color: string }> = {
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

export const LAB_STATUS_CONFIG: Record<
  LabStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  normal: {
    label: "Normal",
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
  },
  borderline: {
    label: "Borderline",
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20",
  },
  abnormal: {
    label: "Abnormal",
    color: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/20",
  },
};

export const DOC_TYPE_CONFIG: Record<
  DocType,
  { label: string; color: string; icon: LucideIcon }
> = {
  prescription: {
    label: "Prescription",
    icon: FileText,
    color: "text-blue-400",
  },
  bill: { label: "Bill", icon: FileText, color: "text-success" },
  lab_report: { label: "Lab Report", icon: FileText, color: "text-purple-400" },
  discharge_summary: {
    label: "Discharge",
    icon: FileText,
    color: "text-orange-400",
  },
  insurance: { label: "Insurance", icon: FileText, color: "text-cyan-400" },
  imaging: { label: "Imaging", icon: ImageIcon, color: "text-rose-400" },
  other: { label: "Other", icon: FileText, color: "text-zinc-500" },
};

export const BLOOD_GROUPS: BloodGroup[] = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "unknown",
];

// ─── Helpers ────────────────────────────────────────────────────────────────

export function formatDate(d: string): string {
  if (!d) return "\u2014";
  const date = new Date(d);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateInput(d?: string): string {
  if (!d) return "";
  return d.slice(0, 10);
}

export function toISODate(d: string): string {
  if (!d) return "";
  if (d.includes("T")) return d;
  return `${d}T00:00:00.000Z`;
}

export function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDueStatus(dateStr?: string): "overdue" | "warning" | "ok" | "none" {
  if (!dateStr) return "none";
  const days = daysUntil(dateStr);
  if (days === null) return "none";
  if (days < 0) return "overdue";
  if (days <= 30) return "warning";
  return "ok";
}

export function dueBadge(dateStr?: string, label?: string): ReactNode {
  const status = getDueStatus(dateStr);
  if (status === "none") return null;
  const days = daysUntil(dateStr)!;
  const config = {
    overdue: {
      text: `${label ? label + ": " : ""}Overdue ${Math.abs(days)}d`,
      bg: "bg-danger/10",
      border: "border-danger/20",
      color: "text-danger",
    },
    warning: {
      text: `${label ? label + ": " : ""}${days}d left`,
      bg: "bg-warning/10",
      border: "border-warning/20",
      color: "text-warning",
    },
    ok: {
      text: `${label ? label + ": " : ""}${days}d left`,
      bg: "bg-success/10",
      border: "border-success/20",
      color: "text-success",
    },
  }[status];

  // Import cn inline to avoid circular dep issues — this is a render helper
  const clsx = (...classes: (string | boolean | undefined)[]) =>
    classes.filter(Boolean).join(" ");

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
        config.bg,
        config.border,
        config.color,
      )}
    >
      {config.text}
    </span>
  );
}

export function uuid(): string {
  return crypto.randomUUID();
}

export function emptyPayload(): HealthPayload {
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

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function calculateBMI(heightCm?: number, weightKg?: number): number | null {
  if (!heightCm || !weightKg || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Underweight", color: "text-warning" };
  if (bmi < 25) return { label: "Normal", color: "text-success" };
  if (bmi < 30) return { label: "Overweight", color: "text-warning" };
  return { label: "Obese", color: "text-danger" };
}

export const inputCls =
  "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600";
export const labelCls =
  "text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5";

export function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}
