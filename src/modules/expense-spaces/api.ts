import type {
  ExpenseEntryFilters,
  ExpenseEntryPage,
  ExpenseSpaceAnalyticsResponse,
  ExpenseSpaceCreateInput,
  ExpenseSpaceDetail,
  ExpenseSpaceDocument,
  ExpenseSpaceDocumentPage,
  ExpenseSpaceEntryDocument,
  ExpenseSpaceEntryInput,
  ExpenseSpaceSummary,
  ExpenseSpaceUpdateInput,
} from "./types";

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export class ExpenseSpacesApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ExpenseSpacesApiError";
  }
}

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok || !body.success) {
    throw new ExpenseSpacesApiError(
      body.error ?? "Expense Spaces request failed",
      response.status,
      body.details,
    );
  }
  return body.data as T;
}

const jsonRequest = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const expenseSpacesApi = {
  list(status: "active" | "archived" | "all" = "active") {
    return apiRequest<ExpenseSpaceSummary[]>(
      `/api/expense-spaces?status=${status}`,
    );
  },
  create(input: ExpenseSpaceCreateInput) {
    return apiRequest<ExpenseSpaceDocument>(
      "/api/expense-spaces",
      jsonRequest("POST", input),
    );
  },
  get(spaceId: string) {
    return apiRequest<ExpenseSpaceDetail>(`/api/expense-spaces/${spaceId}`);
  },
  update(spaceId: string, input: ExpenseSpaceUpdateInput) {
    return apiRequest<ExpenseSpaceDetail>(
      `/api/expense-spaces/${spaceId}`,
      jsonRequest("PUT", input),
    );
  },
  delete(spaceId: string, confirmation: string) {
    return apiRequest<{
      spaces_deleted: number;
      entries_deleted: number;
      documents_deleted: number;
    }>(
      `/api/expense-spaces/${spaceId}`,
      jsonRequest("DELETE", { confirmation }),
    );
  },
  listEntries(spaceId: string, filters: ExpenseEntryFilters) {
    const params = new URLSearchParams({
      page: String(filters.page),
      page_size: String(filters.pageSize),
      sort: filters.sort,
    });
    if (filters.search) params.set("search", filters.search);
    if (filters.dateFrom) params.set("date_from", filters.dateFrom);
    if (filters.dateTo) params.set("date_to", filters.dateTo);
    if (filters.categoryId) params.set("category_id", filters.categoryId);
    if (filters.subcategoryId) {
      params.set("subcategory_id", filters.subcategoryId);
    }
    if (filters.paidTo) params.set("paid_to", filters.paidTo);
    if (filters.paymentMethod) {
      params.set("payment_method", filters.paymentMethod);
    }
    return apiRequest<ExpenseEntryPage>(
      `/api/expense-spaces/${spaceId}/entries?${params}`,
    );
  },
  createEntry(spaceId: string, input: ExpenseSpaceEntryInput) {
    return apiRequest<ExpenseSpaceEntryDocument>(
      `/api/expense-spaces/${spaceId}/entries`,
      jsonRequest("POST", input),
    );
  },
  updateEntry(spaceId: string, entryId: string, input: ExpenseSpaceEntryInput) {
    return apiRequest<ExpenseSpaceEntryDocument>(
      `/api/expense-spaces/${spaceId}/entries/${entryId}`,
      jsonRequest("PUT", input),
    );
  },
  deleteEntry(spaceId: string, entryId: string) {
    return apiRequest<{ success: true }>(
      `/api/expense-spaces/${spaceId}/entries/${entryId}`,
      { method: "DELETE" },
    );
  },
  listDocuments(spaceId: string, page = 1, search = "") {
    const params = new URLSearchParams({ page: String(page), page_size: "25" });
    if (search) params.set("search", search);
    return apiRequest<ExpenseSpaceDocumentPage>(
      `/api/expense-spaces/${spaceId}/docs?${params}`,
    );
  },
  uploadDocument(
    spaceId: string,
    input: { filename: string; content_type: string; data: string },
  ) {
    return apiRequest<unknown>(
      `/api/expense-spaces/${spaceId}/docs`,
      jsonRequest("POST", input),
    );
  },
  deleteDocument(spaceId: string, documentId: string) {
    return apiRequest<{ success: true }>(
      `/api/expense-spaces/${spaceId}/docs/${documentId}`,
      { method: "DELETE" },
    );
  },
  analytics(params: {
    scope: "space" | "all";
    spaceId?: string;
    currency?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const query = new URLSearchParams({ scope: params.scope });
    if (params.spaceId) query.set("space_id", params.spaceId);
    if (params.currency) query.set("currency", params.currency);
    if (params.dateFrom) query.set("date_from", params.dateFrom);
    if (params.dateTo) query.set("date_to", params.dateTo);
    return apiRequest<ExpenseSpaceAnalyticsResponse>(
      `/api/expense-spaces/analytics?${query}`,
    );
  },
};
