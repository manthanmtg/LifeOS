"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  INPUT_CLASSES,
  LABEL_CLASSES,
  MEDICATION_STATUS_CONFIG,
} from "./constants";
import type { Medication, MedicationStatus } from "./types";
import SubFormModal from "./SubFormModal";

interface MedicationFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (record: Medication) => void;
  initialData: Medication | null;
  saving?: boolean;
}

export default function MedicationFormModal({
  open,
  onClose,
  onSave,
  initialData,
  saving,
}: MedicationFormModalProps) {
  const [formData, setFormData] = useState<Partial<Medication>>(
    initialData ? { ...initialData } : { status: "active" },
  );

  const handleSubmit = () => {
    if (!formData.name?.trim()) return;
    onSave(formData as Medication);
  };

  return (
    <SubFormModal
      open={open}
      onClose={onClose}
      title={`${initialData ? "Edit" : "Add"} Medication`}
      onSave={handleSubmit}
      saving={saving}
    >
      <div>
        <label className={LABEL_CLASSES}>Name *</label>
        <input
          type="text"
          value={formData.name || ""}
          onChange={(e) =>
            setFormData((f) => ({ ...f, name: e.target.value }))
          }
          placeholder="e.g., Metformin"
          className={INPUT_CLASSES}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLASSES}>Dosage</label>
          <input
            type="text"
            value={formData.dosage || ""}
            onChange={(e) =>
              setFormData((f) => ({
                ...f,
                dosage: e.target.value,
              }))
            }
            placeholder="e.g., 500mg twice daily"
            className={INPUT_CLASSES}
          />
        </div>
        <div>
          <label className={LABEL_CLASSES}>Status</label>
          <select
            value={formData.status || "active"}
            onChange={(e) =>
              setFormData((f) => ({
                ...f,
                status: e.target.value as MedicationStatus,
              }))
            }
            className={INPUT_CLASSES}
          >
            {Object.entries(MEDICATION_STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={LABEL_CLASSES}>Prescribed By</label>
        <input
          type="text"
          value={formData.prescribed_by || ""}
          onChange={(e) =>
            setFormData((f) => ({
              ...f,
              prescribed_by: e.target.value,
            }))
          }
          placeholder="Doctor name"
          className={INPUT_CLASSES}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={LABEL_CLASSES}>Start Date</label>
          <input
            type="date"
            value={formData.start_date || ""}
            onChange={(e) =>
              setFormData((f) => ({
                ...f,
                start_date: e.target.value,
              }))
            }
            className={INPUT_CLASSES}
          />
        </div>
        <div>
          <label className={LABEL_CLASSES}>End Date</label>
          <input
            type="date"
            value={formData.end_date || ""}
            onChange={(e) =>
              setFormData((f) => ({
                ...f,
                end_date: e.target.value,
              }))
            }
            className={INPUT_CLASSES}
          />
        </div>
        <div>
          <label className={LABEL_CLASSES}>Refill Date</label>
          <input
            type="date"
            value={formData.refill_date || ""}
            onChange={(e) =>
              setFormData((f) => ({
                ...f,
                refill_date: e.target.value,
              }))
            }
            className={INPUT_CLASSES}
          />
        </div>
      </div>
      <div>
        <label className={LABEL_CLASSES}>Notes</label>
        <textarea
          value={formData.notes || ""}
          onChange={(e) =>
            setFormData((f) => ({
              ...f,
              notes: e.target.value,
            }))
          }
          rows={2}
          className={cn(INPUT_CLASSES, "resize-none")}
        />
      </div>
    </SubFormModal>
  );
}
