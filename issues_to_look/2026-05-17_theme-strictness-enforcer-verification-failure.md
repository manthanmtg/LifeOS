---
title: "Theme strictness enforcer run blocked by pre-existing test regression"
run: "prompts/theme_strictness_enforcer.md"
status: "open"
severity: "medium"
---

## Problem

`pnpm check` fails in the verification step with:

- `src/test/mocks/navigation.test.ts > exposes push, replace, prefetch, and back as spies`
- Assertion: `routerMocks.push.getMockName()` expected `"push"`, received `"vi.fn()"`

## Impact

This failure appears unrelated to `src/app/admin/settings/page.tsx` color-token changes in this run and blocked the `random_selector` terminal outcome.

## Suggested fix

Update the navigation mock in `src/test/mocks/navigation.test.ts` or the corresponding mock setup to set mock names for exported spies (for example, `mockResolvedValue` helper preserving `mockName`), then re-run the test.
