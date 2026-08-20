# Expense Space Tab Loading States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Analytics and Settings tab changes an immediate, accessible, layout-matched loading state.

**Architecture:** `ExpenseSpaceWorkspace` will track a tab-navigation handoff and render a tab-specific skeleton until URL state confirms the requested tab. `ExpenseSpaceAnalytics` will replace its generic rectangles with metric and chart silhouettes that mirror the finished analytics view, while retaining its existing API-loading semantics.

**Tech Stack:** React 19, Next.js App Router, TypeScript, Tailwind CSS, Vitest, Testing Library.

---

### Task 1: Define expected tab feedback

**Files:**

- Modify: `src/modules/expense-spaces/__tests__/AdminView.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
fireEvent.click(await screen.findByRole("tab", { name: "Settings" }));
expect(
  screen.getByRole("status", { name: /loading settings/i }),
).toHaveAttribute("aria-busy", "true");
```

- [ ] **Step 2: Run the targeted test and verify it fails**

Run: `pnpm test src/modules/expense-spaces/__tests__/AdminView.test.tsx`

Expected: FAIL because the tab panel has no tab-transition status region.

### Task 2: Add layout-matched tab handoff skeletons

**Files:**

- Create: `src/modules/expense-spaces/components/ExpenseSpaceTabLoadingSkeleton.tsx`
- Modify: `src/modules/expense-spaces/components/ExpenseSpaceWorkspace.tsx`

- [ ] **Step 1: Implement the minimal skeleton component**

```tsx
export default function ExpenseSpaceTabLoadingSkeleton({
  tab,
}: {
  tab: "analytics" | "settings";
}) {
  return (
    <div role="status" aria-label={`Loading ${tab}`} aria-busy="true">
      ...
    </div>
  );
}
```

- [ ] **Step 2: Track the tab selected by the user**

```tsx
const [pendingTab, setPendingTab] = useState<ExpenseSpaceTab | null>(null);
useEffect(
  () => setPendingTab((current) => (current === tab ? null : current)),
  [tab],
);
```

- [ ] **Step 3: Render the matching skeleton while navigation is pending**

```tsx
onClick={() => {
  setPendingTab(item.id);
  onTabChange(item.id);
}}
```

- [ ] **Step 4: Run the targeted test and verify it passes**

Run: `pnpm test src/modules/expense-spaces/__tests__/AdminView.test.tsx`

Expected: PASS.

### Task 3: Replace generic analytics loading blocks

**Files:**

- Modify: `src/modules/expense-spaces/components/ExpenseSpaceAnalytics.tsx`
- Test: `src/modules/expense-spaces/__tests__/AdminView.test.tsx`

- [ ] **Step 1: Render cards and chart-shaped placeholders in the existing analytics loading branch**

```tsx
<section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
  <SkeletonBlock className="h-4 w-28" />
  <SkeletonBlock className="mt-5 h-52 rounded-xl" />
</section>
```

- [ ] **Step 2: Run targeted tests, lint, typecheck, build, and the full test suite**

Run: `pnpm test src/modules/expense-spaces/__tests__/AdminView.test.tsx && pnpm lint && pnpm typecheck && pnpm build && pnpm test`

Expected: exit code 0 from every command.
