"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus, RotateCcw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import { trackEvent } from "@/lib/analytics";
import { AdminModuleSkeleton } from "@/components/ui/Skeletons";
import type { EmiLoan, EmiTrackerSettings } from "./types";
import { getLoanCards } from "./lib/emi-utils";
import {
  buildPortfolioViewModel,
  type LoanSection,
  type PortfolioStatusFilter,
} from "./lib/emi-view-model";
import PortfolioHero from "./components/PortfolioHero";
import LoanFilters from "./components/LoanFilters";
import LoanList from "./components/LoanList";
import LoanDetails from "./components/LoanDetails";
import EmiEntryDialog from "./components/EmiEntryDialog";
import LoanEditor from "./components/LoanEditor";
import { cn } from "@/lib/utils";

const DEFAULTS: EmiTrackerSettings = {
  defaultCurrency: "INR",
  defaultDueDayOfMonth: 5,
  roundingDecimals: 2,
  numberFormat: "indian",
  defaultRecastStrategy: "keep_emi_adjust_tenure",
  categories: ["Home", "Car", "Education", "Personal", "Other"],
};

const VALID_SECTIONS: LoanSection[] = [
  "overview",
  "insights",
  "schedule",
  "activity",
  "documents",
];

const PRESSABLE =
  "transition-all duration-200 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100";

function isLoanSection(value: string | null): value is LoanSection {
  return !!value && VALID_SECTIONS.includes(value as LoanSection);
}

function filteredByStatus(loans: EmiLoan[], status: PortfolioStatusFilter) {
  if (status === "all") return loans;
  return loans.filter((loan) => loan.payload.status === status);
}

export default function EmiTrackerAdminView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings: rawSettings } = useModuleSettings<EmiTrackerSettings>(
    "emi-tracker",
    DEFAULTS,
  );
  const settings = useMemo(
    () => ({ ...DEFAULTS, ...rawSettings }),
    [rawSettings],
  );

  const [loans, setLoans] = useState<EmiLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editLoan, setEditLoan] = useState<EmiLoan | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [closedLoansExpanded, setClosedLoansExpanded] = useState(false);
  const [pendingNavigationLabel, setPendingNavigationLabel] = useState<
    string | null
  >(null);
  const [statusFilter, setStatusFilter] =
    useState<PortfolioStatusFilter>("active");
  const [now] = useState(() => new Date());

  const selectedId = searchParams.get("loan");
  const sectionParam = searchParams.get("section");
  const activeSection: LoanSection = isLoanSection(sectionParam)
    ? sectionParam
    : "overview";

  const setUrlState = useCallback(
    (
      updates: { loan?: string | null; section?: LoanSection | null },
      mode: "push" | "replace" = "push",
    ) => {
      const params = new URLSearchParams(searchParams.toString());
      if ("loan" in updates) {
        if (updates.loan) params.set("loan", updates.loan);
        else params.delete("loan");
      }
      if ("section" in updates) {
        if (updates.section) params.set("section", updates.section);
        else params.delete("section");
      }
      const query = params.toString();
      const href = query ? `/admin/emi-tracker?${query}` : "/admin/emi-tracker";
      if (mode === "replace") router.replace(href);
      else router.push(href);
    },
    [router, searchParams],
  );

  const fetchLoans = useCallback(
    async ({ keepExisting = false }: { keepExisting?: boolean } = {}) => {
      try {
        if (!keepExisting) setLoading(true);
        setFetchError(null);
        const res = await fetch("/api/content?module_type=emi_loan");
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || "Loans could not be loaded");
        }
        setLoans(data.data);
      } catch {
        setFetchError("Loans could not be loaded");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchLoans();
  }, [fetchLoans]);

  const selectedLoan = useMemo(
    () => loans.find((loan) => loan._id === selectedId) ?? null,
    [loans, selectedId],
  );

  useEffect(() => {
    if (!loading && selectedId && loans.length > 0 && !selectedLoan) {
      setUrlState({ loan: null, section: null }, "replace");
      setFetchError("Loan not found. Showing your portfolio.");
    }
  }, [loading, loans.length, selectedId, selectedLoan, setUrlState]);

  useEffect(() => {
    setPendingNavigationLabel(null);
  }, [selectedId, activeSection]);

  const portfolioModel = useMemo(
    () => buildPortfolioViewModel(loans, now, settings.roundingDecimals),
    [loans, now, settings.roundingDecimals],
  );

  const filteredLoans = useMemo(
    () => filteredByStatus(loans, statusFilter),
    [loans, statusFilter],
  );

  const activeLoanCards = useMemo(
    () =>
      getLoanCards(
        filteredByStatus(loans, "active"),
        now,
        searchQuery,
        settings.roundingDecimals,
      ),
    [loans, now, searchQuery, settings.roundingDecimals],
  );
  const closedLoanCards = useMemo(
    () =>
      getLoanCards(
        filteredByStatus(loans, "closed"),
        now,
        searchQuery,
        settings.roundingDecimals,
      ),
    [loans, now, searchQuery, settings.roundingDecimals],
  );
  const nonClosedLoanCards = useMemo(
    () =>
      getLoanCards(
        loans.filter((loan) => loan.payload.status !== "closed"),
        now,
        searchQuery,
        settings.roundingDecimals,
      ),
    [loans, now, searchQuery, settings.roundingDecimals],
  );
  const loanCards = useMemo(
    () =>
      getLoanCards(filteredLoans, now, searchQuery, settings.roundingDecimals),
    [filteredLoans, now, searchQuery, settings.roundingDecimals],
  );
  const allLoanCards = useMemo(
    () => getLoanCards(loans, now, searchQuery, settings.roundingDecimals),
    [loans, now, searchQuery, settings.roundingDecimals],
  );
  const primaryLoanCards =
    statusFilter === "all"
      ? nonClosedLoanCards
      : statusFilter === "active"
        ? activeLoanCards
        : loanCards;
  const showClosedSection =
    statusFilter !== "closed" && closedLoanCards.length > 0;
  const showClosedLoans =
    statusFilter === "all" ||
    closedLoansExpanded ||
    searchQuery.trim().length > 0 ||
    selectedLoan?.payload.status === "closed";
  const filterCounts = useMemo(
    () => ({
      active: portfolioModel.activeCount,
      closed: portfolioModel.closedCount,
      all: portfolioModel.allCount,
    }),
    [
      portfolioModel.activeCount,
      portfolioModel.allCount,
      portfolioModel.closedCount,
    ],
  );

  const openCreate = () => {
    setEditLoan(null);
    setFormError(null);
    setIsEditorOpen(true);
  };

  const openEdit = (loan: EmiLoan) => {
    setEditLoan(loan);
    setFormError(null);
    setIsEditorOpen(true);
  };

  const handleSaveLoan = async (payload: EmiLoan["payload"]) => {
    setIsSaving(true);
    setFormError(null);
    try {
      const method = editLoan ? "PUT" : "POST";
      const url = editLoan ? `/api/content/${editLoan._id}` : "/api/content";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editLoan
            ? { payload }
            : { module_type: "emi_loan", payload, is_public: false },
        ),
      });
      const data = await res.json();
      if (!data.success) {
        setFormError(data.error || "Changes were not saved. Try again.");
        return;
      }

      await fetchLoans({ keepExisting: true });
      setIsEditorOpen(false);
      setEditLoan(null);
      setUrlState({ loan: data.data._id, section: "overview" }, "replace");
      trackEvent({
        module: "emi_tracker",
        action: editLoan ? "update" : "create",
        label: payload.title,
      });
    } catch {
      setFormError("Changes were not saved. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateLoanPayload = async (payload: EmiLoan["payload"]) => {
    if (!selectedLoan) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/content/${selectedLoan._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Update failed");
      setLoans((prev) =>
        prev.map((loan) => (loan._id === selectedLoan._id ? data.data : loan)),
      );
      trackEvent({
        module: "emi_tracker",
        action: "payload_update",
        label: selectedLoan._id,
      });
    } catch {
      setFetchError("Changes were not saved. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <AdminModuleSkeleton />;

  const hasSelectedView = !!selectedLoan;
  const selectLoan = (id: string) => {
    const loanTitle =
      allLoanCards.find(({ loan }) => loan._id === id)?.loan.payload.title ??
      "loan";
    setPendingNavigationLabel(`Opening ${loanTitle}...`);
    setUrlState({ loan: id, section: "overview" });
  };
  const emptyAction = () => {
    if (loans.length === 0) openCreate();
    else {
      setSearchQuery("");
      setStatusFilter("active");
      setClosedLoansExpanded(false);
    }
  };
  const emptyTitle =
    loans.length === 0
      ? "A clearer path out of debt starts here"
      : statusFilter === "active" &&
          searchQuery.trim().length === 0 &&
          closedLoanCards.length > 0
        ? "No active loans"
        : "No matching loans";
  const emptyBody =
    loans.length === 0
      ? "Add a loan to track balances, payments, interest, and your projected payoff date."
      : statusFilter === "active" &&
          searchQuery.trim().length === 0 &&
          closedLoanCards.length > 0
        ? "Closed loans are kept below for history."
        : "Try another search or show all loans.";
  const emptyActionLabel =
    loans.length === 0 ? "Add your first loan" : "Clear filters";
  const closedLoansSection = showClosedSection ? (
    <section className="space-y-3 pt-1" aria-label="Closed loans">
      <button
        type="button"
        aria-expanded={showClosedLoans}
        aria-controls="closed-loans-panel"
        aria-label={`Closed loans ${closedLoanCards.length}`}
        onClick={() => setClosedLoansExpanded((expanded) => !expanded)}
        className={cn(
          "flex min-h-[56px] w-full items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-900/35 px-4 py-3 text-left hover:border-zinc-700 hover:bg-zinc-900/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
          PRESSABLE,
        )}
      >
        <span className="min-w-0">
          <span className="block text-sm font-black text-zinc-200">
            Closed loans
          </span>
          <span className="mt-0.5 block text-xs text-zinc-500">
            Paid off and kept for history
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-sm font-black text-zinc-400">
          {closedLoanCards.length}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200 ease-out motion-reduce:transition-none",
              showClosedLoans && "rotate-180",
            )}
          />
        </span>
      </button>
      {showClosedLoans && (
        <div id="closed-loans-panel">
          <LoanList
            loanCards={closedLoanCards}
            selectedId={selectedLoan?._id ?? null}
            onSelect={selectLoan}
            decimals={settings.roundingDecimals}
            numberFormat={settings.numberFormat}
            loading={false}
            variant={hasSelectedView ? "navigator" : "portfolio"}
          />
        </div>
      )}
    </section>
  ) : null;

  return (
    <div className="min-h-screen space-y-6">
      {!hasSelectedView && (
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-black tracking-tight text-zinc-50">
              EMI Tracker
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Know what remains. Finish sooner.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className={cn(
              "flex min-h-[44px] shrink-0 items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-black text-zinc-50 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
              PRESSABLE,
            )}
          >
            <Plus className="h-4 w-4" />
            Add loan
          </button>
        </header>
      )}

      {fetchError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-warning/20 bg-warning/10 p-4 text-warning sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-bold">{fetchError}</p>
            <p className="text-sm opacity-80">
              Check your connection and try again.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchLoans({ keepExisting: loans.length > 0 })}
            className={cn(
              "flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-warning/30 px-4 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning",
              PRESSABLE,
            )}
          >
            <RotateCcw className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}

      {pendingNavigationLabel && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-4 py-3 text-sm font-bold text-accent"
        >
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 rounded-full border-2 border-accent/25 border-t-accent motion-safe:animate-spin"
          />
          {pendingNavigationLabel}
        </div>
      )}

      {!selectedLoan ? (
        <main className="min-w-0 space-y-4">
          <PortfolioHero
            model={portfolioModel}
            defaultCurrency={settings.defaultCurrency}
            decimals={settings.roundingDecimals}
            numberFormat={settings.numberFormat}
          />
          <LoanFilters
            query={searchQuery}
            onQueryChange={setSearchQuery}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            counts={filterCounts}
          />
          <LoanList
            loanCards={primaryLoanCards}
            selectedId={null}
            onSelect={selectLoan}
            decimals={settings.roundingDecimals}
            numberFormat={settings.numberFormat}
            loading={false}
            variant="portfolio"
            emptyTitle={emptyTitle}
            emptyBody={emptyBody}
            emptyActionLabel={emptyActionLabel}
            onEmptyAction={emptyAction}
          />
          {closedLoansSection}
        </main>
      ) : (
        <div className="grid gap-6 2xl:grid-cols-[288px_minmax(0,1fr)]">
          <aside className="hidden min-w-0 space-y-4 2xl:sticky 2xl:top-6 2xl:block 2xl:self-start">
            <LoanFilters
              query={searchQuery}
              onQueryChange={setSearchQuery}
              status={statusFilter}
              onStatusChange={setStatusFilter}
              counts={filterCounts}
              density="navigator"
            />
            <LoanList
              loanCards={primaryLoanCards}
              selectedId={selectedLoan._id}
              onSelect={selectLoan}
              decimals={settings.roundingDecimals}
              numberFormat={settings.numberFormat}
              loading={false}
              variant="navigator"
              emptyTitle={emptyTitle}
              emptyBody={emptyBody}
              emptyActionLabel={emptyActionLabel}
              onEmptyAction={emptyAction}
            />
            {closedLoansSection}
          </aside>
          <main className="min-w-0">
            <LoanDetails
              loan={selectedLoan}
              settings={settings}
              isSubmitting={isSaving}
              activeSection={activeSection}
              onSectionChange={(section) => setUrlState({ section }, "replace")}
              onBack={() => setUrlState({ loan: null, section: null })}
              onUpdate={handleUpdateLoanPayload}
              onEdit={() => openEdit(selectedLoan)}
            />
          </main>
        </div>
      )}

      <EmiEntryDialog
        isOpen={isEditorOpen}
        title={editLoan ? "Edit loan" : "Add loan"}
        description="Enter the terms from your lender."
        onClose={() => {
          setIsEditorOpen(false);
          setEditLoan(null);
        }}
      >
        <LoanEditor
          editLoan={editLoan}
          settings={settings}
          isSaving={isSaving}
          formError={formError}
          onClose={() => {
            setIsEditorOpen(false);
            setEditLoan(null);
          }}
          onSubmit={handleSaveLoan}
        />
      </EmiEntryDialog>
    </div>
  );
}
