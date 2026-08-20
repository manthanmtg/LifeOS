// Shared constants for health module components

import { User, Users, PawPrint, FileText, ImageIcon } from "lucide-react";
import type {
  ProfileType,
  ConditionStatus,
  MedicationStatus,
  VisitType,
  LabStatus,
  DocType,
  BloodGroup,
} from "./types";

export const PROFILE_TYPE_CONFIG: Record<
  ProfileType,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: typeof User;
  }
> = {
  self: {
    label: "Self",
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/20",
    icon: User,
  },
  family: {
    label: "Family",
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
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
    color: "text-accent",
    bg: "bg-accent/10",
  },
  discontinued: {
    label: "Discontinued",
    color: "text-zinc-400",
    bg: "bg-zinc-500/10",
  },
};

export const VISIT_TYPE_CONFIG: Record<
  VisitType,
  { label: string; color: string }
> = {
  checkup: { label: "Checkup", color: "text-accent" },
  consultation: { label: "Consultation", color: "text-accent" },
  emergency: { label: "Emergency", color: "text-danger" },
  surgery: { label: "Surgery", color: "text-warning" },
  lab_test: { label: "Lab Test", color: "text-success" },
  follow_up: { label: "Follow-up", color: "text-accent" },
  dental: { label: "Dental", color: "text-zinc-400" },
  eye: { label: "Eye", color: "text-success" },
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
  { label: string; color: string; icon: typeof FileText | typeof ImageIcon }
> = {
  prescription: {
    label: "Prescription",
    icon: FileText,
    color: "text-accent",
  },
  bill: { label: "Bill", icon: FileText, color: "text-success" },
  lab_report: { label: "Lab Report", icon: FileText, color: "text-accent" },
  discharge_summary: {
    label: "Discharge",
    icon: FileText,
    color: "text-warning",
  },
  insurance: { label: "Insurance", icon: FileText, color: "text-accent" },
  imaging: { label: "Imaging", icon: ImageIcon, color: "text-danger" },
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

export const INPUT_CLASSES =
  "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600";
export const LABEL_CLASSES =
  "text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-1.5";
