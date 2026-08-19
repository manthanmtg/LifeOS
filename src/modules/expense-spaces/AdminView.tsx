"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AdminModuleSkeleton } from "@/components/ui/Skeletons";
import { expenseSpacesApi } from "./api";
import { useExpenseSpaces } from "./hooks/useExpenseSpaces";
import type {
  ExpenseSpaceDetail,
  ExpenseSpaceTab,
  ExpenseSpaceUpdateInput,
} from "./types";
import ExpenseSpaceForm from "./components/ExpenseSpaceForm";
import ExpenseSpacesOverview from "./components/ExpenseSpacesOverview";
import ExpenseSpaceWorkspace from "./components/ExpenseSpaceWorkspace";
import ExpenseSpaceAnalytics from "./components/ExpenseSpaceAnalytics";

const VALID_TABS = new Set<ExpenseSpaceTab>([
  "expenses",
  "analytics",
  "settings",
]);

export default function AdminView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("space");
  const view = searchParams.get("view");
  const requestedTab = searchParams.get("tab") as ExpenseSpaceTab | null;
  const tab =
    requestedTab && VALID_TABS.has(requestedTab) ? requestedTab : "expenses";
  const requestedStatus = searchParams.get("status");
  const [status, setStatus] = useState<"active" | "archived" | "all">(
    requestedStatus === "archived" || requestedStatus === "all"
      ? requestedStatus
      : "active",
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<ExpenseSpaceDetail | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const { spaces, loading, error, reload, create, update, remove } =
    useExpenseSpaces("all");

  const loadSelected = useCallback(async () => {
    if (!selectedId) {
      setSelected(null);
      setSelectedError(null);
      return;
    }
    setSelectedLoading(true);
    setSelectedError(null);
    try {
      setSelected(await expenseSpacesApi.get(selectedId));
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Expense space not found";
      setSelectedError(message);
      setSelected(null);
      router.replace("/admin/expense-spaces");
    } finally {
      setSelectedLoading(false);
    }
  }, [router, selectedId]);

  useEffect(() => {
    void loadSelected();
  }, [loadSelected]);

  const selectedSummary = useMemo(
    () => spaces.find((space) => space._id === selectedId),
    [selectedId, spaces],
  );

  const navigateToSpace = (
    spaceId: string,
    nextTab: ExpenseSpaceTab = "expenses",
  ) => {
    router.push(`/admin/expense-spaces?space=${spaceId}&tab=${nextTab}`);
  };

  if (loading || (selectedId && selectedLoading && !selected)) {
    return (
      <div role="status" aria-label="Loading expense spaces" aria-busy="true">
        <AdminModuleSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl animate-fade-in-up pb-12">
      {(error || selectedError) && (
        <div
          role="alert"
          className="mb-5 flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger-muted/20 p-4 text-sm text-danger sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{selectedError ?? error}</span>
          {error && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void reload()}
              className="h-11"
            >
              Try again
            </Button>
          )}
        </div>
      )}

      {selected ? (
        <ExpenseSpaceWorkspace
          space={selected}
          summary={selectedSummary}
          spaces={spaces}
          tab={tab}
          onBack={() => router.push("/admin/expense-spaces")}
          onTabChange={(nextTab) => navigateToSpace(selected._id, nextTab)}
          onSpaceUpdated={(updated) => {
            setSelected((current) =>
              current
                ? {
                    ...current,
                    ...updated,
                    entry_count: current.entry_count,
                    used_category_ids: current.used_category_ids,
                    used_subcategory_ids: current.used_subcategory_ids,
                  }
                : current,
            );
          }}
          onUpdate={async (input: ExpenseSpaceUpdateInput) => {
            const updated = await update(selected._id, input);
            setSelected((current) =>
              current
                ? {
                    ...updated,
                    used_category_ids: current.used_category_ids,
                    used_subcategory_ids: current.used_subcategory_ids,
                  }
                : updated,
            );
            return updated;
          }}
          onDelete={async (confirmation) => {
            await remove(selected._id, confirmation);
            setSelected(null);
            router.push("/admin/expense-spaces");
          }}
          onReload={async () => {
            await Promise.all([loadSelected(), reload()]);
          }}
        />
      ) : view === "analytics" ? (
        <div className="space-y-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/admin/expense-spaces")}
            className="h-11 px-2"
          >
            <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" /> Back to
            expense spaces
          </Button>
          <header className="rounded-3xl border border-zinc-800 bg-zinc-900/55 p-5 sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
                <BarChart3 aria-hidden="true" className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                  Currency-scoped reporting
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-50">
                  All-spaces analytics
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                  Compare independent ledgers without converting or combining
                  incompatible currencies.
                </p>
              </div>
            </div>
          </header>
          <ExpenseSpaceAnalytics
            scope="all"
            spaces={spaces}
            onOpenSpace={(spaceId) => {
              const params = new URLSearchParams();
              params.set("space", spaceId);
              params.set("tab", "analytics");
              for (const key of ["preset", "date_from", "date_to"] as const) {
                const value = searchParams.get(key);
                if (value) params.set(key, value);
              }
              router.push(`/admin/expense-spaces?${params}`);
            }}
          />
        </div>
      ) : (
        <ExpenseSpacesOverview
          spaces={spaces}
          status={status}
          onStatusChange={(nextStatus) => {
            setStatus(nextStatus);
            const params = new URLSearchParams();
            if (nextStatus !== "active") params.set("status", nextStatus);
            router.replace(
              params.size > 0
                ? `/admin/expense-spaces?${params}`
                : "/admin/expense-spaces",
            );
          }}
          onOpen={navigateToSpace}
          onCreate={() => setCreateOpen(true)}
          onOpenAnalytics={() =>
            router.push("/admin/expense-spaces?view=analytics")
          }
        />
      )}

      <ExpenseSpaceForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={async (input) => {
          const created = await create(input);
          setCreateOpen(false);
          navigateToSpace(created._id);
          return created;
        }}
      />
    </div>
  );
}
