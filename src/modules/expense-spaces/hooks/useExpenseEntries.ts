"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { expenseSpacesApi } from "../api";
import type {
  ExpenseEntryFilters,
  ExpenseEntryPage,
  ExpenseSpaceEntryInput,
} from "../types";

const EMPTY_PAGE: ExpenseEntryPage = {
  entries: [],
  page: 1,
  pageSize: 50,
  total: 0,
  totalPages: 0,
  facets: { paid_to: [], descriptions: [], tags: [], payment_methods: [] },
};

export function useExpenseEntries(
  spaceId: string,
  filters: ExpenseEntryFilters,
) {
  const [data, setData] = useState<ExpenseEntryPage>(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await expenseSpacesApi.listEntries(spaceId, filters));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load expenses",
      );
    } finally {
      setLoading(false);
    }
  }, [spaceId, filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async (input: ExpenseSpaceEntryInput) => {
      const result = await expenseSpacesApi.createEntry(spaceId, input);
      await reload();
      return result;
    },
    [spaceId, reload],
  );

  const update = useCallback(
    async (entryId: string, input: ExpenseSpaceEntryInput) => {
      const result = await expenseSpacesApi.updateEntry(
        spaceId,
        entryId,
        input,
      );
      await reload();
      return result;
    },
    [spaceId, reload],
  );

  const remove = useCallback(
    async (entryId: string) => {
      await expenseSpacesApi.deleteEntry(spaceId, entryId);
      await reload();
    },
    [spaceId, reload],
  );

  return { data, loading, error, reload, create, update, remove };
}
