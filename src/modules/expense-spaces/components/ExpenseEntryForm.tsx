"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type {
  ExpenseSpaceDocument,
  ExpenseSpaceEntryDocument,
  ExpenseSpaceEntryInput,
  ExpenseSpaceUpdateInput,
} from "../types";
import { EXPENSE_PAYMENT_METHODS } from "../constants";
import FuzzyFreeTextInput from "./FuzzyFreeTextInput";

interface Props {
  open: boolean;
  space: ExpenseSpaceDocument;
  entry?: ExpenseSpaceEntryDocument | null;
  payeeSuggestions: string[];
  descriptionSuggestions: string[];
  tagSuggestions: string[];
  onClose: () => void;
  onSave: (input: ExpenseSpaceEntryInput) => Promise<unknown>;
  onSaveSpaceTaxonomy: (
    input: ExpenseSpaceUpdateInput,
  ) => Promise<ExpenseSpaceDocument>;
}

function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const normalize = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");

export default function ExpenseEntryForm({
  open,
  space,
  entry,
  payeeSuggestions,
  descriptionSuggestions,
  tagSuggestions,
  onClose,
  onSave,
  onSaveSpaceTaxonomy,
}: Props) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(localToday());
  const [description, setDescription] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [reference, setReference] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [showInlineCategory, setShowInlineCategory] = useState(false);
  const [showInlineSubcategory, setShowInlineSubcategory] = useState(false);
  const [inlineCategory, setInlineCategory] = useState("");
  const [inlineSubcategory, setInlineSubcategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(entry?.payload.amount.toString() ?? "");
    setDate(entry?.payload.date ?? localToday());
    setDescription(entry?.payload.description ?? "");
    setPaidTo(entry?.payload.paid_to ?? "");
    setCategoryId(entry?.payload.category_id ?? "");
    setSubcategoryId(entry?.payload.subcategory_id ?? "");
    setPaymentMethod(entry?.payload.payment_method ?? "");
    setReference(entry?.payload.reference ?? "");
    setTags(entry?.payload.tags.join(", ") ?? "");
    setNotes(entry?.payload.notes ?? "");
    setReceiptUrl(entry?.payload.receipt_url ?? "");
    setShowInlineCategory(false);
    setShowInlineSubcategory(false);
    setInlineCategory("");
    setInlineSubcategory("");
    setError(null);
  }, [entry, open]);

  const visibleCategories = useMemo(
    () =>
      space.payload.categories.filter(
        (category) =>
          category.is_active || category.id === entry?.payload.category_id,
      ),
    [entry?.payload.category_id, space.payload.categories],
  );
  const selectedCategory = space.payload.categories.find(
    (category) => category.id === categoryId,
  );
  const visibleSubcategories = (selectedCategory?.subcategories ?? []).filter(
    (subcategory) =>
      subcategory.is_active || subcategory.id === entry?.payload.subcategory_id,
  );

  if (!open) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const numericAmount = Number(amount);
    if (
      !numericAmount ||
      !date ||
      !description.trim() ||
      !paidTo.trim() ||
      (!categoryId && !(showInlineCategory && inlineCategory.trim()))
    ) {
      setError("Amount, date, description, paid to, and category are required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let finalCategoryId = categoryId;
      let finalSubcategoryId = subcategoryId || undefined;
      let categories = space.payload.categories;
      const newCategoryName = inlineCategory.trim().replace(/\s+/g, " ");
      const newSubcategoryName = inlineSubcategory.trim().replace(/\s+/g, " ");

      if (showInlineCategory && newCategoryName) {
        if (
          categories.some(
            (category) =>
              normalize(category.name) === normalize(newCategoryName),
          )
        ) {
          throw new Error("A category with this name already exists");
        }
        finalCategoryId = crypto.randomUUID();
        finalSubcategoryId = undefined;
        categories = [
          ...categories,
          {
            id: finalCategoryId,
            name: newCategoryName,
            is_active: true,
            subcategories: [],
          },
        ];
      }

      if (showInlineSubcategory && newSubcategoryName) {
        const category = categories.find(
          (candidate) => candidate.id === finalCategoryId,
        );
        if (!category) throw new Error("Select a category first");
        if (
          category.subcategories.some(
            (subcategory) =>
              normalize(subcategory.name) === normalize(newSubcategoryName),
          )
        ) {
          throw new Error("A subcategory with this name already exists");
        }
        finalSubcategoryId = crypto.randomUUID();
        categories = categories.map((candidate) =>
          candidate.id === finalCategoryId
            ? {
                ...candidate,
                subcategories: [
                  ...candidate.subcategories,
                  {
                    id: finalSubcategoryId as string,
                    name: newSubcategoryName,
                    is_active: true,
                  },
                ],
              }
            : candidate,
        );
      }

      if (
        (showInlineCategory && newCategoryName) ||
        (showInlineSubcategory && newSubcategoryName)
      ) {
        await onSaveSpaceTaxonomy({
          name: space.payload.name,
          description: space.payload.description,
          currency: space.payload.currency,
          number_format: space.payload.number_format,
          budget: space.payload.budget,
          status: space.payload.status,
          categories,
          expected_updated_at: space.updated_at,
        });
      }

      await onSave({
        amount: numericAmount,
        date,
        description: description.trim(),
        paid_to: paidTo.trim().replace(/\s+/g, " "),
        category_id: finalCategoryId,
        ...(finalSubcategoryId ? { subcategory_id: finalSubcategoryId } : {}),
        ...(paymentMethod
          ? {
              payment_method:
                paymentMethod as ExpenseSpaceEntryInput["payment_method"],
            }
          : {}),
        ...(reference.trim() ? { reference: reference.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        ...(receiptUrl.trim() ? { receipt_url: receiptUrl.trim() } : {}),
      });
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save expense",
      );
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "mt-2 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-zinc-950/70 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-entry-title"
        className="max-h-[94dvh] w-full overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl sm:max-w-3xl sm:rounded-3xl sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              {space.payload.currency} ledger
            </p>
            <h2
              id="expense-entry-title"
              className="mt-2 text-2xl font-bold text-zinc-50"
            >
              {entry ? "Edit expense" : "Add expense"}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close expense form"
            onClick={onClose}
            className="h-11 w-11"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </Button>
        </div>

        <form
          aria-label="Expense details"
          onSubmit={submit}
          className="space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-zinc-200">
              Amount *
              <input
                aria-label="Amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="text-sm font-medium text-zinc-200">
              Date *
              <input
                aria-label="Date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="text-sm font-medium text-zinc-200">
              <label htmlFor="expense-description">Description *</label>
              <FuzzyFreeTextInput
                id="expense-description"
                label="Description"
                value={description}
                suggestions={descriptionSuggestions}
                maxLength={200}
                onChange={setDescription}
                className={inputClass}
              />
            </div>
            <div className="text-sm font-medium text-zinc-200">
              <label htmlFor="expense-paid-to">Paid to *</label>
              <FuzzyFreeTextInput
                id="expense-paid-to"
                label="Paid to"
                value={paidTo}
                suggestions={payeeSuggestions}
                maxLength={120}
                onChange={setPaidTo}
                className={inputClass}
              />
            </div>
          </div>

          <fieldset className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <legend className="px-1 text-sm font-semibold text-zinc-200">
              Category path
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-zinc-300">
                Category *
                <select
                  aria-label="Category"
                  value={categoryId}
                  onChange={(event) => {
                    setCategoryId(event.target.value);
                    setSubcategoryId("");
                  }}
                  className={inputClass}
                >
                  <option value="">Select a category</option>
                  {visibleCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                      {category.is_active ? "" : " (Archived)"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-zinc-300">
                Subcategory
                <select
                  aria-label="Subcategory"
                  value={subcategoryId}
                  onChange={(event) => setSubcategoryId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">No subcategory</option>
                  {visibleSubcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                      {subcategory.is_active ? "" : " (Archived)"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowInlineCategory((value) => !value)}
                aria-expanded={showInlineCategory}
                className="h-11"
              >
                <Plus aria-hidden="true" className="mr-2 h-4 w-4" /> Add
                category inline
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowInlineSubcategory((value) => !value)}
                disabled={!categoryId && !inlineCategory.trim()}
                aria-expanded={showInlineSubcategory}
                className="h-11"
              >
                Add subcategory inline
              </Button>
            </div>
            {showInlineCategory && (
              <label className="mt-4 block text-sm text-zinc-300">
                New category name
                <input
                  aria-label="New category name"
                  value={inlineCategory}
                  onChange={(event) => setInlineCategory(event.target.value)}
                  maxLength={80}
                  className={inputClass}
                />
              </label>
            )}
            {showInlineSubcategory && (
              <label className="mt-4 block text-sm text-zinc-300">
                New subcategory name
                <input
                  aria-label="New subcategory name"
                  value={inlineSubcategory}
                  onChange={(event) => setInlineSubcategory(event.target.value)}
                  maxLength={80}
                  className={inputClass}
                />
              </label>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-zinc-200">
              Payment method
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className={inputClass}
              >
                <option value="">Not specified</option>
                {EXPENSE_PAYMENT_METHODS.map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-zinc-200">
              Reference
              <input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                maxLength={120}
                className={inputClass}
              />
            </label>
          </div>
          <div className="block text-sm font-medium text-zinc-200">
            <label htmlFor="expense-tags">Tags</label>
            <FuzzyFreeTextInput
              id="expense-tags"
              label="Tags"
              value={tags}
              suggestions={tagSuggestions}
              onChange={setTags}
              className={inputClass}
              placeholder="materials, phase one"
              describedBy="expense-tags-help"
              tagMode
            />
            <span
              id="expense-tags-help"
              className="mt-1 block text-xs font-normal text-zinc-500"
            >
              Separate up to 20 tags with commas. Suggestions use the current
              tag only.
            </span>
          </div>
          <label className="block text-sm font-medium text-zinc-200">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={2000}
              rows={3}
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-base text-zinc-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-200">
            Receipt URL
            <input
              type="url"
              value={receiptUrl}
              onChange={(event) => setReceiptUrl(event.target.value)}
              className={inputClass}
            />
          </label>

          {error && (
            <p
              role="alert"
              aria-live="assertive"
              className="rounded-xl border border-danger/30 bg-danger-muted/20 p-3 text-sm text-danger"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-11"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              aria-label={saving ? "Saving expense" : undefined}
              className="h-11"
            >
              {saving ? "Saving…" : entry ? "Save expense" : "Add expense"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
