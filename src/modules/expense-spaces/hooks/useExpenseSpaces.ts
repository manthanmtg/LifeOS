"use client";

import { useCallback, useEffect, useState } from "react";
import { expenseSpacesApi } from "../api";
import type {
  ExpenseSpaceCreateInput,
  ExpenseSpaceDocument,
  ExpenseSpaceSummary,
  ExpenseSpaceUpdateInput,
} from "../types";

export function useExpenseSpaces(
  status: "active" | "archived" | "all" = "all",
) {
  const [spaces, setSpaces] = useState<ExpenseSpaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSpaces(await expenseSpacesApi.list(status));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load spaces",
      );
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async (input: ExpenseSpaceCreateInput) => {
      const created = await expenseSpacesApi.create(input);
      await reload();
      return created;
    },
    [reload],
  );

  const update = useCallback(
    async (spaceId: string, input: ExpenseSpaceUpdateInput) => {
      const updated = await expenseSpacesApi.update(spaceId, input);
      await reload();
      return updated;
    },
    [reload],
  );

  const remove = useCallback(
    async (spaceId: string, confirmation: string) => {
      await expenseSpacesApi.delete(spaceId, confirmation);
      await reload();
    },
    [reload],
  );

  const addOptimisticSummary = useCallback((space: ExpenseSpaceDocument) => {
    setSpaces((current) => [
      {
        ...space,
        summary: {
          entry_count: 0,
          total_spend: 0,
          this_month_spend: 0,
          last_entry_date: null,
        },
      },
      ...current,
    ]);
  }, []);

  return {
    spaces,
    loading,
    error,
    reload,
    create,
    update,
    remove,
    addOptimisticSummary,
  };
}
