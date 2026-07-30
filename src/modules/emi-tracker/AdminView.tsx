"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator, Plus, RotateCcw, Search } from "lucide-react";
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

  const portfolioModel = useMemo(
    () => buildPortfolioViewModel(loans, now, settings.roundingDecimals),
    [loans, now, settings.roundingDecimals],
  );

  const filteredLoans = useMemo(
    () => filteredByStatus(loans, statusFilter),
    [loans, statusFilter],
  );

  const loanCards = useMemo(
    () =>
      getLoanCards(filteredLoans, now, searchQuery, settings.roundingDecimals),
    [filteredLoans, now, searchQuery, settings.roundingDecimals],
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
  const showPortfolioOnSmall = !hasSelectedView;

  return (
    <div className="min-h-screen space-y-6">
      <header
        className={cn(
          "flex items-start justify-between gap-4",
          hasSelectedView ? "hidden xl:flex" : "flex",
        )}
      >
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
          className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-2xl bg-accent px-4 py-2 text-sm font-black text-zinc-50 transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
        >
          <Plus className="h-4 w-4" />
          Add loan
        </button>
      </header>

      {fetchError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-warning/20 bg-warning/10 p-4 text-warning sm:flex-row sm:items-center sm:justify-between"
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
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-warning/30 px-4 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning"
          >
            <RotateCcw className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1040px)]">
        <aside
          className={cn(
            "min-w-0 space-y-5 xl:sticky xl:top-6 xl:self-start",
            showPortfolioOnSmall ? "block" : "hidden xl:block",
          )}
        >
          <PortfolioHero
            model={portfolioModel}
            defaultCurrency={settings.defaultCurrency}
            decimals={settings.roundingDecimals}
            numberFormat={settings.numberFormat}
          />

          <div className="space-y-4 rounded-3xl border border-zinc-800 bg-zinc-900/55 p-4">
            <div>
              <label htmlFor="loan-search" className="sr-only">
                Search by loan or lender
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="loan-search"
                  placeholder="Search by loan or lender"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="min-h-[44px] w-full rounded-2xl border border-zinc-800 bg-zinc-950/45 py-3 pl-11 pr-4 text-base text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-accent/60 focus:ring-2 focus:ring-accent/20 md:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["active", `Active ${portfolioModel.activeCount}`],
                  ["closed", `Closed ${portfolioModel.closedCount}`],
                  ["all", `All ${portfolioModel.allCount}`],
                ] as Array<[PortfolioStatusFilter, string]>
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatusFilter(id)}
                  className={cn(
                    "min-h-[44px] rounded-2xl border px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                    statusFilter === id
                      ? "border-accent/30 bg-accent/10 text-accent"
                      : "border-zinc-800 bg-zinc-950/35 text-zinc-400 hover:text-zinc-100",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <LoanList
            loanCards={loanCards}
            selectedId={selectedLoan?._id ?? null}
            onSelect={(id) => setUrlState({ loan: id, section: "overview" })}
            decimals={settings.roundingDecimals}
            numberFormat={settings.numberFormat}
            loading={false}
            emptyTitle={
              loans.length === 0
                ? "A clearer path out of debt starts here"
                : "No matching loans"
            }
            emptyBody={
              loans.length === 0
                ? "Add a loan to track balances, payments, interest, and your projected payoff date."
                : "Try another search or show all loans."
            }
            emptyActionLabel={
              loans.length === 0 ? "Add your first loan" : "Clear filters"
            }
            onEmptyAction={() => {
              if (loans.length === 0) openCreate();
              else {
                setSearchQuery("");
                setStatusFilter("all");
              }
            }}
          />
        </aside>

        <main className="min-w-0">
          {selectedLoan ? (
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
          ) : (
            <div className="hidden min-h-[560px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/35 p-10 text-center xl:flex">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-950/50">
                <Calculator className="h-7 w-7 text-accent" />
              </div>
              <h2 className="text-xl font-black text-zinc-100">
                Select a loan to open the payoff workspace
              </h2>
              <p className="mt-2 max-w-sm text-sm text-zinc-500">
                The runway, simulator, schedule, activity, and documents appear
                here.
              </p>
            </div>
          )}
        </main>
      </div>

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
