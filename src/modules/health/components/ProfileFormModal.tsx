"use client";

import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { BLOOD_GROUPS, INPUT_CLASSES, LABEL_CLASSES } from "./constants";
import { useDialogAccessibility } from "@/components/ui/Dialog";
import { useId, useRef } from "react";
import { formatDateInput, toISODate } from "./helpers";
import type {
  HealthProfile,
  HealthPayload,
  ProfileType,
  BloodGroup,
  Gender,
} from "./types";

interface ProfileFormModalProps {
  open: boolean;
  onClose: () => void;
  editingProfile: HealthProfile | null;
  formData: HealthPayload;
  setFormData: React.Dispatch<React.SetStateAction<HealthPayload>>;
  allergyInput: string;
  setAllergyInput: React.Dispatch<React.SetStateAction<string>>;
  saving: boolean;
  onSave: () => Promise<void>;
  onProfilePicUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ProfileFormModal({
  open,
  onClose,
  editingProfile,
  formData,
  setFormData,
  allergyInput,
  setAllergyInput,
  saving,
  onSave,
  onProfilePicUpload,
}: ProfileFormModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogAccessibility({
    isOpen: open,
    onClose,
    initialFocusRef: closeRef,
  });

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
          />
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg max-h-[85vh] sm:max-h-[80vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl mx-2 sm:mx-0"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
          >
            <div className="p-4 sm:p-6 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <h3
                id={titleId}
                className="text-base sm:text-lg font-bold text-zinc-50"
              >
                {editingProfile ? "Edit" : "Add"} Health Profile
              </h3>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close health profile form"
                className="min-h-11 min-w-11 p-2 rounded-lg hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 flex-1 min-h-0 overflow-y-auto">
              {/* Profile picture */}
              <div className="flex flex-col items-center justify-center pb-2">
                <label className="relative group cursor-pointer w-24 h-24 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center overflow-hidden transition-all shadow-xl">
                  {formData.profile_pic ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={`data:${formData.profile_pic.content_type};base64,${formData.profile_pic.data}`}
                        alt="Profile"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="text-zinc-500 group-hover:text-zinc-300 transition-colors flex flex-col items-center">
                      <Plus className="w-6 h-6 mb-1" />
                      <span className="text-xs font-medium uppercase tracking-wider">
                        Photo
                      </span>
                    </div>
                  )}
                  <input
                    aria-label="Upload profile photo"
                    type="file"
                    accept="image/*"
                    onChange={onProfilePicUpload}
                    className="hidden"
                  />
                </label>
                {formData.profile_pic && (
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((f) => ({ ...f, profile_pic: undefined }))
                    }
                    className="mt-3 text-xs font-medium text-danger hover:text-danger/80 transition-colors uppercase tracking-wider"
                  >
                    Remove Photo
                  </button>
                )}
              </div>

              {/* Name */}
              <div>
                <label htmlFor="health-profile-name" className={LABEL_CLASSES}>
                  Name *
                </label>
                <input
                  id="health-profile-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Full name"
                  className={INPUT_CLASSES}
                />
              </div>

              {/* Type / Relation / Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="health-profile-type"
                    className={LABEL_CLASSES}
                  >
                    Type
                  </label>
                  <select
                    id="health-profile-type"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        type: e.target.value as ProfileType,
                      }))
                    }
                    className={INPUT_CLASSES}
                  >
                    <option value="self">Self</option>
                    <option value="family">Family</option>
                    <option value="pet">Pet</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="health-profile-relation"
                    className={LABEL_CLASSES}
                  >
                    Relation
                  </label>
                  <input
                    id="health-profile-relation"
                    type="text"
                    value={formData.relation || ""}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, relation: e.target.value }))
                    }
                    placeholder="e.g., Mother"
                    className={INPUT_CLASSES}
                  />
                </div>
                <div>
                  <label
                    htmlFor="health-profile-gender"
                    className={LABEL_CLASSES}
                  >
                    Gender
                  </label>
                  <select
                    id="health-profile-gender"
                    value={formData.gender || ""}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        gender: (e.target.value || undefined) as
                          | Gender
                          | undefined,
                      }))
                    }
                    className={INPUT_CLASSES}
                  >
                    <option value="">—</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Date of Birth / Blood Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="health-profile-birth-date"
                    className={LABEL_CLASSES}
                  >
                    Date of Birth
                  </label>
                  <input
                    id="health-profile-birth-date"
                    type="date"
                    value={formatDateInput(formData.date_of_birth)}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        date_of_birth: e.target.value
                          ? toISODate(e.target.value)
                          : undefined,
                      }))
                    }
                    className={INPUT_CLASSES}
                  />
                </div>
                <div>
                  <label
                    htmlFor="health-profile-blood-group"
                    className={LABEL_CLASSES}
                  >
                    Blood Group
                  </label>
                  <select
                    id="health-profile-blood-group"
                    value={formData.blood_group}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        blood_group: e.target.value as BloodGroup,
                      }))
                    }
                    className={INPUT_CLASSES}
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg === "unknown" ? "Unknown" : bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <label
                  htmlFor="health-profile-emergency-contact"
                  className={LABEL_CLASSES}
                >
                  Emergency Contact
                </label>
                <input
                  id="health-profile-emergency-contact"
                  type="text"
                  value={formData.emergency_contact || ""}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      emergency_contact: e.target.value,
                    }))
                  }
                  placeholder="Phone or name"
                  className={INPUT_CLASSES}
                />
              </div>

              {/* Insurance Info */}
              <div>
                <label
                  htmlFor="health-profile-insurance"
                  className={LABEL_CLASSES}
                >
                  Insurance Info
                </label>
                <input
                  id="health-profile-insurance"
                  type="text"
                  value={formData.insurance_info || ""}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      insurance_info: e.target.value,
                    }))
                  }
                  placeholder="Policy number or details"
                  className={INPUT_CLASSES}
                />
              </div>

              {/* Allergies */}
              <div>
                <label
                  htmlFor="health-profile-allergy"
                  className={LABEL_CLASSES}
                >
                  Allergies
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.allergies.map((a, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-danger/10 border border-danger/20 text-danger"
                    >
                      {a}
                      <button
                        type="button"
                        aria-label={`Remove ${a} allergy`}
                        onClick={() =>
                          setFormData((f) => ({
                            ...f,
                            allergies: f.allergies.filter((_, j) => j !== i),
                          }))
                        }
                        className="hover:text-danger"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    id="health-profile-allergy"
                    type="text"
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && allergyInput.trim()) {
                        e.preventDefault();
                        setFormData((f) => ({
                          ...f,
                          allergies: [...f.allergies, allergyInput.trim()],
                        }));
                        setAllergyInput("");
                      }
                    }}
                    placeholder="Type and press Enter"
                    className={INPUT_CLASSES}
                  />
                  <button
                    type="button"
                    aria-label="Add allergy"
                    onClick={() => {
                      if (allergyInput.trim()) {
                        setFormData((f) => ({
                          ...f,
                          allergies: [...f.allergies, allergyInput.trim()],
                        }));
                        setAllergyInput("");
                      }
                    }}
                    className="px-3 py-2 bg-zinc-800 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="health-profile-notes" className={LABEL_CLASSES}>
                  Notes
                </label>
                <textarea
                  id="health-profile-notes"
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={2}
                  placeholder="General notes..."
                  className={cn(INPUT_CLASSES, "resize-none")}
                />
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="px-5 py-2.5 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? "Saving..." : editingProfile ? "Update" : "Add"}{" "}
                Profile
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
