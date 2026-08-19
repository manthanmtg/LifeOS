"use client";

import { useEffect, useState } from "react";
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ExpenseSpacesApiError } from "../api";
import { EXPENSE_SPACE_CURRENCIES } from "../constants";
import type {
  ExpenseSpaceCategory,
  ExpenseSpaceDocument,
  ExpenseSpaceUpdateInput,
} from "../types";

interface Props {
  space: ExpenseSpaceDocument;
  entryCount: number;
  usedCategoryIds: string[];
  usedSubcategoryIds: string[];
  onUpdate: (input: ExpenseSpaceUpdateInput) => Promise<ExpenseSpaceDocument>;
  onDelete: (confirmation: string) => Promise<void>;
  onReload: () => Promise<void>;
}

function cloneCategories(categories: ExpenseSpaceCategory[]) {
  return categories.map((category) => ({
    ...category,
    subcategories: category.subcategories.map((subcategory) => ({
      ...subcategory,
    })),
  }));
}

export default function ExpenseSpaceSettings({
  space,
  entryCount,
  usedCategoryIds,
  usedSubcategoryIds,
  onUpdate,
  onDelete,
  onReload,
}: Props) {
  const [name, setName] = useState(space.payload.name);
  const [description, setDescription] = useState(
    space.payload.description ?? "",
  );
  const [currency, setCurrency] = useState(space.payload.currency);
  const [numberFormat, setNumberFormat] = useState(space.payload.number_format);
  const [budgetAmount, setBudgetAmount] = useState(
    space.payload.budget?.amount.toString() ?? "",
  );
  const [budgetCadence, setBudgetCadence] = useState<"total" | "monthly">(
    space.payload.budget?.cadence ?? "total",
  );
  const [categories, setCategories] = useState(() =>
    cloneCategories(space.payload.categories),
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    setName(space.payload.name);
    setDescription(space.payload.description ?? "");
    setCurrency(space.payload.currency);
    setNumberFormat(space.payload.number_format);
    setBudgetAmount(space.payload.budget?.amount.toString() ?? "");
    setBudgetCadence(space.payload.budget?.cadence ?? "total");
    setCategories(cloneCategories(space.payload.categories));
  }, [space]);

  const buildInput = (
    overrides: Partial<ExpenseSpaceUpdateInput> = {},
  ): ExpenseSpaceUpdateInput => ({
    name: name.trim().replace(/\s+/g, " "),
    ...(description.trim() ? { description: description.trim() } : {}),
    currency,
    number_format: numberFormat,
    ...(budgetAmount
      ? {
          budget: {
            amount: Number(budgetAmount),
            cadence: budgetCadence,
          },
        }
      : {}),
    status: space.payload.status,
    categories,
    expected_updated_at: space.updated_at,
    ...overrides,
  });

  const save = async (overrides: Partial<ExpenseSpaceUpdateInput> = {}) => {
    if (saving) return;
    if (!name.trim()) {
      setError("Space name is required");
      return;
    }
    const nextStatus = overrides.status ?? space.payload.status;
    if (
      nextStatus === "active" &&
      !categories.some((category) => category.is_active)
    ) {
      setError("Keep at least one category active");
      return;
    }
    if (budgetAmount && Number(budgetAmount) <= 0) {
      setError("Budget must be greater than zero");
      return;
    }

    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      await onUpdate(buildInput(overrides));
      setStatus(
        overrides.status === "archived"
          ? "Space archived"
          : overrides.status === "active" && space.payload.status === "archived"
            ? "Space restored"
            : "Settings saved",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save settings",
      );
    } finally {
      setSaving(false);
    }
  };

  const updateCategory = (
    id: string,
    update: (category: ExpenseSpaceCategory) => ExpenseSpaceCategory,
  ) => {
    setCategories((current) =>
      current.map((category) =>
        category.id === id ? update(category) : category,
      ),
    );
  };

  const filteredCategories = categories.filter(
    (category) => showArchived || category.is_active,
  );
  const inputClass =
    "mt-2 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-base text-zinc-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
            General
          </p>
          <h3 className="mt-2 text-xl font-semibold text-zinc-50">
            Space settings
          </h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-zinc-200">
            Space name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-zinc-200">
            Currency
            <select
              value={currency}
              disabled={entryCount > 0}
              onChange={(event) => setCurrency(event.target.value)}
              className={inputClass}
            >
              {EXPENSE_SPACE_CURRENCIES.map((code) => (
                <option key={code}>{code}</option>
              ))}
            </select>
            {entryCount > 0 && (
              <span className="mt-1 block text-xs leading-5 text-zinc-500">
                Currency is locked after the first expense to protect historical
                amounts.
              </span>
            )}
          </label>
        </div>
        <label className="mt-4 block text-sm font-medium text-zinc-200">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={500}
            rows={3}
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-base text-zinc-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium text-zinc-200">
            Number format
            <select
              value={numberFormat}
              onChange={(event) =>
                setNumberFormat(event.target.value as "western" | "indian")
              }
              className={inputClass}
            >
              <option value="western">Western</option>
              <option value="indian">Indian</option>
            </select>
          </label>
          <label className="text-sm font-medium text-zinc-200">
            Budget amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={budgetAmount}
              onChange={(event) => setBudgetAmount(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-zinc-200">
            Budget cadence
            <select
              value={budgetCadence}
              onChange={(event) =>
                setBudgetCadence(event.target.value as "total" | "monthly")
              }
              className={inputClass}
            >
              <option value="total">Total</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              Taxonomy
            </p>
            <h3 className="mt-2 text-xl font-semibold text-zinc-50">
              Categories & subcategories
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowArchived((value) => !value)}
              aria-pressed={showArchived}
              className="h-11"
            >
              {showArchived ? "Hide archived" : "Show archived"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setCategories((current) => [
                  ...current,
                  {
                    id: crypto.randomUUID(),
                    name: "New category",
                    is_active: true,
                    subcategories: [],
                  },
                ])
              }
              className="h-11"
            >
              <Plus aria-hidden="true" className="mr-2 h-4 w-4" /> Add category
            </Button>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {filteredCategories.map((category) => {
            const isExpanded = expanded.has(category.id);
            const isUsed = usedCategoryIds.includes(category.id);
            return (
              <div
                key={category.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`${isExpanded ? "Collapse" : "Expand"} ${category.name} category`}
                    aria-expanded={isExpanded}
                    onClick={() =>
                      setExpanded((current) => {
                        const next = new Set(current);
                        if (next.has(category.id)) next.delete(category.id);
                        else next.add(category.id);
                        return next;
                      })
                    }
                    className="h-11 w-11 shrink-0"
                  >
                    {isExpanded ? (
                      <ChevronDown aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <ChevronRight aria-hidden="true" className="h-4 w-4" />
                    )}
                  </Button>
                  <label className="min-w-0 flex-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Category name {category.name}
                    <input
                      aria-label={`Category name ${category.name}`}
                      value={category.name}
                      maxLength={80}
                      onChange={(event) =>
                        updateCategory(category.id, (current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="mt-1 h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-base normal-case tracking-normal text-zinc-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`${category.is_active ? "Archive" : "Restore"} ${category.name} category`}
                    onClick={() =>
                      updateCategory(category.id, (current) => ({
                        ...current,
                        is_active: !current.is_active,
                      }))
                    }
                    className="h-11"
                  >
                    {category.is_active ? "Archive" : "Restore"}
                  </Button>
                  {!isUsed && (
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`Remove ${category.name} category`}
                      onClick={() =>
                        setCategories((current) =>
                          current.filter((item) => item.id !== category.id),
                        )
                      }
                      className="h-11 text-danger hover:text-danger"
                    >
                      <Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />{" "}
                      Remove
                    </Button>
                  )}
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-2 border-t border-zinc-800 pt-3 sm:ml-14">
                    {category.subcategories
                      .filter((item) => showArchived || item.is_active)
                      .map((subcategory) => {
                        const subcategoryUsed = usedSubcategoryIds.includes(
                          subcategory.id,
                        );
                        return (
                          <div
                            key={subcategory.id}
                            className="flex flex-col gap-2 sm:flex-row sm:items-center"
                          >
                            <label className="min-w-0 flex-1 text-xs text-zinc-500">
                              Subcategory name {subcategory.name}
                              <input
                                aria-label={`Subcategory name ${subcategory.name}`}
                                value={subcategory.name}
                                onChange={(event) =>
                                  updateCategory(category.id, (current) => ({
                                    ...current,
                                    subcategories: current.subcategories.map(
                                      (item) =>
                                        item.id === subcategory.id
                                          ? {
                                              ...item,
                                              name: event.target.value,
                                            }
                                          : item,
                                    ),
                                  }))
                                }
                                className="mt-1 h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                              />
                            </label>
                            <Button
                              type="button"
                              variant="ghost"
                              aria-label={`${subcategory.is_active ? "Archive" : "Restore"} ${subcategory.name} subcategory`}
                              onClick={() =>
                                updateCategory(category.id, (current) => ({
                                  ...current,
                                  subcategories: current.subcategories.map(
                                    (item) =>
                                      item.id === subcategory.id
                                        ? {
                                            ...item,
                                            is_active: !item.is_active,
                                          }
                                        : item,
                                  ),
                                }))
                              }
                              className="h-11"
                            >
                              {subcategory.is_active ? "Archive" : "Restore"}
                            </Button>
                            {!subcategoryUsed && (
                              <Button
                                type="button"
                                variant="ghost"
                                aria-label={`Remove ${subcategory.name} subcategory`}
                                onClick={() =>
                                  updateCategory(category.id, (current) => ({
                                    ...current,
                                    subcategories: current.subcategories.filter(
                                      (item) => item.id !== subcategory.id,
                                    ),
                                  }))
                                }
                                className="h-11 text-danger hover:text-danger"
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        updateCategory(category.id, (current) => ({
                          ...current,
                          subcategories: [
                            ...current.subcategories,
                            {
                              id: crypto.randomUUID(),
                              name: "New subcategory",
                              is_active: true,
                            },
                          ],
                        }))
                      }
                      className="h-11"
                    >
                      <Plus aria-hidden="true" className="mr-2 h-4 w-4" /> Add
                      subcategory
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger-muted/20 p-4 text-sm text-danger"
        >
          <p>{error}</p>
          {error.toLocaleLowerCase().includes("another tab") && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void onReload()}
              className="mt-3 h-11"
            >
              <RotateCcw aria-hidden="true" className="mr-2 h-4 w-4" /> Reload
              settings
            </Button>
          )}
        </div>
      )}
      {status && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-xl border border-success/30 bg-success-muted/20 p-3 text-sm text-success"
        >
          {status}
        </p>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="h-11"
        >
          {saving ? "Saving settings…" : "Save settings"}
        </Button>
      </div>

      <section className="rounded-2xl border border-danger/30 bg-danger-muted/10 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-danger">
          Lifecycle & danger zone
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-zinc-50">
              {space.payload.status === "archived"
                ? "Restore this space"
                : "Archive this space"}
            </h3>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Archived spaces remain in analytics and are read-only until
              restored.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void save({
                status:
                  space.payload.status === "archived" ? "active" : "archived",
              })
            }
            className="h-11 shrink-0"
          >
            {space.payload.status === "archived" ? (
              <RotateCcw aria-hidden="true" className="mr-2 h-4 w-4" />
            ) : (
              <Archive aria-hidden="true" className="mr-2 h-4 w-4" />
            )}
            {space.payload.status === "archived"
              ? "Restore space"
              : "Archive space"}
          </Button>
        </div>
        <div className="mt-5 border-t border-danger/20 pt-5">
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmingDelete(true)}
            className="h-11"
          >
            <Trash2 aria-hidden="true" className="mr-2 h-4 w-4" /> Permanently
            delete space
          </Button>
        </div>
      </section>

      {confirmingDelete && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-zinc-950/75 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-space-title"
            className="w-full rounded-t-3xl border border-danger/30 bg-zinc-950 p-5 sm:max-w-lg sm:rounded-3xl sm:p-6"
          >
            <h3
              id="delete-space-title"
              className="text-xl font-semibold text-zinc-50"
            >
              Permanently delete {space.payload.name}?
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              This permanently deletes the space and every expense inside it.
            </p>
            <label className="mt-4 block text-sm font-medium text-zinc-200">
              Type {space.payload.name} to confirm
              <input
                aria-label={`Type ${space.payload.name} to confirm`}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className={inputClass}
              />
            </label>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmingDelete(false)}
                className="h-11"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={confirmation !== space.payload.name || saving}
                aria-label={`Delete ${space.payload.name} forever`}
                onClick={async () => {
                  if (saving) return;
                  setSaving(true);
                  setError(null);
                  try {
                    await onDelete(confirmation);
                  } catch (cause) {
                    setError(
                      cause instanceof Error ? cause.message : "Delete failed",
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
                className="h-11"
              >
                Delete forever
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function isStaleExpenseSpaceError(error: unknown) {
  return error instanceof ExpenseSpacesApiError && error.status === 409;
}
