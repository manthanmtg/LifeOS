# Expense Space PDF Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a polished, multi-page PDF for a selected Expense Space, with its full itemized ledger first and complete spending analysis afterward.

**Architecture:** A Node-runtime admin route loads the selected parent and every matching entry, maps them into a narrow server-only report model, and returns jsPDF/AutoTable bytes. A client dialog fetches that PDF as a Blob and owns Download/Share state; the existing ledger owns the toolbar trigger.

**Tech Stack:** Next.js 16 route handlers, React 19, TypeScript, MongoDB Node driver v7, jsPDF 4, jsPDF-AutoTable 5, Vitest 4, Testing Library, shared Dialog, Lucide React, Tailwind CSS v4.

**Spec:** `docs/superpowers/specs/2026-10-02-expense-space-pdf-report-design.md`

## Global Constraints

- Export all entries in only the selected Expense Space, ignoring tabs, filters, visible pages, and pagination.
- Use the existing Expense Spaces admin guard; never persist a report or mutate MongoDB.
- Render A4 portrait with the complete ledger before category/subcategory and other analysis.
- Reuse jsPDF and jsPDF-AutoTable; add no PDF dependency without a demonstrated type/runtime gap.
- Preserve all existing expense CRUD, filter, analytics, Docs, and archived-space behavior.
- Use TDD: observe a failing test before every production implementation step.
- UI uses semantic color tokens/zinc neutrals, 44px targets, keyboard-accessible Dialog behavior, and no hardcoded colors.

## Review Focus

- More entries than the UI page size: every selected-space entry appears exactly once (Task 3).
- Missing historic category/subcategory: the PDF uses explicit fallback names (Task 1).
- Empty ledger: a readable summary/empty-ledger PDF still downloads (Task 2).
- Failed request: dialog stays open, announces the failure, and retries (Task 4).
- Repeat generation/dismissal: stale Blob URLs are revoked (Task 4).

---

## File Structure

- `src/lib/expense-spaces/report.ts` - Server-only normalized data model, full-ledger aggregation, taxonomy fallback, formatting, and filename.
- `src/lib/expense-spaces/report-pdf.ts` - Server-only jsPDF/AutoTable A4 renderer.
- `src/lib/expense-spaces/__tests__/report.test.ts` - Report-model tests.
- `src/lib/expense-spaces/__tests__/report-pdf.test.ts` - Renderer tests.
- `src/app/api/expense-spaces/[spaceId]/report/route.ts` - Protected full-space PDF endpoint.
- `src/app/api/expense-spaces/[spaceId]/report/__tests__/route.test.ts` - Route tests.
- `src/modules/expense-spaces/api.ts` - Blob fetch client API.
- `src/modules/expense-spaces/components/ExpenseSpaceReportDialog.tsx` - Modal state and download/share lifecycle.
- `src/modules/expense-spaces/components/__tests__/ExpenseSpaceReportDialog.test.tsx` - Modal tests.
- `src/modules/expense-spaces/components/ExpenseEntryList.tsx` - Toolbar trigger and dialog composition.
- `src/modules/expense-spaces/components/__tests__/ExpenseEntryList.test.tsx` - Ledger toolbar integration test.

### Task 1: Build the full-ledger report model

**Files:**

- Create: `src/lib/expense-spaces/report.ts`
- Create: `src/lib/expense-spaces/__tests__/report.test.ts`

**Interfaces:**

- Consumes: `ExpenseSpacePayload`, `ExpenseSpaceEntryPayload`, and `ExpenseSpaceNumberFormat` from `src/modules/expense-spaces/types.ts`.
- Produces: `buildExpenseSpaceReport(input: ExpenseSpaceReportInput): ExpenseSpaceReport` and `createExpenseSpaceReportFilename(spaceName: string, generatedAt: Date): string`.
- Used by: Tasks 2 and 3.

- [ ] **Step 1: Write the failing model tests**

```ts
it("sorts the full ledger newest-first and includes entries beyond a UI page", () => {
  const report = buildExpenseSpaceReport({
    space,
    entries: entries31,
    generatedAt,
  });
  expect(report.ledger).toHaveLength(31);
  expect(report.ledger[0].description).toBe("Newest expense");
});

it("uses taxonomy fallbacks and calculates category totals", () => {
  const report = buildExpenseSpaceReport({
    space,
    entries: [orphanedEntry],
    generatedAt,
  });
  expect(report.ledger[0].category).toBe("Unknown category");
  expect(report.categoryBreakdown[0]).toMatchObject({
    name: "Unknown category",
    count: 1,
  });
});
```

- [ ] **Step 2: Run the failing model test**

Run: `pnpm vitest run src/lib/expense-spaces/__tests__/report.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the report model**

Add `import "server-only"`. Define narrow header, metric, ledger-row, and sorted-breakdown interfaces. The builder takes the parent payload/id, all matching entries, and one generation timestamp. It sorts date descending then id descending; resolves category/subcategory names with `Unknown category` / `Unknown subcategory`; computes total/count/average/budget usage; and derives category, subcategory, payee, payment-method, and month tables from the same complete list. Centralize Indian/Western money formatting and create `expense-space-<slug>-<YYYY-MM-DD>.pdf` safely.

- [ ] **Step 4: Run model tests green**

Run: `pnpm vitest run src/lib/expense-spaces/__tests__/report.test.ts`

Expected: PASS, including empty ledger, missing taxonomy, both number formats, and filename.

- [ ] **Step 5: Commit**

```bash
git add src/lib/expense-spaces/report.ts src/lib/expense-spaces/__tests__/report.test.ts
git commit -m "feat: add expense space report model"
```

### Task 2: Render the A4 PDF

**Files:**

- Create: `src/lib/expense-spaces/report-pdf.ts`
- Create: `src/lib/expense-spaces/__tests__/report-pdf.test.ts`

**Interfaces:**

- Consumes: `ExpenseSpaceReport` from Task 1.
- Produces: `renderExpenseSpaceReportPdf(report: ExpenseSpaceReport): Uint8Array`.
- Used by: Task 3.

- [ ] **Step 1: Write failing renderer tests**

```ts
it("returns a valid PDF with the ledger before category analysis", () => {
  const bytes = renderExpenseSpaceReportPdf(multiPageReport);
  expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe("%PDF");
  const text = extractPdfText(bytes);
  expect(text.indexOf("Expense ledger")).toBeLessThan(
    text.indexOf("Category breakdown"),
  );
});

it("renders a usable empty-ledger report", () => {
  expect(() => renderExpenseSpaceReportPdf(emptyReport)).not.toThrow();
});
```

- [ ] **Step 2: Run the failing renderer test**

Run: `pnpm vitest run src/lib/expense-spaces/__tests__/report-pdf.test.ts`

Expected: FAIL because the renderer does not exist.

- [ ] **Step 3: Implement the renderer**

Use `import "server-only"`, `jsPDF`, and `jspdf-autotable`. Render A4 portrait with a restrained accent rule; space title, generated timestamp/date range, and four metrics; then an auto-table ledger first. Set repeating headers, wrapping for text cells, right-aligned amount cells, and a final footer pass with generated date plus `Page n of n`. Add category/subcategory, top payee, payment method, and monthly tables only after the ledger. Render the specified empty-ledger copy.

- [ ] **Step 4: Run renderer tests green**

Run: `pnpm vitest run src/lib/expense-spaces/__tests__/report-pdf.test.ts`

Expected: PASS with valid bytes and section-order assertions.

- [ ] **Step 5: Commit**

```bash
git add src/lib/expense-spaces/report-pdf.ts src/lib/expense-spaces/__tests__/report-pdf.test.ts
git commit -m "feat: render expense space reports as pdf"
```

### Task 3: Add the protected full-space export route

**Files:**

- Create: `src/app/api/expense-spaces/[spaceId]/report/route.ts`
- Create: `src/app/api/expense-spaces/[spaceId]/report/__tests__/route.test.ts`

**Interfaces:**

- Consumes: `requireExpenseSpacesAdmin`, `logExpenseSpacesRouteError`, `getDb`, and Task 1/2 interfaces.
- Produces: `GET(request: Request, { params: Promise<{ spaceId: string }> }): Promise<Response>`.
- Used by: Task 4 at `/api/expense-spaces/:spaceId/report`.

- [ ] **Step 1: Write failing route tests**

```ts
it("rejects an unauthenticated report request before querying Mongo", async () => {
  expect((await GET(request, params)).status).toBe(401);
  expect(getDb).not.toHaveBeenCalled();
});

it("returns a PDF using every entry in only the selected space", async () => {
  const response = await GET(request, params);
  expect(response.headers.get("content-type")).toContain("application/pdf");
  expect(buildExpenseSpaceReport).toHaveBeenCalledWith(
    expect.objectContaining({ entries: selectedSpaceEntries }),
  );
});
```

- [ ] **Step 2: Run the failing route test**

Run: `pnpm vitest run src/app/api/expense-spaces/[spaceId]/report/__tests__/route.test.ts`

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement the Node route**

Set `export const runtime = "nodejs"`. Follow the entries route for ObjectId validation, admin guard, typed collection, parent lookup, error handling, and logging. Query every `expense_space_entry` matching the selected parent `space_key`, sorting newest-first with stable `_id` order and no `skip`/ `limit`. Build/render once and return PDF bytes with `Content-Type`, `Content-Length`, no-cache headers, and an attachment disposition filename. Return standard 401/400/404/500 responses and perform no database writes.

- [ ] **Step 4: Run route tests green**

Run: `pnpm vitest run src/app/api/expense-spaces/[spaceId]/report/__tests__/route.test.ts`

Expected: PASS, including cross-space exclusion and pagination-scale regression.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/expense-spaces/[spaceId]/report/route.ts src/app/api/expense-spaces/[spaceId]/report/__tests__/route.test.ts
git commit -m "feat: export expense space reports"
```

### Task 4: Add Blob API and accessible report dialog

**Files:**

- Modify: `src/modules/expense-spaces/api.ts`
- Create: `src/modules/expense-spaces/components/ExpenseSpaceReportDialog.tsx`
- Create: `src/modules/expense-spaces/components/__tests__/ExpenseSpaceReportDialog.test.tsx`

**Interfaces:**

- Consumes: Task 3 endpoint, shared `Dialog`, `Button`, and `ExpenseSpaceDocument`.
- Produces: `expenseSpacesApi.downloadReport(spaceId: string): Promise<{ blob: Blob; filename: string }>` and `ExpenseSpaceReportDialog({ open, space, onClose }: Props)`.
- Used by: Task 5.

- [ ] **Step 1: Write failing dialog/API tests**

```tsx
it("shows generation progress and enables download after success", async () => {
  render(<ExpenseSpaceReportDialog open space={space} onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /create pdf/i }));
  expect(screen.getByRole("button", { name: /creating pdf/i })).toBeDisabled();
  expect(
    await screen.findByRole("link", { name: /download pdf/i }),
  ).toBeInTheDocument();
});

it("keeps the modal open and supports retry after failure", async () => {
  mockDownloadReport.mockRejectedValueOnce(
    new Error("Unable to create report"),
  );
  render(<ExpenseSpaceReportDialog open space={space} onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /create pdf/i }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to create report",
  );
  expect(
    screen.getByRole("button", { name: /try again/i }),
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the failing dialog test**

Run: `pnpm vitest run src/modules/expense-spaces/components/__tests__/ExpenseSpaceReportDialog.test.tsx`

Expected: FAIL because the method and dialog do not exist.

- [ ] **Step 3: Implement the client API and dialog**

Add a Blob fetch path that parses standard JSON API errors and derives the attachment filename safely. The dialog uses shared Dialog IDs and focuses Create PDF. Model `idle | generating | ready | error`, disable duplicate creation, and keep errors retryable. Create/revoke object URLs on replacement, close, and unmount. Expose a download anchor. Construct a `File` for Share only when `navigator.share` and `navigator.canShare({ files })` both support it; otherwise use disabled copy directing users to Download. Use existing Button variants and Lucide Download/Share2/FileText icons.

- [ ] **Step 4: Run dialog tests green**

Run: `pnpm vitest run src/modules/expense-spaces/components/__tests__/ExpenseSpaceReportDialog.test.tsx`

Expected: PASS, including focus restoration, unsupported sharing, failed/retried generation, and object-URL cleanup.

- [ ] **Step 5: Commit**

```bash
git add src/modules/expense-spaces/api.ts src/modules/expense-spaces/components/ExpenseSpaceReportDialog.tsx src/modules/expense-spaces/components/__tests__/ExpenseSpaceReportDialog.test.tsx
git commit -m "feat: add expense report download dialog"
```

### Task 5: Place Download beside Add Expense

**Files:**

- Modify: `src/modules/expense-spaces/components/ExpenseEntryList.tsx`
- Create or Modify: `src/modules/expense-spaces/components/__tests__/ExpenseEntryList.test.tsx`

**Interfaces:**

- Consumes: `ExpenseSpaceReportDialog` from Task 4.
- Produces: a keyboard-accessible `Download report` action in the ledger toolbar.

- [ ] **Step 1: Write the failing toolbar test**

```tsx
it("opens the report dialog from Download report beside Add Expense", () => {
  render(<ExpenseEntryList {...props} />);
  fireEvent.click(screen.getByRole("button", { name: /download report/i }));
  expect(
    screen.getByRole("dialog", { name: /create expense report/i }),
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the failing toolbar test**

Run: `pnpm vitest run src/modules/expense-spaces/components/__tests__/ExpenseEntryList.test.tsx`

Expected: FAIL because the report action is absent.

- [ ] **Step 3: Integrate the action and dialog**

Add local dialog-open state. Replace the single action with a responsive action group: Download report immediately beside Add Expense on desktop and stacked without overflow on narrow screens. Download remains enabled for archived spaces because it is read-only; Add Expense keeps its current archived disablement. Render the dialog at component root.

- [ ] **Step 4: Run toolbar tests green**

Run: `pnpm vitest run src/modules/expense-spaces/components/__tests__/ExpenseEntryList.test.tsx`

Expected: PASS with both toolbar actions reachable and Add Expense unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/modules/expense-spaces/components/ExpenseEntryList.tsx src/modules/expense-spaces/components/__tests__/ExpenseEntryList.test.tsx
git commit -m "feat: add expense report download action"
```

### Task 6: Verify the PDF and complete UI

**Files:**

- Create temporarily: `tmp/pdfs/expense-space-report-fixture.pdf` and rendered PNGs.
- Delete: all Task 6 generated artifacts after inspection.

**Interfaces:**

- Consumes: final route, renderer, dialog, and toolbar from Tasks 1-5.
- Produces: verification evidence only, not a committed runtime artifact.

- [ ] **Step 1: Create a representative multi-page fixture**

Use long descriptions, enough entries to span multiple ledger pages, missing taxonomy, several categories/subcategories, and an empty-ledger variant. Invoke the production Task 2 renderer.

- [ ] **Step 2: Mark the PDF artifact operation before fixture generation**

Run: `node container_tools/mark_artifact_operation_started.mjs --operation-kind create --expected-output-count 1 --output-format pdf`

Expected: success before creating the PDF fixture.

- [ ] **Step 3: Render and inspect every PDF page**

Run: `pdftoppm -png tmp/pdfs/expense-space-report-fixture.pdf tmp/pdfs/expense-space-report-fixture`

Expected: ledger before analysis, no clipped rows, aligned amounts, repeating headers, and non-overlapping footer on all pages.

- [ ] **Step 4: Run browser UI QA**

Start `pnpm dev`. Open an existing space, test Create PDF, Download, Share supported/unsupported state, Escape/focus behavior, and toolbar layout at desktop plus roughly 375px width. Stop the server afterward. Do not create database fixtures in a user data environment.

- [ ] **Step 5: Run final validation**

Run: `pnpm lint && pnpm typecheck && pnpm vitest run src/lib/expense-spaces/__tests__/report.test.ts src/lib/expense-spaces/__tests__/report-pdf.test.ts src/app/api/expense-spaces/[spaceId]/report/__tests__/route.test.ts src/modules/expense-spaces/components/__tests__/ExpenseSpaceReportDialog.test.tsx src/modules/expense-spaces/components/__tests__/ExpenseEntryList.test.tsx`

Expected: PASS. Then run `pnpm check`; record unrelated existing failures separately rather than modifying unrelated files.

- [ ] **Step 6: Clean generated artifacts and commit documentation when needed**

Remove only generated files beneath `tmp/pdfs/`. Do not commit PDFs or PNGs. Update `src/modules/expense-spaces/README.md` only if user-facing behavior is not already covered; commit it with the associated code.

## Self-Review

- Spec coverage: Tasks 1-3 implement complete secure selection and PDF output; Tasks 4-5 implement modal/download/share UX; Task 6 covers PDF rendering, responsive UI, and verification.
- Step scan: every task has an explicit red test, minimal implementation decision, green command, and scoped commit.
- Type consistency: Task 1 owns `ExpenseSpaceReport`; Task 2 renders it; Task 3 serves bytes; Task 4 exposes `{ blob, filename }`; Task 5 composes the dialog.
- Review focus: each of the five failure modes is assigned to a concrete task/test.
- Proportion: the plan chooses interfaces and behavior without transcribing implementation bodies.
