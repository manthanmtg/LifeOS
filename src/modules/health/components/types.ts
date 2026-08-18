// Shared types for health module components

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
  dose_label?: string;
  repeat_interval_months?: 1 | 3 | 6 | 12;
  reminder_enabled?: boolean;
  reminder_offsets_days?: number[];
  attachments?: BillAttachment[];
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

export type DetailTab =
  | "overview"
  | "medications"
  | "vaccinations"
  | "visits"
  | "lab_results"
  | "body_stats"
  | "documents";
