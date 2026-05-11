# Expenses admin view heading regression test failure

## Issue
`pnpm check` fails with:

- `src/modules/expenses/__tests__/AdminView.test.tsx > ExpenseAdminView > renders the Expense Tracker view`

The failure is an existing regression unrelated to this run’s accessibility change in rain-tracker:
- expected heading `Expense Intelligence` was not found in DOM.

## Suggested action
Investigate the expenses module admin heading rendering contract and update the view or test expectations so the heading is present for assistive/semantic queries.

## Context
This occurred during an accessibility-driven prompt run and should be addressed before broad merge confidence can rely on passing `pnpm check`.
