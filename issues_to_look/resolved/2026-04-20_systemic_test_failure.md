# Systemic Test Failure: jsxDEV is not a function

## Date: 2026-04-20

## Issue

All tests are failing with the following error:
`TypeError: (0 , __vite_ssr_import_0__.jsxDEV) is not a function`

This appears to be a systemic issue with the Vitest/Vite configuration and React 19, specifically how JSX is being transformed in the test environment.

## Impact

- Prevented autonomous improvement run (`lint_and_purity_doctor`).
- Blocks all CI/CD and local verification of changes.

## Proposed Fix

- Investigate `vitest.config.ts` and `@vitejs/plugin-react-swc` compatibility.
- Consider switching to `@vitejs/plugin-react` (non-SWC) for tests.
- Ensure `jsxRuntime` is correctly configured for React 19.

## Why I held back

According to the No-Op Protocol in `prompts/random_selector.md`, I must stop if any check fails. Since the entire test suite is broken on `main`, I cannot verify my changes and therefore cannot safely commit them.
