# Lint Doctor Run Blocked by Existing Navigation Mock Regression

- **Prompt:** `lint_and_purity_doctor_prompt.md`
- **Targeted path:** `src/modules/calculators`
- **Selection:** The targeted directory was clean for lint/type checks.
- **Failure:** `pnpm check` failed during test phase with:
  - `src/test/mocks/navigation.test.ts > exposes push, replace, prefetch, and back as spies`
  - Expected `routerMocks.push.getMockName()` to be `"push"`, received `"vi.fn()"`.
- **Impact:** Verification failed before any local code changes could be applied in the targeted path.
- **Action:** Re-run after the global navigation mock baseline is fixed (an older issue exists with the same failure at `issues_to_look/2026-05-17_theme-strictness-enforcer-verification-failure.md`).
